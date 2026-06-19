const assert = require('node:assert/strict');
const { runBenchmark } = require('../scripts/benchmark');
const behavior = require('../benchmarks/behavior-cases.json');

const result = runBenchmark({ iterations: 5, spawnIterations: 1 });

assert.equal(result.instructions.iterations, 5);
assert.equal(result.hookSpawn.iterations, 1);
assert.ok(result.instructions.averageMs >= 0);
assert.ok(result.hookSpawn.averageMs >= 0);
assert.ok(Array.isArray(behavior.cases));
assert.ok(behavior.cases.length >= 6);

for (const item of behavior.cases) {
  assert.ok(item.id);
  assert.ok(item.prompt.includes('Build') || item.prompt.includes('Add') || item.prompt.includes('Implement'));
  assert.ok(item.buyVsBuildExpectation);
  assert.ok(item.baselineRisk);
  assert.ok(['builtin', 'native-platform', 'installed-dependency', 'open-source', 'commercial', 'in-house'].includes(item.expectedRung));
}

console.log('benchmark tests passed');
