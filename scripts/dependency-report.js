#!/usr/bin/env node
// Dependency research helper: pull the automatable health and supply-chain
// signals for an npm package from public, keyless APIs (npm registry, npm
// downloads, deps.dev / OpenSSF Scorecard, OSV, and the npm provenance
// attestations endpoint), then surface the risk flags that the dependency
// checklist (Russ Cox, "Our Software Dependency Problem"; OpenSSF "Concise
// Guide for Evaluating Open Source Software") says to look at.
//
// The fetched signals inform a human decision; they do not replace one. Fit,
// trust-boundary, and core-differentiation calls stay with the engineer.
// Pure assessment functions are exported and unit-tested; main() does the
// network I/O. Zero dependencies — Node 20+ `fetch` and built-ins only.
const DAY = 86400000;

function parseGithubRepo(repository) {
  const url = typeof repository === 'string' ? repository : (repository && repository.url) || '';
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.#]+)/i);
  return match ? { owner: match[1], repo: match[2] } : null;
}

// --- pure assessors: take raw API JSON, return normalized signals ---

function assessRegistry(packument, now = Date.now()) {
  if (!packument || typeof packument !== 'object') return null;
  const latestTag = (packument['dist-tags'] || {}).latest;
  const versions = packument.versions || {};
  const latest = versions[latestTag] || {};
  const time = packument.time || {};
  const releaseTimes = Object.keys(time)
    .filter(key => key !== 'created' && key !== 'modified')
    .map(key => Date.parse(time[key]))
    .filter(Number.isFinite);
  const lastReleaseAt = releaseTimes.length ? Math.max(...releaseTimes) : Date.parse(time.modified);
  const scripts = latest.scripts || {};
  return {
    name: packument.name,
    latest: latestTag,
    ageDays: time.created ? Math.round((now - Date.parse(time.created)) / DAY) : null,
    daysSinceLastRelease: Number.isFinite(lastReleaseAt) ? Math.round((now - lastReleaseAt) / DAY) : null,
    releaseCount: releaseTimes.length,
    maintainerCount: Array.isArray(packument.maintainers) ? packument.maintainers.length : 0,
    deprecated: latest.deprecated || null,
    license: packument.license || latest.license || null,
    repo: parseGithubRepo(packument.repository),
    hasRepo: Boolean(packument.repository),
    directDependencyCount: Object.keys(latest.dependencies || {}).length,
    installScripts: ['preinstall', 'install', 'postinstall'].filter(hook => scripts[hook]),
    signed: Boolean(latest.dist && Array.isArray(latest.dist.signatures) && latest.dist.signatures.length),
    unpackedSize: latest.dist ? latest.dist.unpackedSize || null : null
  };
}

function assessDownloads(point) {
  return point && Number.isFinite(point.downloads) ? point.downloads : null;
}

function assessVulns(osv) {
  const vulns = (osv && Array.isArray(osv.vulns)) ? osv.vulns : [];
  return { count: vulns.length, ids: vulns.map(v => v.id).filter(Boolean) };
}

function assessProject(project) {
  if (!project || typeof project !== 'object') return null;
  return {
    stars: project.starsCount ?? null,
    forks: project.forksCount ?? null,
    openIssues: project.openIssuesCount ?? null,
    scorecard: project.scorecard && Number.isFinite(project.scorecard.overallScore) ? project.scorecard.overallScore : null
  };
}

// --- roll-up: turn signals into checklist-aligned flags ---

function summarize(signals) {
  const flags = [];   // risks worth a second look
  const good = [];    // reassuring signals
  const reg = signals.registry;

  if (reg) {
    if (reg.deprecated) flags.push(`Deprecated by its author: ${String(reg.deprecated).slice(0, 120)}`);
    if (reg.maintainerCount <= 1) flags.push('Bus factor risk: 1 or fewer listed maintainers (most popular OSS has a truck factor of 2 or less).');
    else good.push(`${reg.maintainerCount} maintainers listed.`);
    if (reg.daysSinceLastRelease != null && reg.daysSinceLastRelease > 365) flags.push(`No release in ${reg.daysSinceLastRelease} days — may be unmaintained.`);
    else if (reg.daysSinceLastRelease != null) good.push(`Released within the last ${reg.daysSinceLastRelease} days.`);
    if (!reg.license) flags.push('No clear license field.');
    else good.push(`License: ${reg.license}.`);
    if (reg.installScripts.length) flags.push(`Runs install scripts (${reg.installScripts.join(', ')}) — inspect for supply-chain risk.`);
    if (reg.directDependencyCount >= 15) flags.push(`${reg.directDependencyCount} direct dependencies — each becomes yours (check the transitive tree).`);
    if (reg.signed) good.push('Registry-signed artifacts.');
  }

  if (signals.vulns && signals.vulns.count > 0) flags.push(`${signals.vulns.count} known vulnerabilit${signals.vulns.count === 1 ? 'y' : 'ies'} (OSV): ${signals.vulns.ids.slice(0, 5).join(', ')}.`);
  else if (signals.vulns) good.push('No known vulnerabilities in OSV for this version.');

  if (signals.provenance === true) good.push('Has build provenance (SLSA) attestation.');
  else if (signals.provenance === false) flags.push('No build-provenance (SLSA) attestation.');

  if (signals.project && signals.project.scorecard != null) {
    if (signals.project.scorecard < 5) flags.push(`Low OpenSSF Scorecard: ${signals.project.scorecard}/10.`);
    else good.push(`OpenSSF Scorecard: ${signals.project.scorecard}/10.`);
  }

  if (signals.downloads != null) good.push(`${signals.downloads.toLocaleString('en-US')} downloads in the last month.`);

  const verdict = flags.length === 0
    ? 'No automated red flags — still judge fit, design, and whether a lower rung covers it.'
    : flags.length <= 2
      ? 'Some flags — review them before adopting.'
      : 'Several flags — strongly reconsider, or wrap and isolate it.';

  return { flags, good, verdict };
}

function formatReport(pkgName, signals) {
  const { flags, good, verdict } = summarize(signals);
  const reg = signals.registry;
  const lines = [`# Dependency report: ${pkgName}`, ''];
  if (reg) {
    lines.push(`- Latest: ${reg.latest || '?'} | age ${reg.ageDays ?? '?'}d | ${reg.releaseCount} releases | last release ${reg.daysSinceLastRelease ?? '?'}d ago`);
    lines.push(`- Maintainers: ${reg.maintainerCount} | direct deps: ${reg.directDependencyCount} | license: ${reg.license || 'none'}`);
  }
  if (signals.downloads != null) lines.push(`- Downloads (last month): ${signals.downloads.toLocaleString('en-US')}`);
  if (signals.project) lines.push(`- GitHub: ${signals.project.stars ?? '?'}★ ${signals.project.forks ?? '?'} forks ${signals.project.openIssues ?? '?'} open issues | Scorecard ${signals.project.scorecard ?? 'n/a'}`);
  lines.push('', '## Flags', '', flags.length ? flags.map(f => `- ⚠ ${f}`).join('\n') : '- none', '');
  lines.push('## Reassuring', '', good.length ? good.map(g => `- ✅ ${g}`).join('\n') : '- none', '');
  lines.push(`## Verdict`, '', verdict, '');
  lines.push('_Automated signals only. Still apply the full checklist (`$buy-vs-build-dependency`): fit, design, debuggability, and whether a lower rung already covers this._');
  return lines.join('\n');
}

// --- network plumbing ---

async function getJson(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, body: await res.json() };
  } catch (_error) {
    return { ok: false, status: 0 };
  }
}

async function gatherSignals(pkgName) {
  const enc = encodeURIComponent(pkgName).replace('%40', '@'); // keep scope readable; registry accepts @scope%2Fname
  const registryPath = pkgName.startsWith('@') ? pkgName.replace('/', '%2F') : pkgName;

  const registry = await getJson(`https://registry.npmjs.org/${registryPath}`);
  const reg = registry.ok ? assessRegistry(registry.body) : null;

  const downloads = await getJson(`https://api.npmjs.org/downloads/point/last-month/${registryPath}`);
  const osv = await getJson('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ package: { name: pkgName, ecosystem: 'npm' }, version: reg ? reg.latest : undefined })
  });

  let project = null;
  if (reg && reg.repo) {
    const id = `github.com%2F${reg.repo.owner}%2F${reg.repo.repo}`;
    const proj = await getJson(`https://api.deps.dev/v3/projects/${id}`);
    project = proj.ok ? assessProject(proj.body) : null;
  }

  let provenance = null;
  if (reg && reg.latest) {
    const att = await getJson(`https://registry.npmjs.org/-/npm/v1/attestations/${enc}@${reg.latest}`);
    provenance = att.status === 404 ? false : att.ok ? true : null;
  }

  return {
    registry: reg,
    downloads: assessDownloads(downloads.ok ? downloads.body : null),
    vulns: osv.ok ? assessVulns(osv.body) : null,
    project,
    provenance
  };
}

async function main() {
  const pkg = process.argv[2];
  if (!pkg) {
    console.error('Usage: node scripts/dependency-report.js <npm-package-name>');
    process.exit(1);
  }
  const signals = await gatherSignals(pkg);
  if (!signals.registry) {
    console.error(`Could not find "${pkg}" on the npm registry.`);
    process.exit(1);
  }
  console.log(formatReport(pkg, signals));
}

if (require.main === module) main();

module.exports = { parseGithubRepo, assessRegistry, assessDownloads, assessVulns, assessProject, summarize, formatReport, gatherSignals };
