const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonical = fs.readFileSync(path.join(root, 'rules', 'buy-vs-build.md'), 'utf8').trim();
const instructionFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.github/copilot-instructions.md',
  '.cursor/rules/buy-vs-build.mdc',
  '.windsurf/rules/buy-vs-build.md',
  '.clinerules/buy-vs-build.md',
  '.kiro/steering/buy-vs-build.md',
  '.agents/rules/buy-vs-build.md'
];

const metadataFiles = [
  'gemini-extension.json',
  '.claude-plugin/plugin.json',
  'opencode.json',
  '.opencode/plugins/buy-vs-build.mjs',
  'hooks/claude-codex-hooks.json',
  '.openclaw/skills/buy-vs-build/SKILL.md'
];

function stripFrontmatter(body) {
  return body.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

for (const file of instructionFiles) {
  const body = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(stripFrontmatter(body), canonical, `${file} drifted from rules/buy-vs-build.md`);
  assert.match(body, /Buy-vs-build/i, file);
  assert.match(body, /standard library/i, file);
  assert.match(body, /native platform/i, file);
  assert.match(body, /already-installed/i, file);
  assert.match(body, /open source/i, file);
  assert.match(body, /commercial/i, file);
  assert.match(body, /Build in-house only when/i, file);
  assert.match(body, /security/i, file);
}

for (const file of metadataFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), file);
}

const geminiExtension = JSON.parse(fs.readFileSync(path.join(root, 'gemini-extension.json'), 'utf8'));
assert.equal(geminiExtension.name, 'buy-vs-build');
assert.equal(geminiExtension.contextFileName, 'AGENTS.md');

const claudePlugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
assert.equal(claudePlugin.name, 'buy-vs-build');
assert.equal(claudePlugin.hooks, './hooks/claude-codex-hooks.json');

const opencode = JSON.parse(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8'));
assert.deepEqual(opencode.plugin, ['./.opencode/plugins/buy-vs-build.mjs']);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.deepEqual(packageJson.pi.skills, ['./skills']);

console.log('agent file tests passed');
