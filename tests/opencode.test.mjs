import assert from 'node:assert/strict';
import pluginFactory from '../.opencode/plugins/buy-vs-build.mjs';

const plugin = await pluginFactory();

assert.equal(plugin.name, 'buy-vs-build');
assert.equal(typeof plugin.config, 'function');
assert.equal(typeof plugin['experimental.chat.system.transform'], 'function');

const config = {};
await plugin.config(config);
assert.deepEqual(config.skills.paths, ['skills']);

const output = { system: [] };
await plugin['experimental.chat.system.transform']({}, output);
assert.equal(output.system.length, 1);
assert.match(output.system[0], /Buy-vs-build mode/);
assert.match(output.system[0], /Build in-house only when/);

console.log('opencode tests passed');
