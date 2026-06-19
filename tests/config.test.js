const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  loadProjectConfig,
  renderProjectConfig,
  getProjectConfigBlock,
  CONFIG_FILENAME
} = require('../hooks/buy-vs-build-config');

// No config file -> null (the common case).
const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvb-cfg-'));
assert.equal(loadProjectConfig(emptyDir), null);
assert.equal(getProjectConfigBlock(emptyDir), null);

// A full config renders every recognized field.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvb-cfg-'));
fs.writeFileSync(path.join(dir, CONFIG_FILENAME), JSON.stringify({
  strictness: 'strict',
  priorities: ['security', 'speed'],
  preferredDependencies: ['zod'],
  bannedDependencies: ['moment'],
  alwaysBuild: ['deal scoring'],
  alwaysReuse: ['auth'],
  notes: 'SOC2 shop.'
}));
const block = getProjectConfigBlock(dir);
assert.match(block, /Project buy-vs-build policy/);
assert.match(block, /Strictness: strict/);
assert.match(block, /security, speed/);
assert.match(block, /Prefer these already-vetted dependencies.*zod/);
assert.match(block, /Do not add these dependencies: moment/);
assert.match(block, /Always build in-house.*deal scoring/);
assert.match(block, /Always reuse, never build: auth/);
assert.match(block, /Project notes: SOC2 shop\./);

// Malformed JSON is ignored, not thrown.
const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvb-cfg-'));
fs.writeFileSync(path.join(badDir, CONFIG_FILENAME), '{ not valid json');
assert.equal(loadProjectConfig(badDir), null);

// Empty or non-object config -> no block.
assert.equal(renderProjectConfig({}), null);
assert.equal(renderProjectConfig(null), null);
assert.equal(renderProjectConfig([1, 2]), null);

console.log('config tests passed');
