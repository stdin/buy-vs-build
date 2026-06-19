---
name: buy-vs-build-adr
description: Use when a non-obvious buy-vs-build decision was just made and should be recorded durably, or when a project keeps a docs/decisions/ log of Architecture Decision Records (ADRs) for build/buy/reuse and dependency choices.
---

# Buy vs Build ADR

Capture non-obvious buy-vs-build decisions as Architecture Decision Records so the reasoning — and the trigger to revisit it — survives the pull request.

## When to record

Record an ADR when a decision is non-obvious or hard to reverse:

- Adding or removing a dependency.
- Choosing a commercial service over owning a capability.
- Building something in-house.
- Picking one technical option over a comparable one (for example, Server-Sent Events over WebSockets).

Skip it for obvious, trivial, easily reversible choices. An ADR is a few sentences, not an essay — it mirrors the one-line decision note the rule already produces, just durable and reviewable.

## How to record

ADRs live in `docs/decisions/`, numbered sequentially as `NNNN-title.md`. Use the next free number. Either run the helper:

```bash
node scripts/record-decision.js \
  --title "Use Server-Sent Events for the live feed" \
  --rung native-platform \
  --decision "Stream updates with SSE over HTTP." \
  --rejected "WebSockets, because the feed is one-way and full-duplex is unused." \
  --revisit "the feed needs bidirectional messaging."
```

…or, if no helper is available, create `docs/decisions/NNNN-title.md` by hand with this shape:

```markdown
# NNNN. <title>

- Status: Accepted
- Date: <YYYY-MM-DD>
- Rung: <do-nothing|built-in|native-platform|installed-dependency|open-source|commercial|in-house>

## Context

<requirement and constraints>

## Decision

<the option chosen>

**Tradeoff:** <why it wins>
**Rejected:** <next-best option> because <constraint>

## Consequences

Revisit if <specific trigger>.
```
