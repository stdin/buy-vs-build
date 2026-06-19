const fs = require('node:fs');
const path = require('node:path');

const skillPath = path.join(__dirname, '..', 'skills', 'buy-vs-build', 'SKILL.md');

function stripFrontmatter(markdown) {
  return String(markdown || '').replace(/^---[\s\S]*?---\s*/, '');
}

function fallbackInstructions() {
  return `BUY-VS-BUILD MODE ACTIVE

Before writing code, decide whether this should be bought, reused, or built.

## Buy-vs-build ladder

Stop at the first rung that satisfies the requirement:
1. Does this need to exist? If not, skip it.
2. Does the standard library or language built-in cover it?
3. Does a native platform feature cover it?
4. Does an already-installed dependency cover it?
5. Would a mature open source library reduce ownership risk enough to add it?
6. Would a commercial service or product better satisfy the requirement?
7. Build in-house only when reuse fails the real constraints.

## Required tradeoff check

For non-trivial code, compare fit, ownership, security, licensing, cost, maintenance, integration, performance, portability, and exit risk.

Never outsource core product differentiation, private trust-boundary logic, security-critical decisions, or tiny code that is clearer than a dependency.

Decision note: for non-obvious choices, write "Decision: use <rung>: <option>. Tradeoff: <why it wins>. Rejected: <next-best option> because <constraint>. Revisit if <specific trigger>."

Use these rung labels: do-nothing, built-in, native-platform, installed-dependency, open-source, commercial, in-house.`;
}

function getBuyVsBuildInstructions() {
  try {
    return `BUY-VS-BUILD MODE ACTIVE\n\n${stripFrontmatter(fs.readFileSync(skillPath, 'utf8'))}`;
  } catch (_error) {
    return fallbackInstructions();
  }
}

module.exports = { getBuyVsBuildInstructions };
