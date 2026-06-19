#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonical = read('rules/buy-vs-build.md').trim();

const copies = [
  ['AGENTS.md', text => text.trim()],
  ['CLAUDE.md', text => text.trim()],
  ['GEMINI.md', text => text.trim()],
  ['.github/copilot-instructions.md', text => text.trim()],
  ['.cursor/rules/buy-vs-build.mdc', stripFrontmatter],
  ['.windsurf/rules/buy-vs-build.md', text => text.trim()],
  ['.clinerules/buy-vs-build.md', text => text.trim()],
  ['.kiro/steering/buy-vs-build.md', stripFrontmatter],
  ['.agents/rules/buy-vs-build.md', text => text.trim()]
];

const invariants = [
  'standard library',
  'native platform',
  'already-installed dependencies',
  'open source',
  'commercial',
  'Build in-house only when',
  'security',
  'licensing',
  'exit risk'
];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

let failed = false;

for (const [relPath, normalize] of copies) {
  const actual = normalize(read(relPath));
  if (actual !== canonical) {
    console.error(`${relPath} drifted from rules/buy-vs-build.md`);
    failed = true;
  }
}

const skill = read('skills/buy-vs-build/SKILL.md');
for (const phrase of invariants) {
  for (const [label, text] of [['rules/buy-vs-build.md', canonical], ['skills/buy-vs-build/SKILL.md', skill]]) {
    if (!text.includes(phrase)) {
      console.error(`${label} is missing invariant: "${phrase}"`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('Update rules/buy-vs-build.md, copied instruction files, or SKILL.md.');
  process.exit(1);
}

console.log(`Rule copies match; ${invariants.length} invariants present.`);
