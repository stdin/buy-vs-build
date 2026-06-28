#!/usr/bin/env node
'use strict';

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function assessBehaviorThresholds(summary, thresholds = {}) {
  const failures = [];
  if (!summary || typeof summary !== 'object') return ['Benchmark summary is missing.'];

  const minDelta = finiteNumber(thresholds.minDelta);
  if (minDelta !== null && summary.scoreDelta < minDelta) {
    failures.push(`Score delta ${summary.scoreDelta} is below required ${minDelta}.`);
  }

  const minEnabledScore = finiteNumber(thresholds.minEnabledScore);
  if (minEnabledScore !== null && summary.enabledScore < minEnabledScore) {
    failures.push(`Enabled score ${summary.enabledScore} is below required ${minEnabledScore}.`);
  }

  const minEnabledRungHits = finiteNumber(thresholds.minEnabledRungHits);
  if (minEnabledRungHits !== null && summary.enabledExpectedRungHits < minEnabledRungHits) {
    failures.push(`Enabled expected-rung hits ${summary.enabledExpectedRungHits} is below required ${minEnabledRungHits}.`);
  }

  return failures;
}

function formatBehaviorThresholdFailures(failures) {
  return ['Behavior benchmark threshold failed:', ...failures.map(f => `- ${f}`)].join('\n');
}

module.exports = { assessBehaviorThresholds, formatBehaviorThresholdFailures };
