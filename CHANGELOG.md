# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Dry behavior benchmark gate (`npm run benchmark:behavior:gate`) with score
  thresholds, included in `npm test`.
- Dependency manifest extraction for root npm lockfiles, Maven `pom.xml`, NuGet
  project files, editable Python requirements, and Cargo package aliases.

### Changed

- Strict `.buyvsbuild.json` mode now fails the PR dependency review when new
  dependencies lack a decision note, while still posting the explanatory PR
  comment.
- Tests now use Node's built-in test discovery instead of a hand-maintained
  test-file list.
- Dependency report lookup failures now distinguish missing packages, rate
  limits, service outages, and network failures.
- PR review and dependency audit now use the shared manifest detector, so dynamic
  manifest types such as NuGet project files are actually included.
- Maven manifest extraction now ignores `dependencyManagement` entries so version
  constraints are not mistaken for directly owned dependencies.

## [0.3.0] - 2026-06-19

### Added

- Multi-ecosystem PR check: the dependency review now diffs npm, PyPI, Go,
  Cargo, and RubyGems manifests (not just `package.json`) and posts deps.dev /
  OSV / OpenSSF Scorecard signals plus a license-compatibility check for each
  newly added dependency.
- `$buy-vs-build-right-tool` skill: on-demand decision tables for matching an
  option to the requirement's real shape (SSE vs WebSockets, SQL vs NoSQL, cron
  vs queue, REST vs GraphQL, webhook vs polling, ...).
- Whole-repo dependency audit (`npm run audit:deps`): ranks every direct
  dependency by ownership risk and names the lower rung it could drop to.
- Revisit tracker (`npm run revisit`): surfaces ADRs whose date- or
  dependency-version-based revisit trigger has come due.
- License-compatibility guard: a coarse copyleft-into-permissive/proprietary
  check, wired into the dependency report, the audit, and the PR check.
- Shared, dependency-free modules `scripts/manifests.js` and
  `scripts/license-compat.js`.

### Changed

- The rule and the main/review skills now nudge a post-implementation check:
  verify the choice actually cut code, failure modes, and operating burden — a
  sound option can still be integrated badly — and treat the decision note as
  the reviewable artifact.

## [0.2.0] - 2026-06-19

### Added

- Language-agnostic, LLM-driven dependency research
  (`$buy-vs-build-dependency`, `scripts/dependency-report.js`) across npm, PyPI,
  Go, Maven, Cargo, NuGet, and RubyGems via deps.dev and OSV.
- Buy-vs-build PR-review GitHub Action that flags new dependencies added without
  a decision note.
- Decision-note capture as durable ADRs (`scripts/record-decision.js`,
  `docs/decisions/`).
- Per-project configuration via `.buyvsbuild.json`.
- LLM-judge benchmark scorer (`--judge`).

### Changed

- Expanded the behavior benchmark to 13 cases and defaulted to a smaller model.
- Refocused the README on the problems the ruleset solves.
- Guidance to recommend the right option, not the obvious one.

## [0.1.0] - 2026-06-19

### Added

- Initial buy-before-build ruleset for AI coding agents: the reuse ladder,
  core-vs-context and commodity-vs-novel classification, and safety boundaries.
- Single-source rule generator (`npm run sync`) that ships the rule across
  Codex, Claude Code, Gemini, Cursor, GitHub Copilot, Windsurf, Cline, Kiro,
  OpenCode, and more.
- Collaboration scaffolding and CODEOWNERS.

[0.3.0]: https://github.com/stdin/buy-vs-build/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/stdin/buy-vs-build/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/stdin/buy-vs-build/releases/tag/v0.1.0
