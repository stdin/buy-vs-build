const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts/run-behavior-benchmark.js'), 'utf8');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/behavior-cases.json'), 'utf8'));

assert.match(script, /run\('codex', \['plugin', 'remove', 'buy-vs-build@buy-vs-build'\]/);
assert.match(script, /run\('codex', \['plugin', 'marketplace', 'add', 'stdin\/buy-vs-build'\]/);
assert.match(script, /run\('codex', \['plugin', 'add', 'buy-vs-build@buy-vs-build'\]/);
assert.match(script, /'exec'/);
assert.match(script, /--sandbox/);
assert.match(script, /read-only/);
assert.match(script, /scoreResponse/);
assert.match(script, /--min-delta/);
assert.match(script, /--no-write/);
assert.match(script, /assessBehaviorThresholds/);
assert.ok(cases.cases.length >= 6);

console.log('live benchmark harness tests passed');
