const assert = require('node:assert/strict');
const { extractSection } = require('../scripts/extract-changelog');

const CL = [
  '# Changelog',
  '',
  '## [0.3.0] - 2026-06-19',
  '',
  '### Added',
  '- thing a',
  '- thing b',
  '',
  '## [0.2.0] - 2026-06-19',
  '',
  '### Added',
  '- old thing',
  ''
].join('\n');

// Extracts only the requested version's body, header excluded, next section excluded.
const v030 = extractSection(CL, '0.3.0');
assert.match(v030, /### Added/);
assert.match(v030, /- thing a/);
assert.match(v030, /- thing b/);
assert.ok(!v030.includes('old thing'));
assert.ok(!v030.includes('0.3.0')); // header line is dropped

// Later sections still resolve.
assert.match(extractSection(CL, '0.2.0'), /- old thing/);

// Bracketless headings work too.
assert.match(extractSection('## 1.0.0\n\nnotes here\n', '1.0.0'), /notes here/);

// Unknown version -> null (workflow falls back to generated notes).
assert.equal(extractSection(CL, '9.9.9'), null);

console.log('extract-changelog tests passed');
