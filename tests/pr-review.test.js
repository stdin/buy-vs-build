const assert = require('node:assert/strict');
const {
  addedDependencies,
  hasDecisionEvidence,
  depLabel,
  hasHardFlag,
  buildSignalsSection,
  buildComment,
  buildResolvedComment,
  analyze,
  MARKER
} = require('../scripts/pr-review');

// Added deps = present in after, absent in before; across all dependency maps.
assert.deepEqual(
  addedDependencies('{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"1","b":"2"},"devDependencies":{"c":"3"}}'),
  ['b', 'c']
);
assert.deepEqual(addedDependencies('{}', '{}'), []);
// Removing a dependency is not an addition.
assert.deepEqual(addedDependencies('{"dependencies":{"a":"1"}}', '{"dependencies":{}}'), []);
// Malformed package.json is tolerated.
assert.deepEqual(addedDependencies('not json', '{"dependencies":{"a":"1"}}'), ['a']);

// Decision evidence: PR body, commit messages, or a new ADR file.
assert.equal(hasDecisionEvidence({ prBody: 'Decision: use open-source: zod. Tradeoff: ...' }), true);
assert.equal(hasDecisionEvidence({ commitMessages: 'feat: x\n\nDecision: use commercial: stripe.' }), true);
assert.equal(hasDecisionEvidence({ addedFiles: ['docs/decisions/0003-use-zod.md'] }), true);
assert.equal(hasDecisionEvidence({ prBody: 'just adding a handy lib' }), false);
assert.equal(hasDecisionEvidence({ addedFiles: ['src/index.js'] }), false);

// analyze: deps added without a note -> needsNote; with a note -> clear.
const flagged = analyze({ beforePkg: '{}', afterPkg: '{"dependencies":{"left-pad":"1.0.0"}}', prBody: '' });
assert.deepEqual(flagged.added, ['left-pad']);
assert.equal(flagged.needsNote, true);

const cleared = analyze({ beforePkg: '{}', afterPkg: '{"dependencies":{"zod":"3"}}', prBody: 'Decision: use open-source: zod.' });
assert.equal(cleared.needsNote, false);

const none = analyze({ beforePkg: '{"dependencies":{"a":"1"}}', afterPkg: '{"dependencies":{"a":"1"}}' });
assert.deepEqual(none.added, []);
assert.equal(none.needsNote, false);

// Comments carry the sticky marker so the workflow can upsert one comment.
const warn = buildComment(['left-pad']);
assert.ok(warn.includes(MARKER));
assert.match(warn, /Buy vs Build check/);
assert.match(warn, /left-pad/);
const resolved = buildResolvedComment(['zod']);
assert.ok(resolved.includes(MARKER));
assert.match(resolved, /includes a decision note/);

// depLabel: npm bare, other ecosystems tagged.
assert.equal(depLabel('left-pad'), 'left-pad');
assert.equal(depLabel({ ecosystem: 'npm', name: 'zod' }), 'zod');
assert.equal(depLabel({ ecosystem: 'pypi', name: 'requests' }), 'requests (pypi)');

// hasHardFlag: vulns / deprecation / license warn count; soft signals don't.
assert.equal(hasHardFlag({ flags: ['2 known vulnerabilities (…)'] }), true);
assert.equal(hasHardFlag({ flags: ['Deprecated by its author: x'] }), true);
assert.equal(hasHardFlag({ compat: { level: 'warn', reason: 'GPL into MIT' } }), true);
assert.equal(hasHardFlag({ flags: ['No release in 500 days — may be unmaintained.'] }), false);
assert.equal(hasHardFlag({ found: false }), false);

// Signals section renders flags + license compat, and a clean dep.
const section = buildSignalsSection([
  { label: 'requests (pypi)', found: true, flags: ['2 known vulnerabilities (OSV-1).'], compat: { level: 'warn', reason: 'GPL-3.0 is strong copyleft…' } },
  { label: 'zod', found: true, flags: [], compat: null },
  { label: 'mystery', found: false }
]);
assert.match(section, /requests \(pypi\).*known vulnerabilit/s);
assert.match(section, /🚫 License:/);
assert.match(section, /`zod` — ✅ no automated red flags/);
assert.match(section, /`mystery` — not resolved automatically/);

// Comment with reports embeds the signals section; multi-ecosystem labels render.
const enriched = buildComment([{ ecosystem: 'pypi', name: 'requests' }], {
  reports: [{ label: 'requests (pypi)', found: true, flags: ['2 known vulnerabilities (OSV-1).'], compat: null }]
});
assert.match(enriched, /requests \(pypi\)/);
assert.match(enriched, /What the automated check sees/);

// Resolved comment still warns when a hard flag remains despite the decision note.
const resolvedFlagged = buildResolvedComment(['gpl-lib'], {
  reports: [{ label: 'gpl-lib', found: true, flags: [], compat: { level: 'warn', reason: 'GPL into MIT' } }]
});
assert.match(resolvedFlagged, /still flagged something/);
assert.match(resolvedFlagged, /🚫 License:/);

console.log('pr-review tests passed');
