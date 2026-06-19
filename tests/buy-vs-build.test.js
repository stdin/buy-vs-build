const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { getBuyVsBuildInstructions } = require('../hooks/buy-vs-build-instructions');

const instructions = getBuyVsBuildInstructions();

assert.match(instructions, /BUY-VS-BUILD MODE ACTIVE/);
assert.match(instructions, /Before writing code/);
assert.match(instructions, /standard library/i);
assert.match(instructions, /native platform/i);
assert.match(instructions, /already-installed/i);
assert.match(instructions, /open source/i);
assert.match(instructions, /commercial/i);
assert.match(instructions, /Build in-house only when/i);
assert.match(instructions, /Never outsource/i);
assert.match(instructions, /security/i);
assert.match(instructions, /Decision note/i);

const hook = spawnSync(process.execPath, ['hooks/buy-vs-build-activate.js'], {
  cwd: root,
  env: {
    ...process.env,
    PLUGIN_DATA: path.join(root, '.tmp-plugin-data')
  },
  encoding: 'utf8'
});

assert.equal(hook.status, 0, hook.stderr);
const output = JSON.parse(hook.stdout);
assert.equal(output.systemMessage, 'BUY-VS-BUILD:ACTIVE');
assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
assert.match(output.hookSpecificOutput.additionalContext, /BUY-VS-BUILD MODE ACTIVE/);

console.log('buy-vs-build tests passed');
