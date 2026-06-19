# Contributing to buy-vs-build

Thanks for your interest in improving **buy-vs-build** — a buy-vs-build ruleset that
makes AI coding agents check built-ins, platform features, installed dependencies,
open source, and commercial options before building in-house.

Contributions of all sizes are welcome: bug reports, doc fixes, new benchmark cases,
and support for additional agents.

## Ground rules

- Be respectful. This project follows our [Code of Conduct](CODE_OF_CONDUCT.md).
- Keep changes focused. One logical change per pull request.
- Apply the project's own philosophy: prefer reuse over new code, and explain
  non-obvious build-vs-buy decisions in the PR description.

## Getting started

```bash
git clone https://github.com/stdin/buy-vs-build.git
cd buy-vs-build
npm test   # no dependencies to install — tests use Node built-ins only
```

The project ships no runtime dependencies; everything runs on the Node standard
library (Node 20+).

## Project layout

- `rules/buy-vs-build.md` — the **canonical** rule text.
- Per-agent instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`,
  `.cursor/`, `.kiro/`, `.windsurf/`, `.clinerules/`, `.github/copilot-instructions.md`,
  etc.) are **copies** of the canonical rule and must stay in sync.
- `plugins/buy-vs-build/` vendors a copy of the hooks and skills for marketplace
  installation; it must stay byte-identical to the top-level sources.
- `skills/` — command skills (review, audit, decision, gain).
- `hooks/` — lifecycle hooks that activate the ruleset.
- `benchmarks/` — behavior benchmark cases and recorded live runs.
- `tests/` — invariant checks (run via `npm test`).

## Required checks before opening a PR

`npm test` must pass. It enforces, among other things:

- **Rule-copy sync** (`scripts/check-rule-copies.js`): every per-agent file matches
  the canonical rule.
- **Marketplace copy sync** (`tests/marketplace.test.js`): `plugins/buy-vs-build/**`
  copies match their top-level sources byte-for-byte.
- **Version consistency** (`tests/version.test.js`): `package.json`,
  `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and
  `gemini-extension.json` all carry the same version.

If you change the rule text, a skill, or a hook, edit the canonical source (e.g.
`rules/buy-vs-build.md`) and then run:

```bash
npm run sync   # regenerates every per-agent copy and the plugins/ mirror
```

`npm test` (and CI) runs `npm run sync:check` and fails if anything is out of
sync, so you never have to hand-edit the copies.

## Pull request workflow

1. Fork the repo and create a topic branch off `main`.
2. Make your change and add or update tests / benchmark cases where relevant.
3. Run `npm test` locally.
4. Open a PR against `main`. CI (`npm test`) and conversation resolution are required
   before merge.
5. A maintainer will review. Keep the discussion in the PR thread.

## Adding a dependency

A CI check (`.github/workflows/buy-vs-build-review.yml`) flags any pull request
that adds a dependency without a decision note. Include one in the PR
description (or add a `docs/decisions/` ADR) and the check clears:

```text
Decision: use open-source: <package>. Tradeoff: <why it wins>. Rejected: <built-in/installed option> because <constraint>. Revisit if <trigger>.
```

The check is advisory; it never blocks a merge on its own.

## Commit messages

Use clear, imperative commit subjects (e.g. "Add Zed agent instruction file").
Conventional Commits are welcome but not required.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/stdin/buy-vs-build/issues/new/choose).
For security issues, **do not** open a public issue — see [SECURITY.md](SECURITY.md).
