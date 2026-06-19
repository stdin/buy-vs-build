#!/usr/bin/env node
// Capture a buy-vs-build decision as an ADR (Architecture Decision Record).
//
// The rule already emits "Decision: use <rung>. Tradeoff: ... Rejected: ...
// Revisit if ..." notes, but they evaporate. This appends them to a durable,
// numbered, reviewable log under docs/decisions/ so the reasoning and the
// "revisit if" trigger survive. Pure helpers are exported for testing; the CLI
// runs when invoked directly. Zero dependencies.
const fs = require('node:fs');
const path = require('node:path');

const RUNGS = ['do-nothing', 'built-in', 'native-platform', 'installed-dependency', 'open-source', 'commercial', 'in-house'];

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'decision';
}

function pad(number) {
  return String(number).padStart(4, '0');
}

function nextAdrNumber(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch (_error) {
    return 1;
  }
  let max = 0;
  for (const name of entries) {
    const match = name.match(/^(\d{4})-/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function renderAdr(fields) {
  const { number, title, status = 'Accepted', date, rung, decision, tradeoff, rejected, revisit, context } = fields;
  const lines = [
    `# ${pad(number)}. ${title}`,
    '',
    `- Status: ${status}`,
    date ? `- Date: ${date}` : null,
    rung ? `- Rung: ${rung}` : null,
    '',
    '## Context',
    '',
    context || '_What requirement and constraints prompted this decision?_',
    '',
    '## Decision',
    '',
    decision || '_The option chosen._'
  ];
  if (tradeoff) lines.push('', `**Tradeoff:** ${tradeoff}`);
  if (rejected) lines.push('', `**Rejected:** ${rejected}`);
  lines.push('', '## Consequences', '', revisit ? `Revisit if ${revisit}` : '_What this commits us to, and when to revisit._');
  return lines.filter(line => line !== null).join('\n') + '\n';
}

function recordDecision(dir, fields) {
  fs.mkdirSync(dir, { recursive: true });
  const number = fields.number || nextAdrNumber(dir);
  const file = path.join(dir, `${pad(number)}-${slugify(fields.title)}.md`);
  fs.writeFileSync(file, renderAdr({ ...fields, number }));
  return file;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const title = get('--title');
  if (!title) {
    console.error('Usage: node scripts/record-decision.js --title "..." [--rung <rung>] [--decision "..."] [--tradeoff "..."] [--rejected "..."] [--revisit "..."] [--context "..."] [--date YYYY-MM-DD] [--dir docs/decisions]');
    console.error(`Rungs: ${RUNGS.join(', ')}`);
    process.exit(1);
  }
  const dir = get('--dir') || path.join('docs', 'decisions');
  const file = recordDecision(dir, {
    title,
    rung: get('--rung'),
    decision: get('--decision'),
    tradeoff: get('--tradeoff'),
    rejected: get('--rejected'),
    revisit: get('--revisit'),
    context: get('--context'),
    date: get('--date') || new Date().toISOString().slice(0, 10)
  });
  console.log(`Wrote ${file}`);
}

module.exports = { slugify, pad, nextAdrNumber, renderAdr, recordDecision, RUNGS };
