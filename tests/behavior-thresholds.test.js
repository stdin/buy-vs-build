const assert = require('node:assert/strict');
const { assessBehaviorThresholds, formatBehaviorThresholdFailures } = require('../scripts/behavior-thresholds');

const passing = assessBehaviorThresholds({
  scoreDelta: 22,
  enabledScore: 55,
  enabledExpectedRungHits: 12
}, {
  minDelta: 1,
  minEnabledScore: 50,
  minEnabledRungHits: 10
});
assert.deepEqual(passing, []);

const failing = assessBehaviorThresholds({
  scoreDelta: 0,
  enabledScore: 40,
  enabledExpectedRungHits: 7
}, {
  minDelta: 1,
  minEnabledScore: 50,
  minEnabledRungHits: 10
});
assert.equal(failing.length, 3);
assert.match(formatBehaviorThresholdFailures(failing), /threshold failed/);

console.log('behavior threshold tests passed');
