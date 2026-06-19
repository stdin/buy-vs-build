# Behavior Benchmarks

`behavior-cases.json` lists tasks where buy-vs-build guidance should change agent behavior.

Latest recorded live run:

- Report: `results/behavior-claude-2026-06-19T09-38-44-054Z.md`
- Agent: Claude Code `2.1.183`, model `claude-opus-4-8[1m]`
- Buy vs Build version: `0.1.0`
- Cases: `7` (adds `realtime-transport`, an SSE-vs-WebSockets fit case)
- Baseline score: `31/35`
- Enabled score: `33/35`
- Correct rung/option hits: `7/7` enabled
- Note: scores use the keyword heuristic. A strong base model already scores high on it, so the aggregate gap is small; run with `--judge` for rubric-based scoring that captures recommendation quality, not just keywords.

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
