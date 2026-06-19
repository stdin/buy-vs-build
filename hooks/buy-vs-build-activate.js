#!/usr/bin/env node
const { getBuyVsBuildInstructions } = require('./buy-vs-build-instructions');

function writeHookOutput(context) {
  const output = {
    systemMessage: 'BUY-VS-BUILD:ACTIVE',
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context
    }
  };

  process.stdout.write(JSON.stringify(output));
}

writeHookOutput(getBuyVsBuildInstructions());
