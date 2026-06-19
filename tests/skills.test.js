const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skills = [
  'buy-vs-build-review',
  'buy-vs-build-audit',
  'buy-vs-build-decision',
  'buy-vs-build-gain',
  'buy-vs-build-right-tool'
];

for (const skill of skills) {
  const skillPath = path.join(root, 'skills', skill, 'SKILL.md');
  const body = fs.readFileSync(skillPath, 'utf8');
  assert.match(body, new RegExp(`name: ${skill}`));
  assert.match(body, /description: Use when/);
  assert.match(body, /buy-vs-build/i);
}

console.log('command skill tests passed');
