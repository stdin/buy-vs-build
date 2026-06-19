---
name: buy-vs-build
description: Use when coding, designing implementations, choosing dependencies, or reviewing whether a task should use built-ins, platform features, installed packages, open source, commercial services, or in-house code.
---

# Buy vs Build

Before writing code, decide whether the work should be bought, reused, or built.

First classify it: core (differentiation) or context, and commodity (stable) or novel. Reuse context and commodity work; build in-house only where core meets novel. Scale scrutiny to reversibility.

Stop at the first rung that satisfies the requirement:

1. Do nothing.
2. Use the standard library.
3. Use the native platform.
4. Use already-installed dependencies.
5. Use mature open source.
6. Use a commercial service or product.
7. Build in-house only when reuse fails the real constraints.

For non-obvious decisions, compare fit, ownership, cost, security, licensing, maintenance, integration, maturity, and exit risk. Preserve validation, security, privacy, accessibility, observability, and explicit requirements.
