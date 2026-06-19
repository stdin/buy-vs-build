---
name: buy-vs-build-decision
description: Use when choosing between built-ins, standard libraries, native platform features, installed packages, open source libraries, commercial products, or in-house implementation for a feature or technical design.
---

# Buy vs Build Decision

Make the smallest useful decision memo. The goal is clarity, not ceremony.

## Workflow

1. State the requirement and constraints.
2. Classify it: core (differentiation) or context, and commodity (stable) or novel. Reuse context and commodity work; reserve in-house for core, novel work.
3. Walk the ladder: do nothing, built-in, native platform, installed dependency, open source, commercial, in-house.
4. Compare fit, total cost of ownership, security, licensing, maintenance, integration, maturity, reversibility, and exit risk.
5. Choose the lowest-ownership option that satisfies the constraints. For hard-to-reverse (one-way-door) choices, demand more scrutiny and an exit plan.
6. Name the trigger that would justify revisiting the decision.

## Output

Use this format:

```text
Decision: use <option/rung>.
Why: <one or two sentences on the winning tradeoff>.
Rejected: <main alternative> because <constraint>.
Revisit if: <specific trigger>.
```

If building in-house, name the reuse option that failed and the constraint it failed. If adding a dependency or service, name the built-in or installed option that was insufficient.
