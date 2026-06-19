#!/usr/bin/env node
// Claude variant of the behavior benchmark. Same cases, prompts, and scoring as
// run-behavior-benchmark.js, but the agent is the Claude CLI and the rule is
// injected the way the Claude SessionStart hook injects it (getBuyVsBuildInstructions),
// via --append-system-prompt. Baseline runs without it.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const casesPath = path.join(root, 'benchmarks', 'behavior-cases.json');
const outputDir = path.join(root, 'benchmarks', 'results');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8')).cases;
const { getBuyVsBuildInstructions } = require('../hooks/buy-vs-build-instructions');
const { judgeResponse } = require('./judge');

const dryRun = process.argv.includes('--dry-run');
const useJudge = process.argv.includes('--judge');
// Default to a small, cheap model; the rule's lift is clearest on a smaller model
// and benchmark runs stay inexpensive. Override with --model.
const model = getArgValue('--model') || 'haiku';
const limit = Number(getArgValue('--limit') || cases.length);
const selectedIds = getArgValues('--case');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runCases = cases.filter(item => selectedIds.length === 0 || selectedIds.includes(item.id)).slice(0, limit);

if (runCases.length === 0) {
  throw new Error('No benchmark cases selected.');
}

fs.mkdirSync(outputDir, { recursive: true });

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'buy-vs-build-claude-bench-'));
fs.writeFileSync(path.join(tempRoot, 'README.md'), '# Empty benchmark workspace\n', 'utf8');

const instructions = getBuyVsBuildInstructions();

const result = {
  runId,
  createdAt: new Date().toISOString(),
  command: process.argv.slice(2),
  agent: 'claude',
  injection: 'append-system-prompt (getBuyVsBuildInstructions)',
  scoring: useJudge && !dryRun ? 'llm-judge (claude rubric)' : 'heuristic',
  environment: {
    claude: capture('claude', ['--version']),
    model: model || '(cli default)',
    node: process.version,
    platform: `${process.platform} ${process.arch}`
  },
  cases: [],
  summary: null
};

for (const item of runCases) {
  const baseline = scoreOne(item, runClaude(item, false));
  const enabled = scoreOne(item, runClaude(item, true));
  result.cases.push({ id: item.id, expectedRung: item.expectedRung, baseline, enabled });
  console.error(`${item.id}: baseline ${baseline.score}/5 -> enabled ${enabled.score}/5`);
}

result.summary = summarize(result.cases);
const jsonPath = path.join(outputDir, `behavior-claude-${runId}.json`);
const mdPath = path.join(outputDir, `behavior-claude-${runId}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(mdPath, renderMarkdown(result));

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
console.log(renderSummary(result.summary));

function runClaude(item, enabled) {
  if (dryRun) return sampleResponse(item, enabled);
  const prompt = [
    'You are evaluating an implementation request. Do not edit files. Do not run commands.',
    'Return a concise implementation recommendation with tradeoffs.',
    '',
    `Request: ${item.prompt}`
  ].join('\n');

  const args = ['-p', '--output-format', 'json'];
  if (model) args.push('--model', model);
  if (enabled) args.push('--append-system-prompt', instructions);
  // Variadic flag must come last so it does not swallow other args; prompt is passed via stdin.
  args.push('--disallowed-tools', 'Bash', 'Edit', 'Write', 'NotebookEdit', 'WebSearch', 'WebFetch');

  const started = Date.now();
  const completed = spawnSync('claude', args, {
    cwd: tempRoot,
    input: prompt,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: 240000
  });

  if (completed.status !== 0) {
    throw new Error([
      `claude failed after ${Date.now() - started}ms (enabled=${enabled}, case=${item.id})`,
      completed.stdout,
      completed.stderr
    ].filter(Boolean).join('\n'));
  }

  return extractText(completed.stdout);
}

function extractText(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    if (typeof parsed.result === 'string') return parsed.result;
    if (Array.isArray(parsed) && parsed.length) {
      const last = parsed[parsed.length - 1];
      if (last && typeof last.result === 'string') return last.result;
    }
    return stdout;
  } catch (_error) {
    return stdout;
  }
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function getArgValues(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name) {
      values.push(process.argv[index + 1]);
    }
  }
  return values.filter(Boolean);
}

function capture(command, args) {
  const completed = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  return [completed.stdout, completed.stderr].filter(Boolean).join('\n').trim();
}

// --- Scoring ---

// Heuristic by default; --judge swaps in the rubric-based LLM judge (scripts/judge.js).
function scoreOne(item, response) {
  return useJudge && !dryRun ? judgeResponse(item, response) : scoreResponse(item, response);
}

// scoreResponse is duplicated verbatim from run-behavior-benchmark.js to keep parity.
function scoreResponse(item, response) {
  const text = response.toLowerCase();
  const expectedTerms = rungTerms(item.expectedRung);
  const choiceTerms = Array.isArray(item.expectedChoice) ? item.expectedChoice.map(term => term.toLowerCase()) : null;
  const rejectedRiskTerms = riskTerms(item.baselineRisk);
  const decisionTerms = ['decision', 'tradeoff', 'rejected', 'revisit', 'because'];

  // Fit cases name a specific right option; score whether it is recommended
  // instead of matching a rung keyword. Otherwise fall back to rung matching.
  const rightChoiceHit = choiceTerms ? choiceTerms.some(term => text.includes(term)) : null;
  const wrongDefaultChosen = Array.isArray(item.antiChoice)
    ? item.antiChoice.some(term => text.includes(term.toLowerCase())) && !rightChoiceHit
    : null;
  const expectedRungHit = choiceTerms ? rightChoiceHit : expectedTerms.some(term => text.includes(term));
  const overbuildAvoidanceHit = rejectedRiskTerms.some(term => text.includes(term));
  const decisionNoteScore = decisionTerms.filter(term => text.includes(term)).length;
  const safetyHit = ['security', 'privacy', 'accessibility', 'validation', 'observability', 'compliance'].some(term => text.includes(term));
  const dependencyRiskHit = ['dependency', 'maintenance', 'ownership', 'vendor', 'license', 'lock-in', 'cost'].some(term => text.includes(term));
  const score = [
    expectedRungHit,
    overbuildAvoidanceHit,
    decisionNoteScore >= 2,
    safetyHit,
    dependencyRiskHit
  ].filter(Boolean).length;

  return {
    score,
    maxScore: 5,
    expectedRungHit,
    rightChoiceHit,
    wrongDefaultChosen,
    overbuildAvoidanceHit,
    decisionNoteScore,
    safetyHit,
    dependencyRiskHit,
    response
  };
}

function rungTerms(rung) {
  return {
    builtin: ['built-in', 'builtin', 'standard library'],
    'native-platform': ['native', 'platform', 'browser', 'html input'],
    'installed-dependency': ['installed', 'existing dependency', 'zod'],
    'open-source': ['open source', 'library', 'maintained'],
    commercial: ['commercial', 'service', 'vendor', 'provider'],
    'in-house': ['in-house', 'build', 'own', 'proprietary']
  }[rung] || [rung];
}

function riskTerms(text) {
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length >= 5);
}

function summarize(entries) {
  const totals = entries.reduce((acc, entry) => {
    acc.baseline += entry.baseline.score;
    acc.enabled += entry.enabled.score;
    acc.max += entry.enabled.maxScore;
    acc.expectedBaseline += Number(entry.baseline.expectedRungHit);
    acc.expectedEnabled += Number(entry.enabled.expectedRungHit);
    return acc;
  }, { baseline: 0, enabled: 0, max: 0, expectedBaseline: 0, expectedEnabled: 0 });

  return {
    cases: entries.length,
    baselineScore: totals.baseline,
    enabledScore: totals.enabled,
    maxScore: totals.max,
    scoreDelta: totals.enabled - totals.baseline,
    baselineExpectedRungHits: totals.expectedBaseline,
    enabledExpectedRungHits: totals.expectedEnabled
  };
}

function renderSummary(summary) {
  return [
    `Cases: ${summary.cases}`,
    `Baseline score: ${summary.baselineScore}/${summary.maxScore}`,
    `Enabled score: ${summary.enabledScore}/${summary.maxScore}`,
    `Delta: ${summary.scoreDelta}`,
    `Expected rung hits: ${summary.baselineExpectedRungHits} -> ${summary.enabledExpectedRungHits}`
  ].join('\n');
}

function renderMarkdown(data) {
  const lines = [
    '# Buy vs Build Behavior Benchmark (Claude)',
    '',
    `Run: ${data.runId}`,
    '',
    '## Environment',
    '',
    `- Agent: ${data.agent}`,
    `- Claude: ${data.environment.claude || 'unknown'}`,
    `- Model: ${data.environment.model}`,
    `- Injection: ${data.injection}`,
    `- Scoring: ${data.scoring}`,
    `- Node: ${data.environment.node}`,
    `- Platform: ${data.environment.platform}`,
    '',
    '## Summary',
    '',
    '```text',
    renderSummary(data.summary),
    '```',
    '',
    '## Cases',
    '',
    '| Case | Expected | Baseline | Enabled | Delta |',
    '| --- | --- | ---: | ---: | ---: |'
  ];

  for (const item of data.cases) {
    lines.push(`| ${item.id} | ${item.expectedRung} | ${item.baseline.score}/5 | ${item.enabled.score}/5 | ${item.enabled.score - item.baseline.score} |`);
  }

  lines.push('', '## Notes', '', '- Scores are heuristic and inspect final recommendations, not code diffs.', '- Baseline runs from an empty temp workspace; enabled appends the SessionStart hook instructions.');
  return lines.join('\n') + '\n';
}

function sampleResponse(item, enabled) {
  if (enabled) {
    return `Decision: use ${item.expectedRung}. Tradeoff: ${item.buyVsBuildExpectation}. Rejected baseline risk: ${item.baselineRisk}. Revisit if constraints change. Consider security, maintenance, ownership, and cost.`;
  }
  return `I would implement this directly. Keep it simple and add code for the requested feature.`;
}
