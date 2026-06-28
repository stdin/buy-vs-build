const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  scoreOwnershipRisk,
  suggestDrop,
  rankAudit,
  riskBand,
  formatAuditReport,
  enumerateRepoDeps
} = require('../scripts/audit-deps');

// Clean dependency: no flags -> zero risk.
const clean = { deprecated: null, daysSinceLastRelease: 10, vulnCount: 0, scorecard: 9, maintainerCount: 5, installScripts: [], directDependencyCount: 1, license: 'MIT' };
assert.equal(scoreOwnershipRisk(clean, { level: 'ok' }), 0);

// Risky dependency stacks weights and caps at 100.
const risky = { deprecated: 'use stdlib', daysSinceLastRelease: 900, vulnCount: 3, scorecard: 2, maintainerCount: 1, installScripts: ['postinstall'], directDependencyCount: 20, license: null };
const riskyScore = scoreOwnershipRisk(risky, { level: 'warn' });
assert.ok(riskyScore > 90, `expected high score, got ${riskyScore}`);
assert.ok(riskyScore <= 100);

// License warn alone is meaningful risk.
assert.ok(scoreOwnershipRisk(clean, { level: 'warn' }) >= 30);

// Suggestions prioritize the most actionable rung-drop.
assert.match(suggestDrop({ deprecated: 'x' }, null), /Deprecated/);
assert.match(suggestDrop({ vulnCount: 2 }, null), /vulnerabilit/);
assert.match(suggestDrop({}, { level: 'warn', reason: 'gpl' }), /License conflict/);
assert.match(suggestDrop({ daysSinceLastRelease: 800 }, null), /Unmaintained/);
assert.match(suggestDrop({ maintainerCount: 1, directDependencyCount: 0 }, null), /left-pad/);
assert.match(suggestDrop(clean, { level: 'ok' }), /No automated red flags/);

// riskBand thresholds.
assert.equal(riskBand(75), 'high');
assert.equal(riskBand(40), 'medium');
assert.equal(riskBand(10), 'low');
assert.equal(riskBand(0), 'clear');

// rankAudit: highest risk first, then alphabetical.
const ranked = rankAudit([
  { name: 'b', risk: 10 },
  { name: 'a', risk: 90 },
  { name: 'c', risk: 10 }
]);
assert.deepEqual(ranked.map(r => r.name), ['a', 'b', 'c']);

// formatAuditReport: summary line, per-dep rung prompt, footer.
const report = formatAuditReport([
  { name: 'gpl-lib', ecosystem: 'npm', found: true, risk: 95, flags: ['Deprecated by its author: x'], compat: { level: 'warn', reason: 'GPL into MIT' }, suggestion: 'Deprecated — remove it.' },
  { name: 'fine', ecosystem: 'npm', found: true, risk: 0, flags: [], compat: { level: 'ok', reason: 'MIT' }, suggestion: 'No automated red flags — keep.' },
  { name: 'ghost', ecosystem: 'go', found: false, risk: 0 }
], { projectLicense: 'MIT' });
assert.match(report, /# Dependency ownership audit/);
assert.match(report, /Project license: MIT/);
assert.match(report, /1 high, 0 medium, 0 low risk, 1 clear, 1 unresolved/);
assert.match(report, /gpl-lib \(npm\) — risk 95\/100/);
assert.match(report, /Could you drop a rung\?/);
assert.match(report, /ghost \(go\)/);
assert.match(report, /\$buy-vs-build-dependency/);

// enumerateRepoDeps: reads real manifests from a temp dir, dedupes across files.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvb-audit-'));
fs.writeFileSync(path.join(dir, 'package.json'), '{"dependencies":{"zod":"3"},"devDependencies":{"esbuild":"0.2"}}');
fs.writeFileSync(path.join(dir, 'requirements.txt'), 'requests>=2\nflask');
fs.writeFileSync(path.join(dir, 'App.csproj'), '<Project><ItemGroup><PackageReference Include="Newtonsoft.Json" Version="13" /></ItemGroup></Project>');
const enumerated = enumerateRepoDeps(dir, false);
assert.deepEqual(enumerated.map(d => `${d.ecosystem}:${d.name}`).sort(), ['npm:esbuild', 'npm:zod', 'nuget:Newtonsoft.Json', 'pypi:flask', 'pypi:requests']);

console.log('audit-deps tests passed');
