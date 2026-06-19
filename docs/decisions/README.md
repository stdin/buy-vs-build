# Architecture Decision Records

This log captures non-obvious buy-vs-build decisions as ADRs so the reasoning —
and the trigger to revisit each one — survives the pull request.

- Each record is `NNNN-title.md`, numbered in order.
- `0000-template.md` is the template.
- Create one with `node scripts/record-decision.js --title "..."`, or by hand.
- Close the loop with `npm run revisit`: it surfaces records whose revisit trigger has come due. Triggers it can check automatically are date-based (`Revisit if ... by 2027-01-01`, or a `- Review by: YYYY-MM-DD` line) and dependency-version-based (`Revisit if react reaches 20.0`); anything else is flagged for a human or LLM to judge.

See the `$buy-vs-build-adr` skill for when and how to record.
