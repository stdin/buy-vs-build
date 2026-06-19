const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { slugify, pad, nextAdrNumber, renderAdr, recordDecision } = require('../scripts/record-decision');

assert.equal(slugify('Use SSE for the live feed!'), 'use-sse-for-the-live-feed');
assert.equal(slugify('   '), 'decision');
assert.equal(pad(7), '0007');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvb-adr-'));
assert.equal(nextAdrNumber(dir), 1);

const file1 = recordDecision(dir, {
  title: 'Use SSE for the feed',
  rung: 'native-platform',
  decision: 'Stream updates with Server-Sent Events over HTTP.',
  rejected: 'WebSockets, because the feed is one-way and full-duplex is unused.',
  revisit: 'the feed needs bidirectional messaging',
  date: '2026-06-19'
});
assert.match(file1, /0001-use-sse-for-the-feed\.md$/);
const body = fs.readFileSync(file1, 'utf8');
assert.match(body, /^# 0001\. Use SSE for the feed/m);
assert.match(body, /- Status: Accepted/);
assert.match(body, /- Rung: native-platform/);
assert.match(body, /Server-Sent Events/);
assert.match(body, /\*\*Rejected:\*\* WebSockets/);
assert.match(body, /Revisit if the feed needs bidirectional messaging/);

// Numbering increments off existing files.
assert.equal(nextAdrNumber(dir), 2);
const file2 = recordDecision(dir, { title: 'Adopt zod for validation', decision: 'Use zod.' });
assert.match(file2, /0002-adopt-zod-for-validation\.md$/);

// renderAdr is pure and fills placeholders when fields are missing.
const rendered = renderAdr({ number: 5, title: 'Bare' });
assert.match(rendered, /^# 0005\. Bare/m);
assert.match(rendered, /_The option chosen\._/);

console.log('adr tests passed');
