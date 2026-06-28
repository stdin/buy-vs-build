# Distribution Launch Plan

Use this as the checklist for getting Buy vs Build in front of teams that are
already letting coding agents touch production repositories.

## Positioning

Primary message:

> Stop AI coding agents from adding ownership cost before reviewers notice.

Secondary messages:

- A PR check for dependency creep from coding agents.
- Make agents write down why a dependency, service, or custom build is worth owning.
- One ruleset for Codex, Claude Code, Gemini, Cursor, Copilot, OpenCode, and AGENTS.md hosts.

Avoid leading with "framework" or "methodology." Lead with the failing PR check
and the dependency decision note.

## Launch Assets

- README quick start: `npx buy-vs-build init`.
- GitHub Action snippet: `stdin/buy-vs-build/.github/actions/dependency-review@main`.
- Example PR comment: [`docs/examples/dependency-review-comment.md`](../examples/dependency-review-comment.md).
- Benchmark result: [`benchmarks/results/behavior-claude-2026-06-19T10-23-39-792Z.md`](../../benchmarks/results/behavior-claude-2026-06-19T10-23-39-792Z.md).

## GitHub Repository Setup

Suggested topics:

- `ai-agents`
- `codex`
- `claude-code`
- `github-actions`
- `developer-tools`
- `software-supply-chain`
- `dependencies`
- `agents-md`

Suggested social preview:

```text
Stop AI coding agents from adding dependency and build ownership without a decision note.
```

## Short Launch Post

Title options:

- Stop AI agents from adding dependencies without a decision note
- A PR check for buy-vs-build discipline
- Make coding agents justify dependencies before you own them

Body:

~~~markdown
AI coding agents are fast enough to create ownership cost before a reviewer has
time to notice: custom auth, date pickers, validators, queues, or dependencies
for three obvious lines.

Buy vs Build is a zero-runtime-dependency ruleset and GitHub Action that makes
agents walk the reuse ladder before writing code. If a PR adds a dependency
without a decision note, the check comments with deps.dev / OSV / license signals
and, in strict mode, fails CI until the tradeoff is recorded.

Install:

```bash
npx buy-vs-build init
```

It ships rules for Codex, Claude Code, Gemini, Cursor, Copilot, OpenCode, and
plain AGENTS.md hosts.
~~~

## Outreach Order

1. Pin the quick-start demo in the README and repository social preview.
2. Post a concrete before/after PR comment screenshot or GIF.
3. Share to Hacker News, Lobsters, r/programming, r/LocalLLaMA, r/ClaudeAI, and
   relevant Codex/Cursor/Claude Code communities.
4. Submit PRs to relevant awesome lists for AI coding agents, GitHub Actions,
   AGENTS.md, and software supply-chain tooling.
5. Ask maintainers of 10 AI-heavy open-source repos to try the GitHub Action on
   one PR that adds a dependency.

## Follow-Up Metrics

Track weekly:

- GitHub stars and forks.
- `npx buy-vs-build init` downloads once published.
- Pull requests or issues from external repos.
- Referring sites in GitHub traffic.
- Number of repositories using the GitHub Action.
