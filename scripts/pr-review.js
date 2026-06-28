#!/usr/bin/env node
// Buy-vs-build PR check: for dependencies added in a pull request, (1) confirm a
// decision note exists — a "Decision: use <rung>" line in the PR body or a
// commit, or a new docs/decisions/ ADR — and (2) post the cheaply-automatable
// supply-chain signals (deps.dev / OSV / OpenSSF Scorecard) plus a license-
// compatibility check, so reviewers get evidence, not just a nag. Works across
// npm, PyPI, Go, Maven, Cargo, NuGet, and RubyGems manifests, not just
// package.json. Advice that is not enforced erodes; this moves the rule to the
// trust boundary (CI).
// Pure helpers are exported for tests; main() does the git/GitHub/network
// plumbing when run in Actions or locally. Zero dependencies.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const { isManifest, addedFromManifest, dedupeDeps } = require('./manifests');
const { gatherSignals, summarize, SYSTEMS } = require('./dependency-report');
const { detectProjectLicense, assessLicenseCompat, formatCompat } = require('./license-compat');
const { loadProjectConfig } = require('../hooks/buy-vs-build-config');

const MARKER = '<!-- buy-vs-build-review -->';
const RUNGS = 'do-nothing|built-in|native-platform|installed-dependency|open-source|commercial|in-house';
const DECISION_RE = new RegExp(`decision:\\s*use\\s+(${RUNGS})`, 'i');
const COMMENT_FILE = 'buy-vs-build-comment.md';
const SIGNAL_CAP = 12; // don't hammer public APIs on a giant dependency bump

// --- pure helpers (no git, no network) ---

function parseDeps(pkgJson) {
  let pkg;
  try { pkg = JSON.parse(pkgJson); } catch (_error) { return {}; }
  if (!pkg || typeof pkg !== 'object') return {};
  return Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies, pkg.peerDependencies);
}

// npm-only convenience kept for the original API/tests.
function addedDependencies(beforeJson, afterJson) {
  const before = parseDeps(beforeJson);
  const after = parseDeps(afterJson);
  return Object.keys(after).filter(name => !(name in before)).sort();
}

function hasDecisionEvidence({ prBody = '', commitMessages = '', addedFiles = [] }) {
  if (DECISION_RE.test(prBody) || DECISION_RE.test(commitMessages)) return true;
  return addedFiles.some(file => /(^|\/)docs\/decisions\/\d{4}-.+\.md$/.test(file));
}

function depLabel(dep) {
  if (typeof dep === 'string') return dep;
  if (!dep || !dep.name) return String(dep);
  return dep.ecosystem && dep.ecosystem !== 'npm' ? `${dep.name} (${dep.ecosystem})` : dep.name;
}

function depList(added) {
  return added.map(dep => `\`${depLabel(dep)}\``).join(', ');
}

function changedManifestPaths(changed) {
  return changed.filter(isManifest);
}

// A report has hard flags worth surfacing even when a decision note exists.
function hasHardFlag(report) {
  if (!report) return false;
  if (report.compat && report.compat.level === 'warn') return true;
  return Array.isArray(report.flags) && report.flags.some(f => /vulnerab|Deprecated/i.test(f));
}

function buildSignalsSection(reports) {
  const lines = ['**What the automated check sees** (deps.dev / OSV / OpenSSF — signals, not a verdict):', ''];
  for (const report of reports) {
    if (!report.found) {
      const reason = report.reason ? ` (${report.reason})` : '';
      lines.push(`- \`${report.label}\` — not resolved automatically${reason}; review by hand.`);
      continue;
    }
    const bits = [];
    if (Array.isArray(report.flags) && report.flags.length) bits.push(...report.flags.slice(0, 3).map(f => `⚠ ${f}`));
    if (report.compat && report.compat.level !== 'ok') bits.push(formatCompat(report.compat));
    lines.push(`- \`${report.label}\` — ${bits.length ? bits.join(' ') : '✅ no automated red flags.'}`);
  }
  return lines.join('\n');
}

function isStrictMode(config) {
  return Boolean(config && config.strictness === 'strict');
}

function buildComment(added, opts = {}) {
  const reports = opts.reports || [];
  const enforced = Boolean(opts.enforced);
  const lines = [
    MARKER,
    '### 🧭 Buy vs Build check',
    '',
    `This PR adds ${added.length} dependenc${added.length === 1 ? 'y' : 'ies'}: ${depList(added)}.`,
    ''
  ];
  if (reports.length) lines.push(buildSignalsSection(reports), '');
  lines.push(
    'Before owning a new dependency, confirm a lower rung does not already cover it:',
    '',
    '- Could a **built-in**, **native platform** feature, or an **already-installed** dependency do this?',
    '- Is the dependency **smaller** than the few clear lines it would replace?',
    '- Did you check license, maintenance activity, and security?',
    '',
    'Then record the call so reviewers can see it — in the PR description or a `docs/decisions/` ADR:',
    '',
    '```text',
    'Decision: use open-source: <package>. Tradeoff: <why it wins>. Rejected: <built-in/installed option> because <constraint>. Revisit if <trigger>.',
    '```',
    '',
    enforced
      ? '_Add the note and this strict-mode check clears._'
      : '_Add the note and this check clears. It is advisory — it never blocks the merge by itself._'
  );
  return lines.join('\n');
}

function buildResolvedComment(added, opts = {}) {
  const reports = opts.reports || [];
  const lines = [
    MARKER,
    '### ✅ Buy vs Build check',
    '',
    `This PR adds ${added.length} dependenc${added.length === 1 ? 'y' : 'ies'} (${depList(added)}) and includes a decision note. Thanks for recording the reasoning.`
  ];
  const flagged = reports.filter(hasHardFlag);
  if (flagged.length) {
    lines.push('', '⚠ The automated check still flagged something worth a look before merge:', '', buildSignalsSection(flagged));
  }
  return lines.join('\n');
}

function analyze(inputs) {
  const added = addedDependencies(inputs.beforePkg || '{}', inputs.afterPkg || '{}');
  const hasEvidence = hasDecisionEvidence(inputs);
  return { added, hasEvidence, needsNote: added.length > 0 && !hasEvidence };
}

// --- git / network plumbing (only runs as a CLI) ---

function git(args) {
  try { return execFileSync('git', args, { encoding: 'utf8' }); } catch (_error) { return ''; }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function collectAddedDeps(base, head) {
  const changed = git(['diff', '--name-only', base, head]).split('\n').filter(Boolean);
  const manifestPaths = changedManifestPaths(changed);
  // package.json at the repo root is always worth checking, even via a fallback.
  if (!manifestPaths.includes('package.json') && fs.existsSync('package.json')) manifestPaths.push('package.json');

  const added = [];
  for (const file of manifestPaths) {
    const before = git(['show', `${base}:${file}`]) || '';
    let after = git(['show', `${head}:${file}`]);
    if (!after) { try { after = fs.readFileSync(file, 'utf8'); } catch (_error) { after = ''; } }
    added.push(...addedFromManifest(file, before, after));
  }
  return dedupeDeps(added).filter(dep => SYSTEMS[dep.ecosystem]);
}

async function gatherReports(added, projectLicense) {
  const slice = added.slice(0, SIGNAL_CAP);
  const reports = await mapLimit(slice, 5, async (dep) => {
    const label = depLabel(dep);
    try {
      const { found, view, reason } = await gatherSignals(dep.name, dep.ecosystem);
      if (!found) return { label, found: false, reason };
      const flags = summarize(view).flags;
      const compat = projectLicense && view.license ? assessLicenseCompat(projectLicense, view.license) : null;
      return { label, found: true, flags, compat };
    } catch (error) {
      return { label, found: false, reason: error && error.message ? error.message : 'lookup failed' };
    }
  });
  if (added.length > SIGNAL_CAP) {
    reports.push({ label: `…and ${added.length - SIGNAL_CAP} more`, found: false });
  }
  return reports;
}

async function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i === -1 ? undefined : process.argv[i + 1]; };
  const base = process.env.BASE_SHA || arg('--base') || git(['merge-base', 'origin/main', 'HEAD']).trim() || 'HEAD~1';
  const head = process.env.HEAD_SHA || arg('--head') || 'HEAD';

  const added = collectAddedDeps(base, head);
  const commitMessages = git(['log', '--format=%B', `${base}..${head}`]);
  const addedFiles = git(['diff', '--name-only', '--diff-filter=A', base, head]).split('\n').filter(Boolean);
  const hasEvidence = hasDecisionEvidence({ prBody: process.env.PR_BODY || '', commitMessages, addedFiles });
  const needsNote = added.length > 0 && !hasEvidence;
  const strict = isStrictMode(loadProjectConfig(process.cwd()));

  if (!added.length) {
    console.log('No new dependencies in this PR.');
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `deps_added=false\nneeds_note=false\nstrict=${strict}\n`);
    return;
  }

  const reports = process.env.SKIP_SIGNALS ? [] : await gatherReports(added, detectProjectLicense(process.cwd()));
  const body = needsNote ? buildComment(added, { reports, enforced: strict }) : buildResolvedComment(added, { reports });
  fs.writeFileSync(COMMENT_FILE, body + '\n');
  console.log(body);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `deps_added=true\nneeds_note=${needsNote}\nstrict=${strict}\n`);
  }
  if (needsNote && strict) {
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  parseDeps,
  addedDependencies,
  hasDecisionEvidence,
  isStrictMode,
  depLabel,
  hasHardFlag,
  buildSignalsSection,
  buildComment,
  buildResolvedComment,
  analyze,
  changedManifestPaths,
  collectAddedDeps,
  MARKER,
  COMMENT_FILE
};
