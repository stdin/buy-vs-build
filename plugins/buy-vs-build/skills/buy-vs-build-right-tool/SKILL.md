---
name: buy-vs-build-right-tool
description: Use when choosing between options at the same ownership rung — a transport, API style, data store, job/async mechanism, integration pattern, or cache — and you want the one that fits the requirement's real shape (directionality, volume, latency, consistency, failure mode) rather than the most powerful, popular, or familiar default.
---

# Buy vs Build — Pick the Right Option, Not the Obvious One

The buy-vs-build ladder picks an *ownership level*; it does not pick *which* option at that level. When several options satisfy the rung, the flashy, popular, or familiar one is often wrong: it adds capability you never use and ownership you keep paying for. This is the reference for that second decision.

Reach for this when the choice is non-obvious or a one-way door. When it is obvious, just decide and keep moving.

## Find the distinguishing requirement first

Name the one property that actually separates the options, then pick the option that fits it — nothing more:

- **Directionality** — one-way vs bidirectional; push vs pull; who initiates.
- **Volume & latency** — events per second, payload size, tail-latency budget.
- **Consistency & ordering** — transactional vs eventual; exactly-once vs at-least-once; ordered vs not.
- **Durability & delivery** — can a message be dropped, or must it survive a crash and retry?
- **Failure mode** — reconnect, backpressure, replay, idempotency, partial failure.
- **Operational fit** — what your runtime, proxies, clients, and infra already support and can debug.

If two options tie on the distinguishing requirement, pick the one with less long-term ownership (less infra to run, less API surface, easier to remove).

## Decision tables

The middle column is the common over-reach. The "Fitting default" is the lower-ownership option that usually wins. Use the heavier option only when its extra capability is *actually exercised* — the right-hand column says when.

### Realtime / transport (server↔client)

| You need | Common over-reach | Fitting default | Use the heavier option when |
| --- | --- | --- | --- |
| Server→client stream: feeds, notifications, progress, token streaming | WebSockets | **Server-Sent Events** (plain HTTP, auto-reconnect) | The client must also send a steady high-rate stream back — true full-duplex. |
| Bidirectional, low-latency: chat, collaboration, multiplayer, live cursors | Polling / SSE | **WebSockets** | (this *is* the case the heavier option is for) |
| Occasional client→server nudges | WebSockets | **`fetch` / HTTP request** | You measured per-request overhead and it actually hurts. |
| Browser ↔ browser media/data, low latency | WebSockets relay | **WebRTC** | Peer-to-peer NAT traversal and media are the requirement. |

### Service ↔ service integration

| You need | Common over-reach | Fitting default | Use the heavier option when |
| --- | --- | --- | --- |
| "Tell me when X happens" across services | Polling loop | **Webhook / event** | The receiver can't accept inbound calls; then poll on a sane interval. |
| Internal RPC between two services you own | GraphQL | **REST or gRPC** | Many clients with widely divergent field needs — GraphQL's flexibility is used. |
| One public API, many client shapes | Many bespoke REST endpoints | **GraphQL** | Clients are few and stable — REST is less to own. |
| High-throughput, typed, streaming RPC | REST + JSON | **gRPC** | Cross-language contracts and streaming are real needs. |

### Data storage

| You need | Common over-reach | Fitting default | Use the heavier option when |
| --- | --- | --- | --- |
| Relational data with joins and transactions | NoSQL "for scale" | **SQL / relational** | A document/wide-column access pattern genuinely dominates and you've outgrown SQL. |
| A bit of JSON next to relational rows | A second NoSQL store | **`JSONB` / native JSON column** | Document volume and query needs justify a dedicated store. |
| Cache / ephemeral counters / rate limits | Redis cluster (day one) | **In-process cache / DB row** | Multi-instance shared state or persistence across restarts is required. |
| Full-text search | Elasticsearch | **DB full-text (`tsvector`, FTS5)** | Relevance tuning, facets, and scale exceed the DB's built-in search. |
| Time-ordered events | New time-series database | **Indexed table by timestamp** | Ingest rate / retention math actually needs a TSDB. |

### Jobs, scheduling & async

| You need | Common over-reach | Fitting default | Use the heavier option when |
| --- | --- | --- | --- |
| One periodic job | Queue + broker + worker fleet | **Cron / scheduled task** | Work must fan out, retry with backoff, or survive partial failure. |
| Decouple a slow step from the request | Kafka | **DB-backed queue / managed queue (SQS)** | Event volume, replay, and multiple consumers justify a log. |
| Multi-step workflow with retries & state | Hand-rolled state machine + cron | **Durable workflow engine** (Temporal, Step Functions) | The flow is one or two steps — keep it inline. |
| Event stream many consumers replay | Database table polled by all | **Log / streaming platform (Kafka)** | One consumer, low volume — a queue or table is enough. |

### Identity, time, money, text

| You need | Common over-reach | Fitting default | Use the heavier option when |
| --- | --- | --- | --- |
| Login / auth | Hand-rolled OAuth/session crypto | **Platform auth / mature provider** | Never hand-roll trust-boundary crypto; this is reuse-always. |
| Unique IDs | `uuid` dependency | **`crypto.randomUUID()` / DB default** | You need sortable/k-ordered IDs (ULID) — then a tiny lib. |
| Dates & time math | Custom date arithmetic | **`Intl` / `Temporal` / stdlib** | Heavy tz/recurrence rules — a maintained lib beats DIY. |
| Money | Floats | **Integer minor units / decimal type** | (floats are simply the wrong tool here) |
| Simple string work | `lodash`/`left-pad`-style import | **`String.prototype` / built-ins** | The operation is genuinely non-trivial (Unicode segmentation, etc.). |

## The trap, named

The over-reach almost always justifies itself with a hypothetical: *"for scale," "we might need it later," "it's the industry standard."* If the distinguishing requirement isn't present **today**, the extra capability is pure ownership cost — infra to run, an API to learn, a thing to debug at 3am, a one-way door to walk back through. Defer it until the requirement is real (`do-nothing` is rung 1 for a reason).

## Write it down

Record a non-obvious choice so the next person sees the tradeoff (this note is often the most valuable artifact — it makes the decision reviewable):

```text
Decision: use native-platform: Server-Sent Events. Tradeoff: one-way HTTP stream with auto-reconnect, no socket infra to run. Rejected: WebSockets because the feed is server→client only and full-duplex is unused. Revisit if the client needs to push a high-rate stream back.
```

Name the distinguishing requirement, and say why the more powerful or more popular option was rejected. For a one-way door, add an exit plan. Capture it durably with `$buy-vs-build-adr`, and surface it again later with `node scripts/revisit.js`. For the full ladder and classification, see `$buy-vs-build`.
