# Example PR Comment

When a pull request adds a dependency without a decision note, the GitHub Action
posts a sticky comment like this:

~~~markdown
<!-- buy-vs-build-review -->
### 🧭 Buy vs Build check

This PR adds 1 dependency: `left-pad`.

**What the automated check sees** (deps.dev / OSV / OpenSSF — signals, not a verdict):

- `left-pad` — ⚠ No release in 2800 days — may be unmaintained.

Before owning a new dependency, confirm a lower rung does not already cover it:

- Could a **built-in**, **native platform** feature, or an **already-installed** dependency do this?
- Is the dependency **smaller** than the few clear lines it would replace?
- Did you check license, maintenance activity, and security?

Then record the call so reviewers can see it — in the PR description or a `docs/decisions/` ADR:

```text
Decision: use open-source: <package>. Tradeoff: <why it wins>. Rejected: <built-in/installed option> because <constraint>. Revisit if <trigger>.
~~~

_Add the note and this strict-mode check clears._
```

After a decision note is present, the same comment is updated to the resolved
state. If the automated signals still show a hard license, vulnerability, or
deprecation flag, the resolved comment keeps that warning visible for review.
