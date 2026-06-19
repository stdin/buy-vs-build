#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const casesPath = path.join(root, 'benchmarks', 'behavior-cases.json');
const outputDir = path.join(root, 'benchmarks', 'results');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8')).cases;
const selectedIds = getArgValues('--case');
const limit = Number(getArgValue('--limit') || cases.length);
const dryRun = process.argv.includes('--dry-run');
const keepPluginState = process.argv.includes('--keep-plugin-state');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runCases = cases.filter(item => selectedIds.length === 0 || selectedIds.includes(item.id)).slice(0, limit);

if (runCases.length === 0) {
  throw new Error('No benchmark cases selected.');
}

fs.mkdirSync(outputDir, { recursive: true });

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'buy-vs-build-bench-'));
fs.writeFileSync(path.join(tempRoot, 'README.md'), '# Empty benchmark workspace\n', 'utf8');

const result = {
  runId,
  createdAt: new Date().toISOString(),
  command: process.argv.slice(2),
  environment: {
    codex: capture('codex', ['--version']),
    node: process.version,
    platform: `${process.platform} ${process.arch}`
  },
  pluginState: {},
  cases: [],
  summary: null
};

try {
  if (dryRun) {
    for (const item of runCases) {
      result.cases.push({
        id: item.id,
        expectedRung: item.expectedRung,
        baseline: scoreResponse(item, sampleResponse(item, false)),
        enabled: scoreResponse(item, sampleResponse(item, true))
      });
    }
  } else {
    removePlugin();
    result.pluginState.baseline = capturePluginState();
    for (const item of runCases) {
      const response = runCodex(item);
      result.cases.push({
        id: item.id,
        expectedRung: item.expectedRung,
        baseline: scoreResponse(item, response)
      });
    }

    installPlugin();
    result.pluginState.enabled = capturePluginState();
    for (const item of runCases) {
      const existing = result.cases.find(entry => entry.id === item.id);
      existing.enabled = scoreResponse(item, runCodex(item));
    }
  }
} finally {
  if (!dryRun && !keepPluginState) {
    installPlugin();
  }
}

result.summary = summarize(result.cases);
const jsonPath = path.join(outputDir, `behavior-${runId}.json`);
const mdPath = path.join(outputDir, `behavior-${runId}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(mdPath, renderMarkdown(result));

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
console.log(renderSummary(result.summary));

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

function removePlugin() {
  run('codex', ['plugin', 'remove', 'buy-vs-build@buy-vs-build'], { allowFailure: true });
  run('codex', ['plugin', 'marketplace', 'remove', 'buy-vs-build'], { allowFailure: true });
}

function installPlugin() {
  run('codex', ['plugin', 'marketplace', 'add', 'stdin/buy-vs-build']);
  run('codex', ['plugin', 'add', 'buy-vs-build@buy-vs-build']);
}

function runCodex(item) {
  const outputPath = path.join(tempRoot, `${item.id}-${Date.now()}.txt`);
  const prompt = [
    'You are evaluating an implementation request. Do not edit files. Do not run commands.',
    'Return a concise implementation recommendation with tradeoffs.',
    '',
    `Request: ${item.prompt}`
  ].join('\n');

  run('codex', [
    'exec',
    '--cd', tempRoot,
    '--sandbox', 'read-only',
    '--skip-git-repo-check',
    '--ephemeral',
    '--dangerously-bypass-hook-trust',
    '--output-last-message', outputPath,
    prompt
  ]);

  return fs.readFileSync(outputPath, 'utf8');
}

function run(command, args, options = {}) {
  const started = Date.now();
  const completed = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  });

  if (completed.status !== 0 && !options.allowFailure) {
    throw new Error([
      `Command failed after ${Date.now() - started}ms: ${command} ${args.join(' ')}`,
      completed.stdout,
      completed.stderr
    ].filter(Boolean).join('\n'));
  }

  return completed;
}

function capture(command, args) {
  const completed = run(command, args, { allowFailure: true });
  return [completed.stdout, completed.stderr].filter(Boolean).join('\n').trim();
}

function capturePluginState() {
  const output = capture('codex', ['plugin', 'list']);
  const lines = output.split('\n').filter(line => /buy-vs-build/.test(line));
  return lines.join('\n') || '(buy-vs-build not listed)';
}

function scoreResponse(item, response) {
  const text = response.toLowerCase();
  const expectedTerms = rungTerms(item.expectedRung);
  const rejectedRiskTerms = riskTerms(item.baselineRisk);
  const decisionTerms = ['decision', 'tradeoff', 'rejected', 'revisit', 'because'];

  const expectedRungHit = expectedTerms.some(term => text.includes(term));
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
    '# Buy vs Build Behavior Benchmark',
    '',
    `Run: ${data.runId}`,
    '',
    '## Environment',
    '',
    `- Codex: ${data.environment.codex || 'unknown'}`,
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

  lines.push('', '## Notes', '', '- Scores are heuristic and inspect final recommendations, not code diffs.', '- Run from a temporary empty workspace with read-only sandboxing.');
  return lines.join('\n') + '\n';
}

function sampleResponse(item, enabled) {
  if (enabled) {
    return `Decision: use ${item.expectedRung}. Tradeoff: ${item.buyVsBuildExpectation}. Rejected baseline risk: ${item.baselineRisk}. Revisit if constraints change. Consider security, maintenance, ownership, and cost.`;
  }
  return `I would implement this directly. Keep it simple and add code for the requested feature.`;
}

module.exports = { scoreResponse, summarize };
