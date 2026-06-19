#!/usr/bin/env node
// Language-agnostic dependency research helper.
//
// The agent does the real research — see the $buy-vs-build-dependency skill —
// applying the checklist (Russ Cox, "Our Software Dependency Problem"; the
// OpenSSF "Concise Guide for Evaluating Open Source Software"). This helper just
// pulls the cheaply-automatable signals from public, keyless, multi-ecosystem
// APIs so the human/LLM judgment starts from facts:
//   - deps.dev (Open Source Insights): releases, license, advisories, SLSA
//     provenance, and OpenSSF Scorecard — across npm, PyPI, Go, Maven, Cargo,
//     NuGet, and RubyGems.
//   - OSV.dev: known vulnerabilities for every one of those ecosystems.
//   - npm-only extras (downloads, maintainers, install scripts) when relevant.
// Zero dependencies — Node 20+ `fetch` and built-ins only.

const DAY = 86400000;

// ecosystem -> { deps.dev system, OSV ecosystem string }
const SYSTEMS = {
  npm: { depsdev: 'npm', osv: 'npm' },
  pypi: { depsdev: 'pypi', osv: 'PyPI' },
  go: { depsdev: 'go', osv: 'Go' },
  maven: { depsdev: 'maven', osv: 'Maven' },
  cargo: { depsdev: 'cargo', osv: 'crates.io' },
  nuget: { depsdev: 'nuget', osv: 'NuGet' },
  rubygems: { depsdev: 'rubygems', osv: 'RubyGems' }
};

// --- pure assessors: take raw API JSON, return normalized signals ---

function assessDepsDevPackage(pkg, now = Date.now()) {
  if (!pkg || !Array.isArray(pkg.versions)) return null;
  const times = pkg.versions.map(v => Date.parse(v.publishedAt)).filter(Number.isFinite);
  const last = times.length ? Math.max(...times) : NaN;
  const first = times.length ? Math.min(...times) : NaN;
  const def = pkg.versions.find(v => v.isDefault) || pkg.versions[pkg.versions.length - 1] || {};
  return {
    latest: def.versionKey ? def.versionKey.version : null,
    releaseCount: pkg.versions.length,
    daysSinceLastRelease: Number.isFinite(last) ? Math.round((now - last) / DAY) : null,
    ageDays: Number.isFinite(first) ? Math.round((now - first) / DAY) : null,
    deprecated: def.isDeprecated ? (def.deprecationReason || 'deprecated') : null
  };
}

function assessDepsDevVersion(version) {
  if (!version || typeof version !== 'object') return null;
  const provenance = (Array.isArray(version.slsaProvenances) && version.slsaProvenances.length) ||
    (Array.isArray(version.attestations) && version.attestations.length) ? true : null;
  const project = Array.isArray(version.relatedProjects) && version.relatedProjects[0] && version.relatedProjects[0].projectKey
    ? version.relatedProjects[0].projectKey.id : null;
  return {
    license: Array.isArray(version.licenses) && version.licenses.length ? version.licenses.join(', ') : null,
    advisoryCount: Array.isArray(version.advisoryKeys) ? version.advisoryKeys.length : 0,
    provenance,
    projectId: project
  };
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

function assessVulns(osv) {
  const vulns = (osv && Array.isArray(osv.vulns)) ? osv.vulns : [];
  return { count: vulns.length, ids: vulns.map(v => v.id).filter(Boolean) };
}

// npm-only extras from the registry packument
function assessNpmRegistry(packument, now = Date.now()) {
  if (!packument || typeof packument !== 'object') return null;
  const latestTag = (packument['dist-tags'] || {}).latest;
  const latest = (packument.versions || {})[latestTag] || {};
  const scripts = latest.scripts || {};
  return {
    maintainerCount: Array.isArray(packument.maintainers) ? packument.maintainers.length : 0,
    installScripts: ['preinstall', 'install', 'postinstall'].filter(hook => scripts[hook]),
    signed: Boolean(latest.dist && Array.isArray(latest.dist.signatures) && latest.dist.signatures.length),
    directDependencyCount: Object.keys(latest.dependencies || {}).length,
    licenseFallback: packument.license || latest.license || null
  };
}

// --- merge every source into one normalized view ---

function buildView(parts) {
  const { ecosystem, depsPkg, depsVer, project, vulns, npm, downloads } = parts;
  const pick = (...vals) => { for (const v of vals) if (v !== null && v !== undefined) return v; return null; };
  return {
    ecosystem,
    latest: depsPkg ? depsPkg.latest : null,
    releaseCount: depsPkg ? depsPkg.releaseCount : null,
    ageDays: depsPkg ? depsPkg.ageDays : null,
    daysSinceLastRelease: depsPkg ? depsPkg.daysSinceLastRelease : null,
    deprecated: pick(depsPkg && depsPkg.deprecated),
    license: pick(depsVer && depsVer.license, npm && npm.licenseFallback),
    vulnCount: vulns ? vulns.count : (depsVer ? depsVer.advisoryCount : null),
    vulnIds: vulns ? vulns.ids : [],
    provenance: pick(depsVer && depsVer.provenance),
    scorecard: project ? project.scorecard : null,
    stars: project ? project.stars : null,
    forks: project ? project.forks : null,
    openIssues: project ? project.openIssues : null,
    // npm-only (null for other ecosystems — flag/skip accordingly)
    maintainerCount: npm ? npm.maintainerCount : null,
    installScripts: npm ? npm.installScripts : null,
    signed: npm ? npm.signed : null,
    directDependencyCount: npm ? npm.directDependencyCount : null,
    downloads: downloads ?? null
  };
}

// --- roll-up: checklist-aligned flags ---

function summarize(view) {
  const flags = [];
  const good = [];

  if (view.deprecated) flags.push(`Deprecated by its author: ${String(view.deprecated).slice(0, 120)}`);
  if (view.daysSinceLastRelease != null && view.daysSinceLastRelease > 365) flags.push(`No release in ${view.daysSinceLastRelease} days — may be unmaintained.`);
  else if (view.daysSinceLastRelease != null) good.push(`Released within the last ${view.daysSinceLastRelease} days.`);

  if (!view.license) flags.push('No clear license detected.');
  else good.push(`License: ${view.license}.`);

  if (view.vulnCount != null && view.vulnCount > 0) flags.push(`${view.vulnCount} known vulnerabilit${view.vulnCount === 1 ? 'y' : 'ies'}${view.vulnIds.length ? ` (${view.vulnIds.slice(0, 5).join(', ')})` : ''}.`);
  else if (view.vulnCount === 0) good.push('No known vulnerabilities found.');

  if (view.provenance === true) good.push('Has build provenance (SLSA) attestation.');

  if (view.scorecard != null) {
    if (view.scorecard < 5) flags.push(`Low OpenSSF Scorecard: ${view.scorecard}/10.`);
    else good.push(`OpenSSF Scorecard: ${view.scorecard}/10.`);
  }

  // npm-only signals
  if (view.maintainerCount != null) {
    if (view.maintainerCount <= 1) flags.push('Bus factor risk: 1 or fewer listed maintainers (most popular OSS has a truck factor of 2 or less).');
    else good.push(`${view.maintainerCount} maintainers listed.`);
  }
  if (Array.isArray(view.installScripts) && view.installScripts.length) flags.push(`Runs install scripts (${view.installScripts.join(', ')}) — inspect for supply-chain risk.`);
  if (view.signed) good.push('Registry-signed artifacts.');
  if (view.directDependencyCount != null && view.directDependencyCount >= 15) flags.push(`${view.directDependencyCount} direct dependencies — each becomes yours (check the transitive tree).`);
  if (view.downloads != null) good.push(`${view.downloads.toLocaleString('en-US')} downloads in the last month.`);

  const verdict = flags.length === 0
    ? 'No automated red flags — still judge fit, design, and whether a lower rung covers it.'
    : flags.length <= 2
      ? 'Some flags — review them before adopting.'
      : 'Several flags — strongly reconsider, or wrap and isolate it.';

  return { flags, good, verdict };
}

function formatReport(name, ecosystem, view) {
  const { flags, good, verdict } = summarize(view);
  const lines = [`# Dependency report: ${name} (${ecosystem})`, ''];
  lines.push(`- Latest: ${view.latest || '?'} | age ${view.ageDays ?? '?'}d | ${view.releaseCount ?? '?'} releases | last release ${view.daysSinceLastRelease ?? '?'}d ago`);
  lines.push(`- License: ${view.license || 'none'} | known vulns: ${view.vulnCount ?? '?'} | provenance: ${view.provenance ? 'yes' : 'n/a'}`);
  if (view.scorecard != null || view.stars != null) lines.push(`- OpenSSF Scorecard: ${view.scorecard ?? 'n/a'} | ${view.stars ?? '?'}★ ${view.forks ?? '?'} forks ${view.openIssues ?? '?'} open issues`);
  if (view.maintainerCount != null) lines.push(`- Maintainers: ${view.maintainerCount} | direct deps: ${view.directDependencyCount ?? '?'} | downloads/mo: ${view.downloads != null ? view.downloads.toLocaleString('en-US') : '?'}`);
  lines.push('', '## Flags', '', flags.length ? flags.map(f => `- ⚠ ${f}`).join('\n') : '- none', '');
  lines.push('## Reassuring', '', good.length ? good.map(g => `- ✅ ${g}`).join('\n') : '- none', '');
  lines.push('## Verdict', '', verdict, '');
  lines.push('_Automated signals only. The agent still applies the full checklist (`$buy-vs-build-dependency`): fit, design, debuggability, maintainer responsiveness, and whether a lower rung already covers this — for any ecosystem._');
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

async function gatherSignals(pkg, ecosystem) {
  const sys = SYSTEMS[ecosystem];
  if (!sys) throw new Error(`Unknown ecosystem "${ecosystem}". One of: ${Object.keys(SYSTEMS).join(', ')}`);
  const enc = encodeURIComponent(pkg);

  const pkgResp = await getJson(`https://api.deps.dev/v3/systems/${sys.depsdev}/packages/${enc}`);
  const depsPkg = pkgResp.ok ? assessDepsDevPackage(pkgResp.body) : null;

  let depsVer = null;
  if (depsPkg && depsPkg.latest) {
    const verResp = await getJson(`https://api.deps.dev/v3/systems/${sys.depsdev}/packages/${enc}/versions/${encodeURIComponent(depsPkg.latest)}`);
    depsVer = verResp.ok ? assessDepsDevVersion(verResp.body) : null;
  }

  let project = null;
  if (depsVer && depsVer.projectId) {
    const projResp = await getJson(`https://api.deps.dev/v3/projects/${encodeURIComponent(depsVer.projectId)}`);
    project = projResp.ok ? assessProject(projResp.body) : null;
  }

  const osv = await getJson('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ package: { name: pkg, ecosystem: sys.osv }, version: depsPkg ? depsPkg.latest : undefined })
  });
  const vulns = osv.ok ? assessVulns(osv.body) : null;

  let npm = null;
  let downloads = null;
  if (ecosystem === 'npm') {
    const registryPath = pkg.startsWith('@') ? pkg.replace('/', '%2F') : pkg;
    const reg = await getJson(`https://registry.npmjs.org/${registryPath}`);
    npm = reg.ok ? assessNpmRegistry(reg.body) : null;
    const dl = await getJson(`https://api.npmjs.org/downloads/point/last-month/${registryPath}`);
    downloads = dl.ok && Number.isFinite(dl.body.downloads) ? dl.body.downloads : null;
  }

  return { found: Boolean(depsPkg), view: buildView({ ecosystem, depsPkg, depsVer, project, vulns, npm, downloads }) };
}

async function main() {
  const pkg = process.argv[2];
  const ecosystem = (process.argv[3] || 'npm').toLowerCase();
  if (!pkg) {
    console.error(`Usage: node scripts/dependency-report.js <package> [ecosystem]\nEcosystems: ${Object.keys(SYSTEMS).join(', ')} (default npm)`);
    process.exit(1);
  }
  if (!SYSTEMS[ecosystem]) {
    console.error(`Unknown ecosystem "${ecosystem}". One of: ${Object.keys(SYSTEMS).join(', ')}`);
    process.exit(1);
  }
  const { found, view } = await gatherSignals(pkg, ecosystem);
  if (!found) {
    console.error(`Could not find "${pkg}" in ${ecosystem} via deps.dev.`);
    process.exit(1);
  }
  console.log(formatReport(pkg, ecosystem, view));
}

if (require.main === module) main();

module.exports = {
  SYSTEMS,
  assessDepsDevPackage,
  assessDepsDevVersion,
  assessProject,
  assessVulns,
  assessNpmRegistry,
  buildView,
  summarize,
  formatReport,
  gatherSignals
};
