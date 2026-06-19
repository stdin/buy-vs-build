const assert = require('node:assert/strict');
const {
  SYSTEMS,
  assessDepsDevPackage,
  assessDepsDevVersion,
  assessProject,
  assessVulns,
  assessNpmRegistry,
  buildView,
  summarize,
  formatReport
} = require('../scripts/dependency-report');

// Covers all major ecosystems, not just npm.
assert.deepEqual(Object.keys(SYSTEMS).sort(), ['cargo', 'go', 'maven', 'npm', 'nuget', 'pypi', 'rubygems']);
assert.equal(SYSTEMS.cargo.osv, 'crates.io');

const NOW = Date.parse('2022-01-01T00:00:00Z');

// deps.dev package: cross-ecosystem release cadence + deprecation.
const depsPkg = assessDepsDevPackage({
  versions: [
    { versionKey: { version: '1.0.0' }, publishedAt: '2020-01-01T00:00:00Z' },
    { versionKey: { version: '1.2.0' }, publishedAt: '2020-06-01T00:00:00Z', isDefault: true, isDeprecated: true, deprecationReason: 'use the stdlib' }
  ]
}, NOW);
assert.equal(depsPkg.latest, '1.2.0');
assert.equal(depsPkg.releaseCount, 2);
assert.equal(depsPkg.deprecated, 'use the stdlib');
assert.ok(depsPkg.daysSinceLastRelease > 365);

const depsVer = assessDepsDevVersion({
  licenses: ['MIT'],
  advisoryKeys: [{ id: 'GHSA-1' }],
  slsaProvenances: [{ sourceRepository: 'x' }],
  relatedProjects: [{ projectKey: { id: 'github.com/acme/demo' } }]
});
assert.equal(depsVer.license, 'MIT');
assert.equal(depsVer.advisoryCount, 1);
assert.equal(depsVer.provenance, true);
assert.equal(depsVer.projectId, 'github.com/acme/demo');

assert.deepEqual(
  assessProject({ starsCount: 100, forksCount: 10, openIssuesCount: 5, scorecard: { overallScore: 7.2 } }),
  { stars: 100, forks: 10, openIssues: 5, scorecard: 7.2 }
);

assert.deepEqual(assessVulns({ vulns: [{ id: 'OSV-1' }] }), { count: 1, ids: ['OSV-1'] });

const npm = assessNpmRegistry({
  'dist-tags': { latest: '1.2.0' },
  maintainers: [{ name: 'solo' }],
  license: 'MIT',
  versions: { '1.2.0': { scripts: { postinstall: 'node setup.js' }, dependencies: { a: '1' }, dist: { signatures: [{ s: 1 }] } } }
});
assert.equal(npm.maintainerCount, 1);
assert.deepEqual(npm.installScripts, ['postinstall']);
assert.equal(npm.signed, true);
assert.equal(npm.directDependencyCount, 1);

// npm view: merges deps.dev + npm extras, flags the risks.
const npmView = buildView({ ecosystem: 'npm', depsPkg, depsVer, project: { scorecard: 3 }, vulns: { count: 1, ids: ['OSV-1'] }, npm, downloads: 12345 });
const npmSummary = summarize(npmView);
assert.ok(npmSummary.flags.some(f => /Deprecated/.test(f)));
assert.ok(npmSummary.flags.some(f => /Bus factor/.test(f)));
assert.ok(npmSummary.flags.some(f => /No release in/.test(f)));
assert.ok(npmSummary.flags.some(f => /install scripts/.test(f)));
assert.ok(npmSummary.flags.some(f => /known vulnerabilit/.test(f)));
assert.ok(npmSummary.flags.some(f => /Low OpenSSF Scorecard/.test(f)));
assert.ok(npmSummary.good.some(g => /downloads in the last month/.test(g)));
assert.match(npmSummary.verdict, /strongly reconsider/);

// Non-npm view (e.g. PyPI): npm-only signals are null and must be skipped cleanly.
const pyView = buildView({
  ecosystem: 'pypi',
  depsPkg: assessDepsDevPackage({ versions: [{ versionKey: { version: '2.0.0' }, publishedAt: '2021-12-20T00:00:00Z', isDefault: true }] }, NOW),
  depsVer: assessDepsDevVersion({ licenses: ['Apache-2.0'], advisoryKeys: [], relatedProjects: [{ projectKey: { id: 'github.com/o/p' } }] }),
  project: { scorecard: 8, stars: 5000 },
  vulns: { count: 0, ids: [] },
  npm: null,
  downloads: null
});
assert.equal(pyView.maintainerCount, null);
assert.equal(pyView.installScripts, null);
const pySummary = summarize(pyView);
assert.deepEqual(pySummary.flags, []);
assert.ok(pySummary.good.some(g => /Apache-2\.0/.test(g)));
assert.ok(pySummary.good.some(g => /Scorecard: 8/.test(g)));

const report = formatReport('demo', 'pypi', pyView);
assert.match(report, /^# Dependency report: demo \(pypi\)/m);
assert.match(report, /## Verdict/);
assert.match(report, /any ecosystem/);

console.log('dependency-report tests passed');
