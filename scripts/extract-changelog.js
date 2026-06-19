#!/usr/bin/env node
// Print the CHANGELOG.md section body for a given version, for release notes.
//
// We already maintain a curated CHANGELOG; extracting the relevant section is a
// dozen lines of obvious code and gives better notes than auto-generated commit
// lists — so the release workflow prefers this and falls back to GitHub's
// generated notes only when there is no section. Zero dependencies.
'use strict';

const fs = require('node:fs');

// Returns the lines between `## [<version>]` (or `## <version>`) and the next
// `## ` heading, trimmed. null if the version has no section.
function extractSection(changelog, version) {
  const lines = String(changelog).split(/\r?\n/);
  const headingRe = /^##\s+\[?([^\]\s]+)\]?/;
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingRe);
    if (!match) continue;
    if (start === -1) {
      if (match[1] === version) start = i + 1;
    } else {
      end = i;
      break;
    }
  }
  if (start === -1) return null;
  const body = lines.slice(start, end).join('\n').trim();
  return body || null;
}

if (require.main === module) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node scripts/extract-changelog.js <version> [changelog-path]');
    process.exit(1);
  }
  let text;
  try {
    text = fs.readFileSync(process.argv[3] || 'CHANGELOG.md', 'utf8');
  } catch (_error) {
    process.exit(2);
  }
  const section = extractSection(text, version);
  if (!section) process.exit(2);
  process.stdout.write(section + '\n');
}

module.exports = { extractSection };
