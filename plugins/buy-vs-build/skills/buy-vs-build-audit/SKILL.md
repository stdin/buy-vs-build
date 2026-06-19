---
name: buy-vs-build-audit
description: Use when auditing a repository or subsystem for avoidable in-house implementations, unnecessary dependencies, duplicated platform features, vendor lock-in, maintenance burden, or unclear buy-vs-build ownership decisions.
---

# Buy vs Build Audit

Audit the repository for ownership choices that deserve a second look. This is broader than a diff review: scan dependencies, common utilities, integration code, and high-maintenance subsystems.

## Workflow

1. Inspect dependency manifests and major source directories.
2. Find custom implementations in standardized domains: dates, parsing, auth, crypto, queues, retries, validation, file formats, email, payments, observability, and search.
3. Find dependencies that duplicate built-ins, native platform features, installed packages, or small clear code.
4. Separate "fix now" from "watch later"; churn without payoff is not an improvement.
5. Preserve safety boundaries: validation, security, privacy, accessibility, observability, and explicit requirements.

## Output

Group results by action:

- **Replace with reuse**: custom code that should move to a built-in, platform feature, library, or service.
- **Keep in-house**: code that is core, small, constrained, or safer to own.
- **Remove dependency**: dependency that does not earn its ownership cost.
- **Needs decision note**: unclear tradeoffs requiring maintainer input.

For each item, include the likely rung, owner impact, and migration risk.
