const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { renderConfig, renderWorkflow } = require('../bin/buy-vs-build');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'bin', 'buy-vs-build.js');

const config = JSON.parse(renderConfig());
assert.equal(config.strictness, 'strict');
assert.ok(config.priorities.includes('dependency ownership'));

const workflow = renderWorkflow();
assert.match(workflow, /stdin\/buy-vs-build\/\.github\/actions\/dependency-review@main/);
assert.match(workflow, /GITHUB_TOKEN/);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.bin['buy-vs-build'], 'bin/buy-vs-build.js');
assert.ok(packageJson.files.includes('.github/actions/dependency-review/'));
assert.ok(fs.existsSync(path.join(root, '.github', 'actions', 'dependency-review', 'action.yml')));
assert.ok(fs.existsSync(path.join(root, '.github', 'actions', 'dependency-review', 'index.js')));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvb-init-'));
const completed = spawnSync(process.execPath, [cli, 'init', '--advisory'], {
  cwd: dir,
  encoding: 'utf8'
});
assert.equal(completed.status, 0, completed.stderr);
assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
assert.ok(fs.existsSync(path.join(dir, '.buyvsbuild.json')));
assert.ok(fs.existsSync(path.join(dir, '.github', 'workflows', 'buy-vs-build-review.yml')));
assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.buyvsbuild.json'), 'utf8')).strictness, 'advisory');

const skipped = spawnSync(process.execPath, [cli, 'init'], {
  cwd: dir,
  encoding: 'utf8'
});
assert.equal(skipped.status, 0, skipped.stderr);
assert.match(skipped.stdout, /skipped: AGENTS\.md/);

console.log('init tests passed');
