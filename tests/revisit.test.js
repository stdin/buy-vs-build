const assert = require('node:assert/strict');
const { parseAdr, classifyTrigger, compareVersions, isDateDue, evaluateAdr, formatReport } = require('../scripts/revisit');

const SAMPLE = `# 0007. Use SSE for the live feed

- Status: Accepted
- Date: 2026-01-10
- Rung: native-platform

## Context

One-way feed.

## Decision

Server-Sent Events.

**Tradeoff:** simpler infra.
**Rejected:** WebSockets because full-duplex is unused.

## Consequences

Revisit if the feed needs bidirectional messaging.
`;

const adr = parseAdr(SAMPLE);
assert.equal(adr.number, '0007');
assert.equal(adr.title, 'Use SSE for the live feed');
assert.equal(adr.status, 'Accepted');
assert.equal(adr.date, '2026-01-10');
assert.equal(adr.rung, 'native-platform');
assert.equal(adr.revisit, 'the feed needs bidirectional messaging'); // trailing period stripped

// Trigger classification.
assert.deepEqual(classifyTrigger('the feed needs bidirectional messaging'), { type: 'manual' });
assert.deepEqual(classifyTrigger('by 2026-01-01'), { type: 'date', date: '2026-01-01' });
assert.deepEqual(classifyTrigger('revisit in 2027'), { type: 'date', date: '2027-12-31' });
assert.deepEqual(classifyTrigger('react reaches 20.0'), { type: 'version', pkg: 'react', version: '20.0' });
assert.deepEqual(classifyTrigger('when zod >= 4.0'), { type: 'version', pkg: 'zod', version: '4.0' });
assert.deepEqual(classifyTrigger('version 2.0 of express ships'), { type: 'version', pkg: 'express', version: '2.0' });
assert.deepEqual(classifyTrigger(''), { type: 'none' });

// Version comparison + date due check.
assert.equal(compareVersions('2.0.0', '1.9.9'), 1);
assert.equal(compareVersions('1.0', '1.0.0'), 0);
assert.equal(compareVersions('1.2', '1.10'), -1);
assert.equal(isDateDue('2026-01-01', '2026-06-19'), true);
assert.equal(isDateDue('2027-01-01', '2026-06-19'), false);

const now = '2026-06-19';

// Manual trigger -> needs a human look.
assert.equal(evaluateAdr(adr, { now }).status, 'manual');

// Date trigger fired vs pending.
assert.equal(evaluateAdr({ number: '1', title: 'x', revisit: 'by 2026-01-01' }, { now }).status, 'due');
assert.equal(evaluateAdr({ number: '2', title: 'y', revisit: 'by 2027-01-01' }, { now }).status, 'pending');

// Review-by line independent of the revisit trigger.
assert.equal(evaluateAdr({ number: '3', title: 'z', reviewBy: '2026-05-01', revisit: 'never' }, { now }).status, 'due');

// Version trigger: resolved, fired / pending; unresolved -> manual.
assert.equal(evaluateAdr({ number: '4', title: 'a', revisit: 'react reaches 18.0' }, { now, versions: { react: '19.1.0' } }).status, 'due');
assert.equal(evaluateAdr({ number: '5', title: 'b', revisit: 'react reaches 99.0' }, { now, versions: { react: '19.1.0' } }).status, 'pending');
assert.equal(evaluateAdr({ number: '6', title: 'c', revisit: 'react reaches 18.0' }, { now, versions: {} }).status, 'manual');

// Superseded ADRs are skipped.
assert.equal(evaluateAdr({ number: '7', title: 'old', status: 'Superseded', revisit: 'by 2026-01-01' }, { now }).status, 'skip');

// Report groups and counts.
const report = formatReport([
  { number: '1', title: 'A', status: 'due', reason: 'date passed' },
  { number: '2', title: 'B', status: 'manual', reason: 'judgement' },
  { number: '3', title: 'C', status: 'pending', reason: 'later' }
]);
assert.match(report, /1 due, 1 need a human look, 1 pending/);
assert.match(report, /## Due now/);
assert.match(report, /🔔 \*\*1\. A\*\*/);
assert.match(report, /## Needs a human or LLM judgement/);

console.log('revisit tests passed');
