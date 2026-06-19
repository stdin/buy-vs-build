const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const marketplace = readJson('.agents/plugins/marketplace.json');

assert.equal(marketplace.name, 'buy-vs-build');
assert.equal(marketplace.plugins.length, 1);
assert.equal(marketplace.plugins[0].name, 'buy-vs-build');
assert.equal(marketplace.plugins[0].source.path, './plugins/buy-vs-build');
assert.equal(marketplace.plugins[0].policy.installation, 'AVAILABLE');
assert.equal(marketplace.plugins[0].policy.authentication, 'ON_INSTALL');

const copiedFiles = [
  ['.codex-plugin/plugin.json', 'plugins/buy-vs-build/.codex-plugin/plugin.json'],
  ['hooks/hooks.json', 'plugins/buy-vs-build/hooks/hooks.json'],
  ['hooks/buy-vs-build-activate.js', 'plugins/buy-vs-build/hooks/buy-vs-build-activate.js'],
  ['hooks/buy-vs-build-instructions.js', 'plugins/buy-vs-build/hooks/buy-vs-build-instructions.js'],
  ['skills/buy-vs-build/SKILL.md', 'plugins/buy-vs-build/skills/buy-vs-build/SKILL.md'],
  ['skills/buy-vs-build-review/SKILL.md', 'plugins/buy-vs-build/skills/buy-vs-build-review/SKILL.md'],
  ['skills/buy-vs-build-audit/SKILL.md', 'plugins/buy-vs-build/skills/buy-vs-build-audit/SKILL.md'],
  ['skills/buy-vs-build-decision/SKILL.md', 'plugins/buy-vs-build/skills/buy-vs-build-decision/SKILL.md'],
  ['skills/buy-vs-build-gain/SKILL.md', 'plugins/buy-vs-build/skills/buy-vs-build-gain/SKILL.md'],
  ['skills/buy-vs-build-right-tool/SKILL.md', 'plugins/buy-vs-build/skills/buy-vs-build-right-tool/SKILL.md']
];

for (const [source, copy] of copiedFiles) {
  assert.equal(read(source), read(copy), `${copy} drifted from ${source}`);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
}

function readJson(file) {
  return JSON.parse(read(file));
}

console.log('marketplace tests passed');
