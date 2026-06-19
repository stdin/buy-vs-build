---
name: buy-vs-build
description: Use when coding, designing an implementation, choosing dependencies, adding features, reviewing diffs for custom code, evaluating whether to use built-ins, standard libraries, native platform features, installed packages, open source libraries, commercial services, or an in-house implementation.
---

# Buy vs Build

Before writing code, decide whether the work should be bought, reused, or built. The best choice is the lowest-ownership option that satisfies the real constraints.

## Classify First

Two questions set the strategy before you touch the ladder:

- **Core or context?** Core is the differentiation users choose you for. Context is everything they expect but never reward you for (auth, email, parsing, config). Build core; reuse context. (Moore's core-vs-context.)
- **Commodity or novel?** A commodity capability is standardized, stable, and well understood. A novel one is still changing or specific to you. Reuse commodities; build novelty. (Wardley evolution: only the genesis/custom end is worth owning.)

| | Commodity | Novel |
| --- | --- | --- |
| **Core** | Reuse the commodity substrate, build the thin layer that differentiates. | Build in-house. This is the moat — own it. |
| **Context** | Reuse aggressively: built-in, platform, dependency, or commercial. | Do the minimum: defer, stub, or use the simplest reuse that unblocks you. |

Then match effort to **reversibility**. A two-way door (easy to swap out or delete later) deserves a fast decision. A one-way door (a deep platform, data-format, or vendor commitment that is expensive to undo) deserves real scrutiny and a written exit plan before you walk through it.

## The Gate

Run this before non-trivial implementation:

1. **Do nothing**: skip speculative requirements and scaffolding.
2. **Use built-ins**: prefer language built-ins and the standard library.
3. **Use the native platform**: prefer browser controls, OS features, database constraints, framework primitives, cloud primitives, and protocol features.
4. **Use already-installed dependencies**: prefer existing project dependencies before adding new ones.
5. **Use open source**: add a mature library when it clearly lowers total cost of ownership.
6. **Use commercial**: use a paid service/product when buying reliability, compliance, operations, support, or time is cheaper than owning it.
7. **Build in-house only when** the options above fail the constraints, or the work is core differentiation.

Stop at the first rung that works. If two options work, choose the one with less long-term ownership unless it weakens correctness, safety, or user experience.

## Tradeoff Check

For every non-obvious choice, compare:

| Factor | Questions |
| --- | --- |
| Fit | Does it meet the actual requirement without awkward workarounds? |
| Ownership | Who debugs, upgrades, operates, and documents it? |
| Total cost of ownership | What is the lifetime cost — license, usage, hosting, migration, and engineer-time — not just the sticker price? |
| Risk | What are security, privacy, compliance, supply-chain, and vendor-lock risks? |
| Integration | Does it match the repo's stack, deployment model, and failure modes? |
| Maturity | Is it maintained, tested, documented, and used by credible teams? |
| Reversibility | How hard is it to undo? Two-way doors decide fast; one-way doors need an exit plan. |
| exit risk | Can the team replace it if price, license, quality, or availability changes? |

Use current docs or package metadata when the choice depends on a library, service, license, pricing, API, or version.

## Build In-House When

- The behavior is core product differentiation.
- The code is smaller and clearer than the dependency.
- Existing options fail security, privacy, regulatory, licensing, latency, offline, portability, or data-residency constraints.
- The dependency would become a hard-to-remove platform commitment.
- The team already owns adjacent code and the incremental surface is small.
- The requirement is stable enough to implement directly and test well.

## Prefer Reuse When

- The domain is standardized: dates, parsing, crypto, auth protocols, accessibility widgets, file formats, payments, observability, search, queues, schedulers, retries, rate limits, serialization, validation, or database migrations.
- Correctness requires edge-case knowledge the team should not rediscover.
- Operations, compliance, support, uptime, or ecosystem integrations matter more than custom control.
- The project already has a proven dependency that covers the need.

## Never Outsource Blindly

Never add a dependency or service just because it exists. Avoid reuse when it adds more API surface than the task, duplicates a built-in, hides critical behavior, weakens security, blocks local development, or creates avoidable vendor lock-in.

Never simplify away trust-boundary validation, data-loss protection, security, privacy, accessibility, observability for production operations, or explicit user requirements.

## Output

When the decision is obvious, implement directly. When it is not obvious, include a short decision note:

```text
Decision: use <rung>: <option>. Tradeoff: <why it wins>. Rejected: <next-best option> because <constraint>. Revisit if <specific trigger>.
```

If building in-house, name the rejected reuse option and the constraint it failed. If adding a dependency or service, name the built-in or installed option that was insufficient.

Use one of these rung labels exactly when writing the note: do-nothing, built-in, native-platform, installed-dependency, open-source, commercial, in-house.

## Common Mistakes

| Mistake | Correction |
| --- | --- |
| Building a custom utility before checking stdlib | Check built-ins first, then delete the utility if covered. |
| Adding a package for a tiny helper | Keep the few clear lines unless edge cases justify dependency ownership. |
| Outsourcing the thing that differentiates the product | Classify core vs context first; build the core, reuse the context around it. |
| Rejecting commercial tools by default | Compare total cost of ownership, not just subscription price. |
| Choosing a library without checking license or maintenance | Verify license, activity, docs, and ecosystem fit before adding it. |
| Walking through a one-way door at two-way-door speed | Scale scrutiny to reversibility; write an exit plan for hard-to-undo commitments. |
| Treating buy-vs-build as a meeting | Make the smallest useful decision note and keep moving. |
