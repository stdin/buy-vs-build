#!/usr/bin/env node
// Whole-repo dependency audit: the left-pad story, run against what you already
// own. Enumerate the project's direct dependencies across manifests, pull the
// automatable signals for each (reusing dependency-report.js), then rank by
// *ownership risk* and, for the riskiest, name the lower rung you might drop to.
//
// This is NOT a vulnerability scanner — OSV/deps.dev already do that and we
// delegate to them. The buy-vs-build angle the scanners don't give you is the
// question "which of these could you stop owning?": remove it, replace it with a
// built-in/native primitive, or absorb a few clear lines instead. The scoring is
// a heuristic prioritizer; the human still judges fit. Pure helpers are exported
// for tests; main() does the fs/network plumbing. Zero dependencies.

const { parseManifest, dedupeDeps, MANIFESTS } = require('./manifests');
const { gatherSignals, summarize, SYSTEMS } = require('./dependency-report');
const { detectProjectLicense, assessLicenseCompat } = require('./license-compat');

// --- pure scoring / suggestion / formatting ---

// Weighted, capped 0–100. Higher = more ownership risk worth reviewing.
function scoreOwnershipRisk(view, compat) {
  let score = 0;
  if (view.deprecated) score += 40;
  if (view.daysSinceLastRelease != null && view.daysSinceLastRelease > 365) score += 20;
  if (view.vulnCount) score += 25 + (view.vulnCount > 2 ? 10 : 0);
  if (view.scorecard != null && view.scorecard < 5) score += 15;
  if (view.maintainerCount != null && view.maintainerCount <= 1) score += 15;
  if (Array.isArray(view.installScripts) && view.installScripts.length) score += 10;
  if (view.directDependencyCount != null && view.directDependencyCount >= 15) score += 10;
  if (!view.license) score += 10;
  if (compat && compat.level === 'warn') score += 30;
  else if (compat && compat.level === 'review') score += 10;
  return Math.min(100, score);
}

// The buy-vs-build prompt: can this drop to a lower rung?
function suggestDrop(view, compat) {
  if (view.deprecated) return 'Deprecated by its author — remove it or move to the maintained successor.';
  if (compat && compat.level === 'warn') return 'License conflict — replace with a permissively-licensed option, or isolate and review.';
  if (view.vulnCount) return 'Known vulnerabilities — upgrade, replace, or remove.';
  if (view.daysSinceLastRelease != null && view.daysSinceLastRelease > 365) {
    return 'Unmaintained — confirm a built-in or native-platform primitive can\'t replace it.';
  }
  if (view.maintainerCount != null && view.maintainerCount <= 1 && view.directDependencyCount === 0) {
    return 'One maintainer, no sub-deps — consider owning a few clear lines instead (remember left-pad), or a better-supported alternative.';
  }
  if (compat && compat.level === 'review') return 'Copyleft obligations — confirm your usage is compatible.';
  return 'No automated red flags — keep, but confirm a lower rung doesn\'t already cover it.';
}

function rankAudit(rows) {
  return [...rows].sort((a, b) => b.risk - a.risk || a.name.localeCompare(b.name));
}

function riskBand(risk) {
  if (risk >= 60) return 'high';
  if (risk >= 30) return 'medium';
  if (risk > 0) return 'low';
  return 'clear';
}

function formatAuditReport(rows, meta = {}) {
  const ranked = rankAudit(rows);
  const counts = { high: 0, medium: 0, low: 0, clear: 0 };
  for (const row of ranked) if (row.found) counts[riskBand(row.risk)]++;
  const unresolved = ranked.filter(row => !row.found).length;

  const lines = [`# Dependency ownership audit`, ''];
  if (meta.projectLicense) lines.push(`Project license: ${meta.projectLicense}.`);
  let summary = `Audited ${ranked.length} direct dependenc${ranked.length === 1 ? 'y' : 'ies'} — ${counts.high} high, ${counts.medium} medium, ${counts.low} low risk, ${counts.clear} clear`;
  summary += unresolved ? `, ${unresolved} unresolved.` : '.';
  lines.push(summary, '');

  for (const row of ranked) {
    if (!row.found) {
      lines.push(`### ❔ ${row.name} (${row.ecosystem})`, '', '- Could not resolve automatically; review by hand.', '');
      continue;
    }
    const band = riskBand(row.risk);
    const icon = band === 'high' ? '🔴' : band === 'medium' ? '🟠' : band === 'low' ? '🟡' : '🟢';
    lines.push(`### ${icon} ${row.name} (${row.ecosystem}) — risk ${row.risk}/100`, '');
    if (row.flags.length) lines.push(...row.flags.map(f => `- ⚠ ${f}`));
    else lines.push('- ✅ no automated red flags.');
    if (row.compat && row.compat.level !== 'ok') lines.push(`- License: ${row.compat.reason}`);
    lines.push(`- **Could you drop a rung?** ${row.suggestion}`, '');
  }

  lines.push('_Automated signals and a heuristic risk score only. The agent still applies the full checklist (`$buy-vs-build-dependency`) and judges fit, design, and whether a lower rung already covers each one._');
  return lines.join('\n');
}

// --- fs / network plumbing ---

const fs = require('node:fs');
const path = require('node:path');

function enumerateRepoDeps(target, includeIndirect) {
  const stat = (() => { try { return fs.statSync(target); } catch (_error) { return null; } })();
  let files = [];
  if (stat && stat.isFile()) {
    files = [target];
  } else {
    const dir = target || process.cwd();
    files = Object.keys(MANIFESTS).map(name => path.join(dir, name)).filter(file => fs.existsSync(file));
  }
  const deps = [];
  for (const file of files) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch (_error) { continue; }
    for (const dep of parseManifest(file, text)) {
      if (dep.indirect && !includeIndirect) continue;
      deps.push(dep);
    }
  }
  return dedupeDeps(deps).filter(dep => SYSTEMS[dep.ecosystem]);
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

async function auditDep(dep, projectLicense) {
  try {
    const { found, view } = await gatherSignals(dep.name, dep.ecosystem);
    if (!found) return { name: dep.name, ecosystem: dep.ecosystem, found: false, risk: 0 };
    const flags = summarize(view).flags;
    const compat = projectLicense && view.license ? assessLicenseCompat(projectLicense, view.license) : null;
    const risk = scoreOwnershipRisk(view, compat);
    return { name: dep.name, ecosystem: dep.ecosystem, found: true, flags, compat, risk, suggestion: suggestDrop(view, compat) };
  } catch (_error) {
    return { name: dep.name, ecosystem: dep.ecosystem, found: false, risk: 0 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => args.includes(name);
  const positional = args.find(a => !a.startsWith('--'));
  const target = positional || process.cwd();
  const includeIndirect = flag('--include-indirect');
  const asJson = flag('--json');

  const deps = enumerateRepoDeps(target, includeIndirect);
  if (!deps.length) {
    console.error('No supported dependency manifests found (package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, Gemfile).');
    process.exit(1);
  }

  const projectLicense = detectProjectLicense(fs.statSync(target).isFile() ? path.dirname(target) : target);
  process.stderr.write(`Auditing ${deps.length} dependencies…\n`);
  const rows = await mapLimit(deps, 6, (dep) => auditDep(dep, projectLicense));

  if (asJson) {
    console.log(JSON.stringify({ projectLicense, dependencies: rankAudit(rows) }, null, 2));
  } else {
    console.log(formatAuditReport(rows, { projectLicense }));
  }
}

if (require.main === module) main();

module.exports = { scoreOwnershipRisk, suggestDrop, rankAudit, riskBand, formatAuditReport, enumerateRepoDeps };
