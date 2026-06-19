#!/usr/bin/env node
// Single source of truth -> generated copies.
//
// Regenerates every per-agent instruction file from rules/buy-vs-build.md, and
// mirrors .codex-plugin/, hooks/, and skills/ into plugins/buy-vs-build/ so the
// marketplace copy stays byte-identical. Run `npm run sync` after editing the
// canonical rule, a skill, or a hook. `npm run sync:check` verifies everything
// is already in sync (used in CI) and exits non-zero if it is not.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

const CURSOR_FRONTMATTER = '---\ndescription: Buy-vs-build mode\nglobs: **/*\nalwaysApply: true\n---\n';
const KIRO_FRONTMATTER = '---\ninclusion: always\n---\n';

// Per-agent instruction files that are plain copies of the canonical rule.
const PLAIN_RULE_COPIES = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.github/copilot-instructions.md',
  '.windsurf/rules/buy-vs-build.md',
  '.clinerules/buy-vs-build.md',
  '.agents/rules/buy-vs-build.md'
];

// Top-level directories mirrored verbatim into plugins/buy-vs-build/.
const MIRROR_DIRS = ['.codex-plugin', 'hooks', 'skills'];
const MIRROR_DEST = 'plugins/buy-vs-build';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(relDir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, relDir), { withFileTypes: true })) {
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

function buildTargets() {
  const canonical = read('rules/buy-vs-build.md');
  const targets = [];

  for (const rel of PLAIN_RULE_COPIES) {
    targets.push({ rel, content: canonical });
  }
  targets.push({ rel: '.cursor/rules/buy-vs-build.mdc', content: CURSOR_FRONTMATTER + canonical });
  targets.push({ rel: '.kiro/steering/buy-vs-build.md', content: KIRO_FRONTMATTER + canonical });

  for (const dir of MIRROR_DIRS) {
    for (const srcRel of walk(dir)) {
      targets.push({ rel: path.join(MIRROR_DEST, srcRel), content: read(srcRel) });
    }
  }

  return targets;
}

const targets = buildTargets();
const changed = [];

for (const { rel, content } of targets) {
  const abs = path.join(root, rel);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (current === content) continue;
  changed.push(rel);
  if (!check) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}

if (check) {
  if (changed.length) {
    console.error(`Out of sync (${changed.length} file(s)). Run \`npm run sync\`:`);
    for (const rel of changed) console.error(`  ${rel}`);
    process.exit(1);
  }
  console.log(`In sync; ${targets.length} generated files match their sources.`);
} else {
  if (changed.length) {
    console.log(`Synced ${changed.length} file(s):`);
    for (const rel of changed) console.log(`  ${rel}`);
  } else {
    console.log(`Already in sync; ${targets.length} generated files checked.`);
  }
}
