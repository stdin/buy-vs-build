#!/usr/bin/env node
// Buy-vs-build PR check: flag dependencies added in a pull request that lack a
// decision note — a "Decision: use <rung>" line in the PR body or a commit, or
// a new docs/decisions/ ADR. Advice that is not enforced erodes; this moves the
// rule to the trust boundary (CI). Pure helpers are exported for tests; main()
// does the git/GitHub plumbing when run in Actions or locally. Zero deps.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const MARKER = '<!-- buy-vs-build-review -->';
const RUNGS = 'do-nothing|built-in|native-platform|installed-dependency|open-source|commercial|in-house';
const DECISION_RE = new RegExp(`decision:\\s*use\\s+(${RUNGS})`, 'i');
const COMMENT_FILE = 'buy-vs-build-comment.md';

function parseDeps(pkgJson) {
  let pkg;
  try { pkg = JSON.parse(pkgJson); } catch (_error) { return {}; }
  if (!pkg || typeof pkg !== 'object') return {};
  return Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies, pkg.peerDependencies);
}

function addedDependencies(beforeJson, afterJson) {
  const before = parseDeps(beforeJson);
  const after = parseDeps(afterJson);
  return Object.keys(after).filter(name => !(name in before)).sort();
}

function hasDecisionEvidence({ prBody = '', commitMessages = '', addedFiles = [] }) {
  if (DECISION_RE.test(prBody) || DECISION_RE.test(commitMessages)) return true;
  return addedFiles.some(file => /(^|\/)docs\/decisions\/\d{4}-.+\.md$/.test(file));
}

function buildComment(added) {
  const list = added.map(name => `\`${name}\``).join(', ');
  return [
    MARKER,
    '### 🧭 Buy vs Build check',
    '',
    `This PR adds ${added.length} dependenc${added.length === 1 ? 'y' : 'ies'}: ${list}.`,
    '',
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
    '_Add the note and this check clears. It is advisory — it never blocks the merge by itself._'
  ].join('\n');
}

function buildResolvedComment(added) {
  const list = added.map(name => `\`${name}\``).join(', ');
  return [
    MARKER,
    '### ✅ Buy vs Build check',
    '',
    `This PR adds ${added.length} dependenc${added.length === 1 ? 'y' : 'ies'} (${list}) and includes a decision note. Thanks for recording the reasoning.`
  ].join('\n');
}

function analyze(inputs) {
  const added = addedDependencies(inputs.beforePkg || '{}', inputs.afterPkg || '{}');
  const hasEvidence = hasDecisionEvidence(inputs);
  return { added, hasEvidence, needsNote: added.length > 0 && !hasEvidence };
}

function git(args) {
  try { return execFileSync('git', args, { encoding: 'utf8' }); } catch (_error) { return ''; }
}

function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i === -1 ? undefined : process.argv[i + 1]; };
  const base = process.env.BASE_SHA || arg('--base') || git(['merge-base', 'origin/main', 'HEAD']).trim() || 'HEAD~1';
  const head = process.env.HEAD_SHA || arg('--head') || 'HEAD';

  const beforePkg = git(['show', `${base}:package.json`]) || '{}';
  let afterPkg = git(['show', `${head}:package.json`]);
  if (!afterPkg) {
    try { afterPkg = fs.readFileSync('package.json', 'utf8'); } catch (_error) { afterPkg = '{}'; }
  }
  const commitMessages = git(['log', '--format=%B', `${base}..${head}`]);
  const addedFiles = git(['diff', '--name-only', '--diff-filter=A', base, head]).split('\n').filter(Boolean);

  const result = analyze({ beforePkg, afterPkg, prBody: process.env.PR_BODY || '', commitMessages, addedFiles });

  if (result.added.length) {
    const body = result.needsNote ? buildComment(result.added) : buildResolvedComment(result.added);
    fs.writeFileSync(COMMENT_FILE, body + '\n');
    console.log(body);
  } else {
    console.log('No new dependencies in this PR.');
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `deps_added=${result.added.length > 0}\nneeds_note=${result.needsNote}\n`);
  }
}

if (require.main === module) main();

module.exports = { parseDeps, addedDependencies, hasDecisionEvidence, buildComment, buildResolvedComment, analyze, MARKER, COMMENT_FILE };
