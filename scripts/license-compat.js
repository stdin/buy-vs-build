#!/usr/bin/env node
// Coarse, dependency-free license-compatibility heuristic.
//
// This is deliberately NOT a real SPDX expression solver — that is nuanced,
// fast-moving legal tooling we should not own or pretend to be (build-in-house
// only when the work is core; this is not). It catches the one high-signal case
// an agent otherwise sails past: pulling copyleft code into a permissive or
// proprietary project. Categories are intentionally broad, the output always
// says "review," not "verdict," and the strongest move is to surface the flag,
// not adjudicate it. Pure functions only; zero dependencies.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Order matters: the first matching category wins, so the more-restrictive
// families are tested before the permissive catch-all.
const CATEGORIES = [
  ['public-domain', [/^cc0/i, /^unlicense$/i, /^0bsd$/i, /public[\s-]?domain/i, /^wtfpl/i]],
  ['network-copyleft', [/agpl/i]],
  ['weak-copyleft', [/lgpl/i, /\bmpl\b/i, /mozilla public/i, /\bepl\b/i, /eclipse public/i, /\bcddl\b/i, /ms-?pl/i]],
  // GPL but not LGPL (the [^l] / ^ guard keeps "LGPL" out of this bucket).
  ['strong-copyleft', [/(^|[^l])gpl/i]],
  ['permissive', [/\bmit\b/i, /^isc$/i, /bsd/i, /apache/i, /zlib/i, /^python-2/i, /^psf/i, /boost/i, /^artistic/i, /^bsl/i]]
];

function categorizeLicense(license) {
  if (!license || typeof license !== 'string') return 'unknown';
  const value = license.trim();
  if (!value || /^(see |unknown|none|noassertion|other\b|custom\b|proprietary\b)/i.test(value)) {
    return /^proprietary/i.test(value) ? 'proprietary' : 'unknown';
  }
  for (const [category, patterns] of CATEGORIES) {
    if (patterns.some(re => re.test(value))) return category;
  }
  return 'unknown';
}

// projectLicense / depLicense are raw strings (e.g. "MIT", "GPL-3.0-or-later").
// Returns { level: 'ok' | 'review' | 'warn', dep, project, reason }.
function assessLicenseCompat(projectLicense, depLicense) {
  const dep = categorizeLicense(depLicense);
  const project = categorizeLicense(projectLicense);
  const depName = depLicense ? String(depLicense).trim() : 'none detected';

  if (dep === 'unknown') {
    return { level: 'review', dep, project, reason: `Dependency license is unclear (${depName}); confirm it before you ship.` };
  }
  if (dep === 'public-domain' || dep === 'permissive') {
    return { level: 'ok', dep, project, reason: `Permissive dependency license (${depName}).` };
  }

  // Treat an undeclared / unknown / permissive project license as the worst case
  // for the dependency direction: copyleft flowing into code you may distribute.
  const projectIsRestrictive = project === 'strong-copyleft' || project === 'network-copyleft';
  const projDesc = projectLicense ? `${String(projectLicense).trim()} ` : 'permissive/proprietary ';

  if (dep === 'network-copyleft') {
    return {
      level: 'warn', dep, project,
      reason: `${depName} is network copyleft (AGPL): using it can require publishing your source even for hosted/SaaS use. Review before adopting.`
    };
  }
  if (dep === 'strong-copyleft') {
    if (projectIsRestrictive) {
      return { level: 'ok', dep, project, reason: `Project and dependency are both GPL-family (${depName}).` };
    }
    return {
      level: 'warn', dep, project,
      reason: `${depName} is strong copyleft (GPL): combining it into a ${projDesc}project can force the whole work under the GPL. Review before adopting.`
    };
  }
  // weak-copyleft (LGPL / MPL / EPL / CDDL)
  if (projectIsRestrictive) {
    return { level: 'ok', dep, project, reason: `${depName} weak copyleft is compatible with a copyleft project.` };
  }
  return {
    level: 'review', dep, project,
    reason: `${depName} is weak copyleft (LGPL/MPL/EPL): usually fine when used unmodified and dynamically linked, but modifying its files carries obligations. Confirm your usage.`
  };
}

// Best-effort read of the *project's* declared license from common manifests.
function detectProjectLicense(cwd) {
  const dir = cwd || process.cwd();

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    if (typeof pkg.license === 'string' && pkg.license.trim()) return pkg.license.trim();
    if (pkg.license && typeof pkg.license === 'object' && pkg.license.type) return String(pkg.license.type);
  } catch (_error) { /* no package.json or unreadable */ }

  try {
    const toml = fs.readFileSync(path.join(dir, 'pyproject.toml'), 'utf8');
    const m = toml.match(/^\s*license\s*=\s*["']([^"']+)["']/m) ||
      toml.match(/license\s*=\s*\{[^}]*text\s*=\s*["']([^"']+)["']/);
    if (m) return m[1];
  } catch (_error) { /* no pyproject */ }

  try {
    const cargo = fs.readFileSync(path.join(dir, 'Cargo.toml'), 'utf8');
    const m = cargo.match(/^\s*license\s*=\s*["']([^"']+)["']/m);
    if (m) return m[1];
  } catch (_error) { /* no Cargo.toml */ }

  return null;
}

const ICON = { ok: '✅', review: '⚠', warn: '🚫' };

function formatCompat(compat) {
  if (!compat) return null;
  return `${ICON[compat.level] || '•'} License: ${compat.reason}`;
}

module.exports = { categorizeLicense, assessLicenseCompat, detectProjectLicense, formatCompat };
