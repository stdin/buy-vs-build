# Release Rules
<!-- last-analyzed: 2026-06-28T15:15:00Z -->

## Version Sources

- `package.json`: JSON field `version`
- `.codex-plugin/plugin.json`: JSON field `version`
- `.claude-plugin/plugin.json`: JSON field `version`
- `gemini-extension.json`: JSON field `version`

## Release Trigger

- Automated. `.github/workflows/release.yml` runs on every push to `main` and,
  when `package.json`'s version is not yet tagged, tags `v<version>` and
  publishes a GitHub Release. Version-unchanged merges are no-ops.
- To release: open a PR bumping the version in all four manifests and adding a
  `CHANGELOG.md` section; merging it to `main` triggers the release.
- Manual tagging is no longer required (and `main` is PR-protected).

## Test Gate

- Local command: `npm test`
- CI: `.github/workflows/ci.yml` runs `npm test` (Node 20.x + 22.x) on PRs and
  is required by branch protection; the release workflow also runs `npm test`
  before tagging.

## Registry / Distribution

- No package registry publish is configured in CI.
- `package.json` is npm-publishable and exposes the `buy-vs-build` bin, but the
  automated release workflow currently creates only GitHub tags/releases.
- Distribution is currently via GitHub repository, tags, GitHub Releases, and
  npm package metadata ready for a separate manual/CI publish step.

## Release Notes Strategy

- `CHANGELOG.md` exists (Keep a Changelog format). The release workflow extracts
  the section for the released version via `scripts/extract-changelog.js`.
- Falls back to GitHub auto-generated notes when no section matches the version.

## CI Workflow Files

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/workflows/buy-vs-build-review.yml`

## First-Time Setup Gaps

- npm publishing is not wired into release CI yet.
