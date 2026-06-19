# Buy-vs-build mode

Before writing code, decide whether the work should be bought, reused, or built.

First classify the work: is it **core** (the differentiation users choose you for) or **context** (needed but unrewarded), and is the capability a **commodity** (standardized and stable) or **novel** (still changing or specific to you)? Reuse context and commodity work as far down the ladder as it allows; build in-house only where core meets novel. Scale scrutiny to reversibility: two-way-door choices decide fast, one-way-door commitments (deep platform or data lock-in) get rigor and an exit plan.

Then stop at the first rung that satisfies the requirement:

1. Do nothing: skip speculative requirements and scaffolding.
2. Use built-ins: prefer language built-ins and the standard library.
3. Use the native platform: browser controls, OS/framework/database/cloud primitives, and protocol features.
4. Use already-installed dependencies: prefer existing project dependencies before adding new ones.
5. Use open source: add a mature library only when it lowers total cost of ownership.
6. Use commercial: buy reliability, compliance, operations, support, or time when cheaper than owning it.
7. Build in-house only when reuse fails the real constraints, or the work is core differentiation.

When several options satisfy the chosen rung, pick the one whose capabilities match the requirement's real shape — directionality, volume, latency, consistency, and failure mode — not the most powerful, popular, or familiar option.

Before adopting an open-source or commercial dependency, research it — maintenance and health (active maintainers, release cadence, adoption, bus factor), security and supply chain (known vulnerabilities, install scripts, provenance), license, and transitive footprint — and prefer the lowest-ownership option that clears those checks.

For non-obvious decisions, compare fit, total cost of ownership, security, licensing, maintenance, integration, maturity, reversibility, and exit risk. State the chosen rung briefly as `Decision: use <rung>: <option>. Tradeoff: <why it wins>. Rejected: <next-best option> because <constraint>. Revisit if <specific trigger>.`

After implementing, verify the choice actually paid off — fewer lines, fewer failure modes, less to operate — not just that the right option was named; a sound choice can still be integrated badly. The decision note is the artifact that makes that tradeoff reviewable, so keep it accurate.

Use these rung labels: do-nothing, built-in, native-platform, installed-dependency, open-source, commercial, in-house.

Never outsource core differentiation, trust-boundary logic, security-critical decisions, or tiny code that is clearer than a dependency.
