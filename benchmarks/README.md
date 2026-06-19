# Behavior Benchmarks

`behavior-cases.json` lists tasks where buy-vs-build guidance should change agent behavior.

Latest recorded live run:

- Report: `results/behavior-claude-2026-06-19T08-41-23-434Z.md`
- Agent: Claude Code `2.1.183`, model `claude-opus-4-8[1m]`
- Buy vs Build version: `0.1.0`
- Baseline score: `18/30`
- Enabled score: `29/30`
- Correct rung hits: `4/6 -> 6/6`

The Codex harness (`npm run benchmark:behavior`) and the Claude harness (`npm run benchmark:behavior:claude`) run the same cases, prompts, and scoring; they differ only in which agent answers and how the rule is injected.

Recommended scoring for each baseline and enabled run:

- Files changed
- Lines added/deleted
- Dependencies added or removed
- Decision note quality
- Correct rung selected
- Safety regressions
- Time, tokens, and cost when available

Do not report LOC, cost, or time gains until the same task has been run both with and without Buy vs Build on real code changes. The current behavior benchmark scores final recommendations and decision-note quality.
