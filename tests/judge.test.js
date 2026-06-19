const assert = require('node:assert/strict');
const { buildJudgePrompt, parseVerdict, RUBRIC } = require('../scripts/judge');

// buildJudgePrompt is pure: it must embed the requirement, the ideal outcome,
// the fit option/anti-option, the full rubric, the response, and a strict JSON
// instruction — without calling a model.
const item = {
  prompt: 'Add a live feed that streams server-side updates to the browser.',
  buyVsBuildExpectation: 'Use Server-Sent Events for one-way streaming.',
  baselineRisk: 'Default to WebSockets for a one-way feed.',
  expectedChoice: ['sse', 'server-sent events'],
  antiChoice: ['websocket']
};
const prompt = buildJudgePrompt(item, 'I recommend Server-Sent Events.');

assert.match(prompt, /Add a live feed/);
assert.match(prompt, /Server-Sent Events for one-way/);
assert.match(prompt, /sse \/ server-sent events/i);
assert.match(prompt, /websocket/i);
assert.match(prompt, /I recommend Server-Sent Events\./);
assert.match(prompt, /ONLY a JSON object/);
for (const criterion of RUBRIC) {
  assert.ok(prompt.includes(criterion), `prompt missing rubric line: ${criterion}`);
}

// parseVerdict tolerates fenced and surrounded JSON and clamps the score to 0-5.
assert.deepEqual(parseVerdict('{"score": 4, "reason": "solid"}'), { score: 4, reason: 'solid' });
assert.equal(parseVerdict('```json\n{"score": 9, "reason": "x"}\n```').score, 5);
assert.equal(parseVerdict('noise {"score": 0, "reason": ""} trailing').score, 0);
assert.equal(parseVerdict('{"score": 3.6, "reason": "r"}').score, 4);
assert.throws(() => parseVerdict('there is no json here'));

console.log('judge tests passed');
