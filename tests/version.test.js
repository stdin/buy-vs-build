const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = readJson('package.json');

for (const file of ['.codex-plugin/plugin.json', '.claude-plugin/plugin.json', 'gemini-extension.json']) {
  assert.equal(readJson(file).version, packageJson.version, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

console.log('version tests passed');
