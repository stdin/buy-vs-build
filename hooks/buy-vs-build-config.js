// Per-project buy-vs-build policy.
//
// A project can drop a .buyvsbuild.json at its root to tune the rule to its real
// constraints (a regulated shop weights security; a startup weights speed; a team
// has standardized on certain dependencies). This module reads and renders that
// config into a text block the SessionStart hook appends to the injected rule.
// Lives in hooks/ (not scripts/) so it ships inside the installed plugin, which
// only contains the .codex-plugin/, hooks/, and skills/ trees.
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_FILENAME = '.buyvsbuild.json';

function loadProjectConfig(cwd) {
  const file = path.join(cwd || process.cwd(), CONFIG_FILENAME);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (_error) {
    return null; // no project config; this is the common case
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    // Never break a session over a typo in the config; warn and continue.
    process.stderr.write(`buy-vs-build: ignoring malformed ${CONFIG_FILENAME}: ${error.message}\n`);
    return null;
  }
}

function list(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : [];
}

function renderProjectConfig(config) {
  if (!config || typeof config !== 'object') return null;

  const header = ['## Project buy-vs-build policy (.buyvsbuild.json)', ''];
  const rules = [];

  if (config.strictness === 'strict') {
    rules.push('- Strictness: strict — write a decision note for every non-trivial choice.');
  } else if (config.strictness === 'advisory') {
    rules.push('- Strictness: advisory — write a decision note for non-obvious choices.');
  }

  const priorities = list(config.priorities);
  if (priorities.length) rules.push(`- Weight these first when trading off: ${priorities.join(', ')}.`);

  const preferred = list(config.preferredDependencies);
  if (preferred.length) rules.push(`- Prefer these already-vetted dependencies when they fit: ${preferred.join(', ')}.`);

  const banned = list(config.bannedDependencies);
  if (banned.length) rules.push(`- Do not add these dependencies: ${banned.join(', ')}.`);

  const alwaysBuild = list(config.alwaysBuild);
  if (alwaysBuild.length) rules.push(`- Always build in-house (core differentiation): ${alwaysBuild.join('; ')}.`);

  const alwaysReuse = list(config.alwaysReuse);
  if (alwaysReuse.length) rules.push(`- Always reuse, never build: ${alwaysReuse.join('; ')}.`);

  if (typeof config.notes === 'string' && config.notes.trim()) {
    rules.push(`- Project notes: ${config.notes.trim()}`);
  }

  if (!rules.length) return null; // config present but empty/unrecognized
  return header.concat(rules).join('\n');
}

function getProjectConfigBlock(cwd) {
  return renderProjectConfig(loadProjectConfig(cwd));
}

module.exports = { CONFIG_FILENAME, loadProjectConfig, renderProjectConfig, getProjectConfigBlock };
