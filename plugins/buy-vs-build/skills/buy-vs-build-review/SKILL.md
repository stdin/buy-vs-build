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
4. Preserve safety boundaries: validation, security, privacy, accessibility, observability, and explicit requirements.
5. Report findings first, ordered by severity, with file references when possible.

## Output

Use this shape:

```text
Findings
- [severity] file:line - Issue. Better option: <rung>. Tradeoff: <why>.

Decision gaps
- Missing decision note for <choice>.
```

If there are no issues, say so and list any residual dependency or ownership risks.
