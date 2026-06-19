const assert = require('node:assert/strict');
const {
  parseGithubRepo,
  assessRegistry,
  assessVulns,
  assessProject,
  summarize,
  formatReport
} = require('../scripts/dependency-report');

// parseGithubRepo handles the common git URL shapes.
assert.deepEqual(parseGithubRepo('git+https://github.com/acme/demo.git'), { owner: 'acme', repo: 'demo' });
assert.deepEqual(parseGithubRepo({ url: 'https://github.com/acme/demo' }), { owner: 'acme', repo: 'demo' });
assert.equal(parseGithubRepo('https://gitlab.com/x/y'), null);

const NOW = Date.parse('2022-01-01T00:00:00Z');
const packument = {
  name: 'demo',
  'dist-tags': { latest: '1.2.0' },
  maintainers: [{ name: 'solo' }],
  license: 'MIT',
  repository: { url: 'git+https://github.com/acme/demo.git' },
  time: {
    created: '2020-01-01T00:00:00Z',
    modified: '2020-06-01T00:00:00Z',
    '1.0.0': '2020-01-01T00:00:00Z',
    '1.2.0': '2020-06-01T00:00:00Z'
  },
  versions: {
    '1.2.0': { scripts: { postinstall: 'node setup.js' }, dependencies: { a: '1' }, dist: { signatures: [{ sig: 'x' }], unpackedSize: 1000 } }
  }
};

const reg = assessRegistry(packument, NOW);
assert.equal(reg.latest, '1.2.0');
assert.equal(reg.maintainerCount, 1);
assert.equal(reg.license, 'MIT');
assert.deepEqual(reg.repo, { owner: 'acme', repo: 'demo' });
assert.deepEqual(reg.installScripts, ['postinstall']);
assert.equal(reg.releaseCount, 2);
assert.equal(reg.directDependencyCount, 1);
assert.equal(reg.signed, true);
assert.ok(reg.daysSinceLastRelease > 365);

assert.deepEqual(assessVulns({ vulns: [{ id: 'GHSA-1' }, { id: 'GHSA-2' }] }), { count: 2, ids: ['GHSA-1', 'GHSA-2'] });
assert.deepEqual(assessVulns({}), { count: 0, ids: [] });

assert.deepEqual(
  assessProject({ starsCount: 100, forksCount: 10, openIssuesCount: 5, scorecard: { overallScore: 7.2 } }),
  { stars: 100, forks: 10, openIssues: 5, scorecard: 7.2 }
);

const signals = {
  registry: reg,
  downloads: 12345,
  vulns: { count: 1, ids: ['GHSA-1'] },
  project: { stars: 100, forks: 10, openIssues: 5, scorecard: 3 },
  provenance: false
};
const { flags, good, verdict } = summarize(signals);
assert.ok(flags.some(f => /Bus factor/.test(f)));
assert.ok(flags.some(f => /No release in/.test(f)));
assert.ok(flags.some(f => /install scripts/.test(f)));
assert.ok(flags.some(f => /known vulnerabilit/.test(f)));
assert.ok(flags.some(f => /Low OpenSSF Scorecard/.test(f)));
assert.ok(flags.some(f => /provenance/.test(f)));
assert.ok(good.some(g => /License: MIT/.test(g)));
assert.match(verdict, /strongly reconsider/);

const report = formatReport('demo', signals);
assert.match(report, /^# Dependency report: demo/m);
assert.match(report, /⚠/);
assert.match(report, /## Verdict/);

// A clean package produces no flags.
const clean = summarize({
  registry: assessRegistry({
    name: 'good', 'dist-tags': { latest: '2.0.0' }, maintainers: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    license: 'Apache-2.0', repository: { url: 'https://github.com/o/good' },
    time: { created: '2021-12-01T00:00:00Z', modified: '2021-12-15T00:00:00Z', '2.0.0': '2021-12-15T00:00:00Z' },
    versions: { '2.0.0': { dependencies: {}, dist: { signatures: [{ s: 1 }] } } }
  }, NOW),
  downloads: 9999999,
  vulns: { count: 0, ids: [] },
  project: { scorecard: 8 },
  provenance: true
});
assert.deepEqual(clean.flags, []);
assert.match(clean.verdict, /No automated red flags/);

console.log('dependency-report tests passed');
