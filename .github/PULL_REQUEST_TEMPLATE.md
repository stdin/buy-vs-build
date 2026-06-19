## Summary

<!-- What does this change, and why? -->

## Buy-vs-build decision (for non-obvious choices)

<!-- If this adds code or a dependency, state the rung and tradeoff:
Decision: use <rung>: <option>. Tradeoff: <why it wins>. Rejected: <next-best> because <constraint>. -->

## Checklist

- [ ] `npm test` passes locally.
- [ ] If I changed the rule, I edited `rules/buy-vs-build.md` first and synced every per-agent copy (drift check passes).
- [ ] If I changed hooks or skills, the `plugins/buy-vs-build/**` mirror stays byte-identical.
- [ ] If I bumped the version, `package.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `gemini-extension.json` all match.
- [ ] One logical change; the description explains the reasoning.
