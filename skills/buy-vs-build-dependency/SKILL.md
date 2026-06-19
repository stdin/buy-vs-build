---
name: buy-vs-build-dependency
description: Use when evaluating whether to adopt a specific open-source or commercial dependency (npm/PyPI/etc. package or library) — to research its fit, maintenance and health, security and supply-chain risk, license, and footprint before taking it on.
---

# Buy vs Build — Dependency Research

Adding a dependency means adopting its bugs, its maintainers' availability, its
security posture, and its whole transitive tree. Research it before you own it.
This checklist is the union of two best-in-class frameworks — Russ Cox, "Our
Software Dependency Problem" (research.swtch.com/deps), and the OpenSSF "Concise
Guide for Evaluating Open Source Software" (best.openssf.org) — plus
bus-factor/sustainability research.

**This applies to any ecosystem** — npm, PyPI, Go modules, Maven, Cargo, NuGet,
RubyGems, or anything else. *You* do the research: gather the signals below from
the package's registry, its source repository, deps.dev, and OSV, then judge.
The helper automates supported registries, but the checklist — and the
judgment — is yours regardless of language.

## Start by trying to avoid it

The cheapest dependency is the one you don't add. Before researching a package,
confirm a lower rung does not already cover the need: a built-in, a native
platform feature, or an already-installed dependency. Reach for a new dependency
only when it clearly lowers total cost of ownership, and never for a few clear
lines you could own outright (remember left-pad).

## The checklist

### Fit & necessity
- Does it solve the *actual* requirement without large unused surface area?
- Is the API well-designed, documented, and stable (stable APIs make security upgrades cheap)?
- Chosen for fit, not hype or popularity alone.

### Maintenance & health
- Active development: meaningful commits and a release within the last ~12 months.
- Responsive maintainers: reasonable issue/PR turnaround.
- **Bus factor > 1:** multiple active maintainers, ideally from different orgs. Most popular OSS has a truck factor of 1–2 (Avelino et al., ICPC 2016) — treat a single maintainer as real risk.
- Funded/sustainable enough to keep going (sponsors, a foundation, paid maintainers).
- Real adoption: downloads and dependents (more eyes, more real-world testing).

### Security & supply chain
- The version you'd use is free of known vulnerabilities; the project fixes security bugs promptly.
- Inspect install scripts and sample the code for malicious behavior; for unknown packages, execute in a sandbox.
- Prefer signed artifacts and build provenance (SLSA); verify package identity to avoid typosquats.
- Review the OpenSSF Scorecard and any security audits/badges.

### License
- A clear, OSI-approved license compatible with your distribution/commercial model — for the whole transitive tree, not just the top package.

### Quality & testing
- Has tests, they pass, coverage is reasonable; the code is readable; problems are debuggable from the issue tracker.

### Footprint & exit
- Small, justified transitive-dependency tree (each one becomes yours).
- No functionality already present in your tree.
- Plan to wrap it behind your own interface so it can be swapped, and to stay current on upgrades.

## Pull the automatable signals first

For supported ecosystems (npm, PyPI, Go, Maven, Cargo, NuGet, RubyGems) the
helper fetches what public, keyless APIs can tell you — deps.dev / OpenSSF
Scorecard, OSV vulnerabilities, release cadence, license, and provenance, plus
npm downloads and maintainers:

```bash
node scripts/dependency-report.js <package> [ecosystem]   # ecosystem defaults to npm
```

For any other language, registry, or signal the helper does not cover, gather
the equivalent yourself — the package's registry metadata, its repository
(commits, issues, maintainers), deps.dev, OSV, and the project's docs. **These
signals inform the decision; they don't make it.**

To review the dependencies a repo *already* owns instead of one you're about to
add, run `node scripts/audit-deps.js` (or `npm run audit:deps`): it pulls these
signals for every direct dependency across manifests, ranks them by ownership
risk, checks each license against the project's, and names the lower rung you
might drop to.

## What still needs human judgment

Automated signals can't tell you whether the dependency is *core differentiation*
or *trust-boundary* code (never outsource those), whether the API actually fits,
whether the code is good where it matters, or whether a smaller alternative is
clearer. Make those calls yourself, then record the outcome with a decision note
or a `docs/decisions/` ADR (`$buy-vs-build-adr`).
