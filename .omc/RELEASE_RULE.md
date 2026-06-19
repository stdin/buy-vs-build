# Release Rules
<!-- last-analyzed: 2026-06-19T07:21:58Z -->

## Version Sources

- `package.json`: JSON field `version`
- `.codex-plugin/plugin.json`: JSON field `version`
- `.claude-plugin/plugin.json`: JSON field `version`
- `gemini-extension.json`: JSON field `version`

## Release Trigger

- Manual release. No CI release workflow is present.
- Publish by creating an annotated git tag and a GitHub Release.

## Test Gate

- Local command: `npm test`
- No CI test gate is configured.

## Registry / Distribution

- No package registry publish is configured.
- `package.json` has `"private": true`, so npm publish is intentionally disabled.
- Distribution is currently via GitHub repository, tags, and GitHub Releases.

## Release Notes Strategy

- No `CHANGELOG.md` exists.
- Use GitHub Release notes written from the commits in the release.

## CI Workflow Files

- None detected.

## First-Time Setup Gaps

- No release workflow is present.
- No existing git tags were detected before `v0.1.0`.
- No `.gitignore` is present.
