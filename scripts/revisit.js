#!/usr/bin/env node
// Close the ADR loop. Every buy-vs-build decision note ends with "Revisit if
// <trigger>", but nothing ever surfaces those triggers — so a choice that was
// right at 100 users quietly stays unquestioned at 100k. This scans
// docs/decisions/, parses each ADR's revisit trigger, and reports which ones
// have fired: date-based ("Revisit if … by 2026-01-01" or a "Review by:" line),
// dependency-version-based ("revisit when X reaches 2.0"), or — when the trigger
// is prose a machine can't judge — flagged for a human/LLM to look at.
//
// Pure parsing/evaluation helpers are exported for tests; main() does the fs
// scan and the optional network lookup for version triggers. Zero dependencies.

const fs = require('node:fs');
const path = require('node:path');

// --- pure parsing / classification / evaluation ---

function parseAdr(text) {
  const body = String(text);
  const heading = body.match(/^#\s*(\d{4})\.\s*(.+?)\s*$/m);
  const status = body.match(/^[-*]\s*Status:\s*(.+?)\s*$/im);
  const date = body.match(/^[-*]\s*Date:\s*(\d{4}-\d{2}-\d{2})/im);
  const rung = body.match(/^[-*]\s*Rung:\s*(.+?)\s*$/im);
  const reviewBy = body.match(/^[-*]\s*Review by:\s*(\d{4}-\d{2}-\d{2})/im);
  const revisit = body.match(/Revisit if\s+([^\n]+)/i);
  return {
    number: heading ? heading[1] : null,
    title: heading ? heading[2].trim() : null,
    status: status ? status[1].trim() : null,
    date: date ? date[1] : null,
    rung: rung ? rung[1].trim() : null,
    reviewBy: reviewBy ? reviewBy[1] : null,
    revisit: revisit ? revisit[1].trim().replace(/[.\s]+$/, '') : null
  };
}

function classifyTrigger(text) {
  if (!text || !String(text).trim()) return { type: 'none' };
  const value = String(text);

  const isoDate = value.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDate) return { type: 'date', date: isoDate[1] };

  // "<pkg> reaches/hits/ships/>= 2.0", "version 2.0 of <pkg>"
  const verbForm = value.match(/([@\w./-]+)\s+(?:reaches|hits|gets to|ships|releases?|moves to|>=?|≥|to)\s+v?(\d+(?:\.\d+)+)/i);
  if (verbForm) return { type: 'version', pkg: verbForm[1], version: verbForm[2] };
  const ofForm = value.match(/version\s+v?(\d+(?:\.\d+)+)\s+of\s+([@\w./-]+)/i);
  if (ofForm) return { type: 'version', pkg: ofForm[2], version: ofForm[1] };

  // A bare future year ("revisit in 2027") is a coarse date.
  const year = value.match(/\b(20\d{2})\b/);
  if (year) return { type: 'date', date: `${year[1]}-12-31` };

  return { type: 'manual' };
}

function compareVersions(a, b) {
  const pa = String(a).split('.');
  const pb = String(b).split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = parseInt(pa[i], 10) || 0;
    const nb = parseInt(pb[i], 10) || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// ISO dates compare correctly as strings.
function isDateDue(dateStr, now) {
  return Boolean(dateStr) && Boolean(now) && dateStr <= now;
}

// ctx: { now: 'YYYY-MM-DD', versions: { '<pkg>': '<latest>' } }
function evaluateAdr(adr, ctx = {}) {
  const now = ctx.now;
  const versions = ctx.versions || {};
  const base = { number: adr.number, title: adr.title, revisit: adr.revisit };

  if (adr.status && /supersed/i.test(adr.status)) {
    return { ...base, status: 'skip', reason: 'Superseded.' };
  }
  if (adr.reviewBy && isDateDue(adr.reviewBy, now)) {
    return { ...base, status: 'due', reason: `Review-by date ${adr.reviewBy} has passed.` };
  }

  const trigger = classifyTrigger(adr.revisit);
  if (trigger.type === 'date') {
    return isDateDue(trigger.date, now)
      ? { ...base, status: 'due', reason: `Revisit date ${trigger.date} has passed.` }
      : { ...base, status: 'pending', reason: `Revisit on ${trigger.date}.` };
  }
  if (trigger.type === 'version') {
    const latest = versions[trigger.pkg];
    if (latest == null) {
      return { ...base, status: 'manual', reason: `Version trigger — couldn't resolve "${trigger.pkg}" automatically; check whether it reached ${trigger.version}.` };
    }
    return compareVersions(latest, trigger.version) >= 0
      ? { ...base, status: 'due', reason: `${trigger.pkg} is at ${latest} (trigger: ${trigger.version}).` }
      : { ...base, status: 'pending', reason: `${trigger.pkg} at ${latest}; trigger fires at ${trigger.version}.` };
  }
  if (trigger.type === 'none') {
    return { ...base, status: 'manual', reason: 'No machine-checkable revisit trigger — review by hand.' };
  }
  return { ...base, status: 'manual', reason: `Judgement call: "${adr.revisit}".` };
}

function formatReport(results) {
  const groups = { due: [], manual: [], pending: [], skip: [] };
  for (const r of results) (groups[r.status] || groups.manual).push(r);

  const lines = ['# Decision revisit check', ''];
  lines.push(`${groups.due.length} due, ${groups.manual.length} need a human look, ${groups.pending.length} pending, ${groups.skip.length} superseded.`, '');

  const section = (title, icon, rows) => {
    if (!rows.length) return;
    lines.push(`## ${title}`, '');
    for (const r of rows) lines.push(`- ${icon} **${r.number}. ${r.title}** — ${r.reason}`);
    lines.push('');
  };
  section('Due now', '🔔', groups.due);
  section('Needs a human or LLM judgement', '🤔', groups.manual);
  section('Not yet due', '⏳', groups.pending);
  if (groups.skip.length) section('Superseded', '🗄', groups.skip);

  if (!groups.due.length && !groups.manual.length) lines.push('_Nothing to revisit right now._', '');
  return lines.join('\n');
}

// --- fs / network plumbing ---

function readAdrs(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir); } catch (_error) { return []; }
  return entries
    .filter(name => /^\d{4}-.+\.md$/.test(name)) // skip 0000-template intentionally? keep it: 0000 is the template
    .filter(name => name !== '0000-template.md')
    .sort()
    .map(name => parseAdr(fs.readFileSync(path.join(dir, name), 'utf8')));
}

async function resolveVersions(adrs) {
  const versions = {};
  const pkgs = new Set();
  for (const adr of adrs) {
    const trigger = classifyTrigger(adr.revisit);
    if (trigger.type === 'version') pkgs.add(trigger.pkg);
  }
  if (!pkgs.size) return versions;
  let gatherSignals;
  try { ({ gatherSignals } = require('./dependency-report')); } catch (_error) { return versions; }
  for (const pkg of pkgs) {
    try {
      const { found, view } = await gatherSignals(pkg, 'npm'); // ADRs in this repo are npm-centric; unresolved -> manual
      if (found && view.latest) versions[pkg] = view.latest;
    } catch (_error) { /* leave unresolved -> manual */ }
  }
  return versions;
}

async function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i === -1 ? undefined : process.argv[i + 1]; };
  const dir = arg('--dir') || path.join('docs', 'decisions');
  const asJson = process.argv.includes('--json');
  const now = new Date().toISOString().slice(0, 10);

  const adrs = readAdrs(dir);
  if (!adrs.length) {
    console.log(`No ADRs found in ${dir}.`);
    return;
  }
  const versions = process.env.SKIP_NETWORK ? {} : await resolveVersions(adrs);
  const results = adrs.map(adr => evaluateAdr(adr, { now, versions }));

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(formatReport(results));
  }
}

if (require.main === module) main();

module.exports = { parseAdr, classifyTrigger, compareVersions, isDateDue, evaluateAdr, formatReport, readAdrs };
