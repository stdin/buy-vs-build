# Release Rules
<!-- last-analyzed: 2026-06-19T07:21:58Z -->

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

- No package registry publish is configured.
- `package.json` has `"private": true`, so npm publish is intentionally disabled.
- Distribution is currently via GitHub repository, tags, and GitHub Releases.

## Release Notes Strategy

- `CHANGELOG.md` exists (Keep a Changelog format). The release workflow extracts
  the section for the released version via `scripts/extract-changelog.js`.
- Falls back to GitHub auto-generated notes when no section matches the version.

## CI Workflow Files

- None detected.

## First-Time Setup Gaps

- No release workflow is present.
- No existing git tags were detected before `v0.1.0`.
- No `.gitignore` is present.
