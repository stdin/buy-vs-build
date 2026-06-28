# Behavior Benchmarks

`behavior-cases.json` lists tasks where buy-vs-build guidance should change agent behavior.

Latest recorded live run:

- Report: `results/behavior-claude-2026-06-19T10-23-39-792Z.md`
- Agent: Claude Code `2.1.183`, model `claude-haiku-4-5`
- Cases: `13` (overbuild traps + right-tool traps + built-in-over-dependency)
- Baseline score: `33/65`
- Enabled score: `55/65` (delta `+22`)
- Correct rung/option hits: `11/13 -> 12/13`
- The benchmark runs on a small model on purpose: the rule's lift is clearest there and runs stay cheap. The default model is `haiku`; override with `--model`. For quality-aware scoring instead of keyword matching, add `--judge`.

The Codex harness (`npm run benchmark:behavior`) and the Claude harness (`npm run benchmark:behavior:claude`) run the same cases, prompts, and scoring; they differ only in which agent answers and how the rule is injected.

`npm run benchmark:behavior:gate` runs the Codex harness in dry mode with score
thresholds and no result files. It is included in `npm test` as a regression
check for rule and scoring changes.

Recommended scoring for each baseline and enabled run:

- Files changed
- Lines added/deleted
- Dependencies added or removed
- Decision note quality
- Correct rung selected
- Safety regressions
- Time, tokens, and cost when available

Do not report LOC, cost, or time gains until the same task has been run both with and without Buy vs Build on real code changes. The current behavior benchmark scores final recommendations and decision-note quality.
