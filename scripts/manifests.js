#!/usr/bin/env node
// Minimal, dependency-free dependency-name extractors for common manifests.
//
// We only need dependency *names* — to detect what a change adds (pr-review) and
// to enumerate what a repo already owns (audit-deps). So this does targeted
// extraction, not full TOML/YAML parsing: a complete parser would be a dependency
// we'd then own, which is exactly what this project argues against (built-in /
// tiny-clear-code over a library for a small, stable need). Unknown or malformed
// input yields [] — these helpers never throw.
'use strict';

// PEP 503 normalization so "Flask_Foo", "flask.foo", and "flask-foo" compare equal.
function normalizePypi(name) {
  return String(name).trim().toLowerCase().replace(/[-_.]+/g, '-');
}

// "requests[security]>=2.0 ; python_version<'3.9'" -> "requests"
function requirementName(spec) {
  const s = String(spec).trim();
  if (!s || s.startsWith('#')) return null;
  const m = s.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
  return m ? normalizePypi(m[1]) : null;
}

function parsePackageJson(text) {
  let pkg;
  try { pkg = JSON.parse(text); } catch (_error) { return []; }
  if (!pkg || typeof pkg !== 'object') return [];
  const merged = Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies, pkg.peerDependencies);
  return Object.keys(merged).map(name => ({ ecosystem: 'npm', name }));
}

function parsePackageLock(text) {
  let lock;
  try { lock = JSON.parse(text); } catch (_error) { return []; }
  const rootPackage = lock && lock.packages && lock.packages[''];
  if (rootPackage && typeof rootPackage === 'object') {
    const merged = Object.assign(
      {},
      rootPackage.dependencies,
      rootPackage.devDependencies,
      rootPackage.optionalDependencies,
      rootPackage.peerDependencies
    );
    return Object.keys(merged).map(name => ({ ecosystem: 'npm', name }));
  }
  return [];
}

function parseRequirementsTxt(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^--?/.test(line) && !/^-[ec]\s+/.test(line)) continue; // skip -r/--hash/etc.
    const editable = line.match(/^-[ec]\s+.+?#egg=([A-Za-z0-9._-]+)/);
    const name = editable ? normalizePypi(editable[1]) : requirementName(line);
    if (name) out.push({ ecosystem: 'pypi', name });
  }
  return out;
}

function parsePyproject(text) {
  const names = new Set();
  const addStrings = (chunk) => {
    for (const m of String(chunk).matchAll(/["']([^"']+)["']/g)) {
      const n = requirementName(m[1]);
      if (n) names.add(n);
    }
  };
  let section = '';
  let arrayBuf = null; // accumulating a multi-line dependency array
  for (const raw of String(text).split(/\r?\n/)) {
    if (arrayBuf !== null) {
      const end = raw.indexOf(']');
      arrayBuf += ' ' + (end === -1 ? raw : raw.slice(0, end));
      if (end !== -1) { addStrings(arrayBuf); arrayBuf = null; }
      continue;
    }
    const header = raw.match(/^\s*\[([^\]]+)\]/);
    if (header) { section = header[1].trim(); continue; }
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // PEP 621: [project] dependencies = [...] and [project.optional-dependencies] groups
    const isProjectDeps = section === 'project' && /^dependencies\s*=/.test(line);
    const isOptionalDeps = section === 'project.optional-dependencies' && /=\s*\[/.test(line);
    if (isProjectDeps || isOptionalDeps) {
      const start = raw.indexOf('[');
      const end = raw.indexOf(']', start + 1);
      if (start !== -1 && end !== -1) addStrings(raw.slice(start + 1, end));
      else if (start !== -1) arrayBuf = raw.slice(start + 1);
      continue;
    }

    // Poetry: [tool.poetry.dependencies], dev-dependencies, group.<name>.dependencies
    if (/^tool\.poetry\.(dependencies|dev-dependencies)$/.test(section) ||
        /^tool\.poetry\.group\..+\.dependencies$/.test(section)) {
      const m = line.match(/^([A-Za-z0-9._-]+)\s*=/);
      if (m && m[1].toLowerCase() !== 'python') names.add(normalizePypi(m[1]));
    }
  }
  return [...names].map(name => ({ ecosystem: 'pypi', name }));
}

function parseGoMod(text) {
  const out = [];
  let inRequire = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    if (!inRequire && /^require\s*\(/.test(line)) { inRequire = true; continue; }
    if (inRequire && line.startsWith(')')) { inRequire = false; continue; }
    let body = line;
    if (!inRequire) {
      const m = line.match(/^require\s+(.+)$/);
      if (!m) continue;
      body = m[1];
    }
    const indirect = /\/\/\s*indirect/.test(body);
    const parts = body.replace(/\/\/.*$/, '').trim().split(/\s+/);
    if (parts.length >= 2 && parts[0]) out.push({ ecosystem: 'go', name: parts[0], indirect });
  }
  return out;
}

function parseCargo(text) {
  const names = new Set();
  const aliases = new Map();
  let inDepsTable = false;
  const DEPS_TABLE = /(?:^|\.)(?:dev-|build-)?dependencies$/;
  const DEPS_SUBTABLE = /(?:^|\.)(?:dev-|build-)?dependencies\.([A-Za-z0-9._+-]+)$/;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const header = line.match(/^\[([^\]]+)\]/);
    if (header) {
      const section = header[1].trim();
      const sub = section.match(DEPS_SUBTABLE);
      if (sub) { names.add(sub[1]); inDepsTable = false; }
      else inDepsTable = DEPS_TABLE.test(section);
      continue;
    }
    if (inDepsTable) {
      const m = line.match(/^([A-Za-z0-9._+-]+)\s*=/);
      if (m) {
        const packageName = line.match(/\bpackage\s*=\s*["']([^"']+)["']/);
        if (packageName) aliases.set(m[1], packageName[1]);
        else names.add(m[1]);
      }
    }
  }
  for (const actual of aliases.values()) names.add(actual);
  return [...names].map(name => ({ ecosystem: 'cargo', name }));
}

function parseGemfile(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^gem\s+["']([^"']+)["']/);
    if (m) out.push({ ecosystem: 'rubygems', name: m[1] });
  }
  return out;
}

function unescapeXml(text) {
  return String(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parsePomXml(text) {
  const out = [];
  const body = String(text).replace(/<dependencyManagement\b[\s\S]*?<\/dependencyManagement>/gi, '');
  for (const dep of body.matchAll(/<dependency\b[\s\S]*?<\/dependency>/gi)) {
    const chunk = dep[0];
    const group = chunk.match(/<groupId>\s*([^<]+?)\s*<\/groupId>/i);
    const artifact = chunk.match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/i);
    if (group && artifact) out.push({ ecosystem: 'maven', name: `${unescapeXml(group[1])}:${unescapeXml(artifact[1])}` });
  }
  return out;
}

function parseDotnetProject(text) {
  const out = [];
  for (const ref of String(text).matchAll(/<PackageReference\b[^>]*(?:Include|Update)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    out.push({ ecosystem: 'nuget', name: unescapeXml(ref[1]) });
  }
  return out;
}

// filename (basename) -> parser
const MANIFESTS = {
  'package.json': parsePackageJson,
  'package-lock.json': parsePackageLock,
  'npm-shrinkwrap.json': parsePackageLock,
  'requirements.txt': parseRequirementsTxt,
  'pyproject.toml': parsePyproject,
  'go.mod': parseGoMod,
  'Cargo.toml': parseCargo,
  'Gemfile': parseGemfile,
  'pom.xml': parsePomXml
};

function basename(file) {
  return String(file).split(/[\\/]/).pop();
}

function manifestParserFor(file) {
  const base = basename(file);
  if (/\.(csproj|fsproj|vbproj)$/i.test(base)) return parseDotnetProject;
  return MANIFESTS[base] || null;
}

function isManifest(file) {
  return Boolean(manifestParserFor(file));
}

function parseManifest(file, text) {
  const parse = manifestParserFor(file);
  if (!parse) return [];
  try { return parse(text || ''); } catch (_error) { return []; }
}

function depKey(dep) {
  return `${dep.ecosystem}:${dep.name}`;
}

function dedupeDeps(list) {
  const seen = new Set();
  const out = [];
  for (const dep of list) {
    if (seen.has(depKey(dep))) continue;
    seen.add(depKey(dep));
    out.push(dep);
  }
  return out;
}

// Added = present in `after`, absent in `before`, keyed by ecosystem:name.
function addedFromManifest(file, beforeText, afterText) {
  const before = new Set(parseManifest(file, beforeText).map(depKey));
  return parseManifest(file, afterText).filter(dep => !before.has(depKey(dep)));
}

module.exports = {
  normalizePypi,
  requirementName,
  parsePackageJson,
  parsePackageLock,
  parseRequirementsTxt,
  parsePyproject,
  parseGoMod,
  parseCargo,
  parseGemfile,
  parsePomXml,
  parseDotnetProject,
  MANIFESTS,
  basename,
  manifestParserFor,
  isManifest,
  parseManifest,
  depKey,
  dedupeDeps,
  addedFromManifest
};
