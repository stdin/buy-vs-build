#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cwd = process.cwd();

const USAGE = `Usage:
  buy-vs-build init [--strict|--advisory] [--no-github-action] [--agents-only] [--force] [--dry-run]
  buy-vs-build --help

Installs the Buy vs Build agent rule into the current repository.`;

function hasFlag(name) {
  return process.argv.includes(name);
}

function source(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function target(rel) {
  return path.join(cwd, rel);
}

function writeFile(rel, content, opts = {}) {
  const file = target(rel);
  const exists = fs.existsSync(file);
  if (exists && !hasFlag('--force')) {
    return { rel, status: 'skipped', reason: 'exists' };
  }
  if (!hasFlag('--dry-run')) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return { rel, status: exists ? 'overwritten' : 'created', executable: opts.executable };
}

function renderConfig() {
  const strictness = hasFlag('--advisory') ? 'advisory' : 'strict';
  return JSON.stringify({
    strictness,
    priorities: ['safety', 'dependency ownership', 'maintainability'],
    alwaysReuse: ['auth', 'payments', 'email delivery', 'cryptography'],
    notes: 'Buy vs Build is installed to make coding agents justify ownership before adding code, dependencies, or services.'
  }, null, 2) + '\n';
}

function renderWorkflow() {
  return `name: Buy vs Build PR Review

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v5
        with:
          node-version: 22.x
      - uses: stdin/buy-vs-build/.github/actions/dependency-review@main
        env:
          BASE_SHA: \${{ github.event.pull_request.base.sha }}
          HEAD_SHA: \${{ github.event.pull_request.head.sha }}
          PR_BODY: \${{ github.event.pull_request.body }}
          GITHUB_TOKEN: \${{ github.token }}
`;
}

function install() {
  const results = [];
  results.push(writeFile('AGENTS.md', source('AGENTS.md')));
  results.push(writeFile('.buyvsbuild.json', renderConfig()));
  if (!hasFlag('--agents-only') && !hasFlag('--no-github-action')) {
    results.push(writeFile('.github/workflows/buy-vs-build-review.yml', renderWorkflow()));
  }
  return results;
}

function printResults(results) {
  const verb = hasFlag('--dry-run') ? 'Would install' : 'Installed';
  console.log(`${verb} Buy vs Build in ${cwd}`);
  for (const result of results) {
    const suffix = result.reason ? ` (${result.reason}; pass --force to overwrite)` : '';
    console.log(`- ${result.status}: ${result.rel}${suffix}`);
  }
}

function main() {
  const command = process.argv[2];
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return;
  }
  if (command !== 'init') {
    console.error(`Unknown command: ${command}\n\n${USAGE}`);
    process.exit(1);
  }
  if (hasFlag('--strict') && hasFlag('--advisory')) {
    console.error('Choose only one of --strict or --advisory.');
    process.exit(1);
  }
  printResults(install());
}

if (require.main === module) main();

module.exports = { renderConfig, renderWorkflow, install };
