---
name: buy-vs-build-review
description: Use when reviewing a code diff, pull request, or local changes for buy-vs-build mistakes, avoidable custom code, unnecessary dependencies, missed built-ins, missed platform features, or weak decision notes.
---

# Buy vs Build Review

Review the diff for ownership choices, not just correctness. Prefer findings that reduce risk, code, dependencies, or vendor lock-in without weakening safety.

## Workflow

1. Inspect changed files and dependency manifests.
2. Flag custom code that a built-in, native platform feature, already-installed dependency, mature open source package, or commercial service should replace.
3. Flag new dependencies or services that duplicate built-ins, installed packages, or tiny clear code.
4. **Check that the choice was implemented well, not just chosen well.** The right rung integrated badly is still a finding: a wrapper that re-does the work the dependency already does, an SSE/WebSocket/queue added without handling its real failure modes (reconnect, retry, backpressure, idempotency), or a "reuse" that grew more glue code than it removed. Confirm the change actually cut code, failure modes, and operating burden.
5. Preserve safety boundaries: validation, security, privacy, accessibility, observability, and explicit requirements.
6. **Judge the decision note as the reviewable artifact.** Where the diff makes a non-obvious or hard-to-reverse choice, the note (in the PR body or a `docs/decisions/` ADR) should name the distinguishing requirement, the rejected option, and a revisit trigger. A missing or vague note is itself a finding — it is often the most valuable thing in the change, because it is what makes the tradeoff reviewable later.
7. Report findings first, ordered by severity, with file references when possible.

## Output

Use this shape:

```text
Findings
- [severity] file:line - Issue. Better option: <rung>. Tradeoff: <why>.

Integration
- [severity] file:line - Right option, but: <unused capability / unhandled failure mode / glue code that outweighs the reuse>.

Decision gaps
- Missing or vague decision note for <choice> — name the distinguishing requirement, rejected option, and revisit trigger.
```

If there are no issues, say so and list any residual dependency or ownership risks.
