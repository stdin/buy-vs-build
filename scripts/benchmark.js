#!/usr/bin/env node
const { performance } = require('node:perf_hooks');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { getBuyVsBuildInstructions } = require('../hooks/buy-vs-build-instructions');

function measure(iterations, fn) {
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    fn();
  }
  const totalMs = performance.now() - start;
  return {
    iterations,
    totalMs,
    averageMs: totalMs / iterations
  };
}

function runBenchmark(options = {}) {
  const iterations = options.iterations || 10000;
  const spawnIterations = options.spawnIterations || 100;
  const root = path.resolve(__dirname, '..');

  return {
    instructions: measure(iterations, () => {
      const instructions = getBuyVsBuildInstructions();
      if (!instructions.includes('BUY-VS-BUILD MODE ACTIVE')) {
        throw new Error('instruction generation failed');
      }
    }),
    hookSpawn: measure(spawnIterations, () => {
      const result = spawnSync(process.execPath, ['hooks/buy-vs-build-activate.js'], {
        cwd: root,
        encoding: 'utf8'
      });
      if (result.status !== 0) {
        throw new Error(result.stderr || 'hook spawn failed');
      }
    })
  };
}

function formatMetric(name, metric) {
  return `${name}: ${metric.iterations} iterations, ${metric.totalMs.toFixed(2)}ms total, ${metric.averageMs.toFixed(4)}ms avg`;
}

if (require.main === module) {
  const result = runBenchmark();
  console.log(formatMetric('instruction generation', result.instructions));
  console.log(formatMetric('hook process startup', result.hookSpawn));
}

module.exports = { runBenchmark };
