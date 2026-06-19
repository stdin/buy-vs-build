#!/usr/bin/env node
// LLM-judge scorer for the behavior benchmark.
//
// The keyword heuristic in the benchmark scripts is fast and offline but brittle
// (it depends on exact substrings). This module scores a recommendation with a
// rubric-based judge run through the Claude CLI, returning a 0-5 score and a
// one-line reason. It is agent-agnostic: it judges any response text, whoever
// produced it. buildJudgePrompt is pure and unit-tested; judgeResponse shells
// out to `claude`.
const { spawnSync } = require('node:child_process');

const RUBRIC = [
  'Picks the right ownership level (reuse vs build) for the requirement.',
  'Picks the right specific option for the job, not the most powerful, popular, or familiar one.',
  'Names concrete tradeoffs (cost, maintenance, ownership, or risk).',
  'Preserves safety and correctness where relevant (security, privacy, validation, accessibility).',
  'Gives a clear recommendation with rationale (a decision note).'
];

function buildJudgePrompt(item, response) {
  const lines = [
    'You are scoring an AI coding agent\'s implementation recommendation against the buy-vs-build methodology.',
    'Buy-vs-build: reuse built-ins, platform features, dependencies, open source, or commercial options before building in-house, and pick the option that fits the requirement rather than the flashiest one.',
    '',
    `Requirement: ${item.prompt}`,
    `Ideal outcome: ${item.buyVsBuildExpectation || '(use the lowest-ownership option that fits)'}`,
    `Overbuild trap to avoid: ${item.baselineRisk || '(unnecessary custom code or dependencies)'}`
  ];
  if (Array.isArray(item.expectedChoice) && item.expectedChoice.length) {
    lines.push(`Right technical option(s): ${item.expectedChoice.join(' / ')}.`);
  }
  if (Array.isArray(item.antiChoice) && item.antiChoice.length) {
    lines.push(`Avoid defaulting to: ${item.antiChoice.join(' / ')} unless its extra capability is actually required.`);
  }
  lines.push(
    '',
    'Agent recommendation to score:',
    '"""',
    String(response || '').trim(),
    '"""',
    '',
    'Award one point for each criterion that the recommendation clearly satisfies:',
    ...RUBRIC.map((line, index) => `${index + 1}. ${line}`),
    '',
    'Respond with ONLY a JSON object and nothing else: {"score": <integer 0-5>, "reason": "<one short sentence>"}.'
  );
  return lines.join('\n');
}

function parseVerdict(text) {
  const stripped = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`judge did not return JSON: ${stripped.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]);
  const score = Math.max(0, Math.min(5, Math.round(Number(parsed.score))));
  if (!Number.isFinite(score)) throw new Error(`judge returned a non-numeric score: ${match[0]}`);
  return { score, reason: typeof parsed.reason === 'string' ? parsed.reason : '' };
}

function judgeResponse(item, response, options = {}) {
  const prompt = buildJudgePrompt(item, response);
  const args = ['-p', '--output-format', 'json'];
  if (options.model) args.push('--model', options.model);
  args.push('--disallowed-tools', 'Bash', 'Edit', 'Write', 'NotebookEdit', 'WebSearch', 'WebFetch');

  const completed = spawnSync('claude', args, {
    input: prompt,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: options.timeout || 180000
  });
  if (completed.status !== 0) {
    throw new Error(`judge (claude) failed: ${(completed.stderr || completed.stdout || '').slice(0, 300)}`);
  }

  let text = completed.stdout;
  try {
    const envelope = JSON.parse(completed.stdout);
    if (typeof envelope.result === 'string') text = envelope.result;
  } catch (_error) {
    // stdout was not the CLI JSON envelope; fall through and parse it directly.
  }

  const verdict = parseVerdict(text);
  return { score: verdict.score, maxScore: 5, judge: true, reason: verdict.reason, expectedRungHit: null, response };
}

module.exports = { buildJudgePrompt, parseVerdict, judgeResponse, RUBRIC };
