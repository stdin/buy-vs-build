const assert = require('node:assert/strict');
const {
  addedDependencies,
  hasDecisionEvidence,
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

console.log('pr-review tests passed');
