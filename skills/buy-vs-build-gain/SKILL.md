---
name: buy-vs-build-gain
description: Use when summarizing Buy vs Build benchmark cases, behavior measurements, expected impact, release notes, or evidence that the ruleset reduces unnecessary code, dependencies, cost, or ownership risk.
---

# Buy vs Build Gain

Summarize impact from benchmark data without overstating it. Distinguish measured local overhead from behavior benchmarks that still need agent runs.

## Workflow

1. Read `benchmarks/behavior-cases.json` for behavioral test cases.
2. Run `npm run benchmark` for local instruction and hook overhead.
3. If agent-run results exist, report LOC, files changed, dependencies added, decision-note quality, time, token/cost data, and safety regressions.
4. If only cases exist, call them a benchmark plan, not measured impact.

## Output

Use this shape:

```text
Measured
- <metric>: <value>

Behavior cases
- <case>: expected rung <rung>; baseline risk <risk>

Limitations
- <what has not been measured yet>
```

Never claim the ruleset reduces LOC, cost, or time until a baseline-vs-enabled agent run has actually been measured.
