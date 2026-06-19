# Buy vs Build

[![CI](https://github.com/stdin/buy-vs-build/actions/workflows/ci.yml/badge.svg)](https://github.com/stdin/buy-vs-build/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Stop your coding agent from reinventing the invoice.**

Buy vs Build is an always-on ruleset for AI coding agents. Before the agent writes code, it has to ask:

> Can this be solved with a built-in, platform feature, installed dependency, open source library, or commercial product before we own it forever?

That one pause catches a lot of expensive mistakes: custom date pickers, homemade auth, duplicate validators, tiny libraries that bring a dependency tree with them, and "temporary" infrastructure that somehow becomes a team.

Buy vs Build does not worship dependencies. It does not worship in-house code. It makes the agent choose deliberately.

## Why This Exists

AI agents are fast. That is useful until they sprint directly into ownership cost.

They will happily:

- Build a custom calendar instead of using a native date input.
- Add a package for three lines of clear code.
- Hand-roll OAuth because the prompt said "simple login."
- Miss a library the repo already uses.
- Avoid a commercial service, then quietly create a new operations burden.

Buy vs Build adds the missing engineering reflex: **check reuse first, build only when the constraints justify owning it.**

## Decide First: Core vs Context

The ladder below tells you *how far to reach for reuse*. Two questions decide *whether to reuse at all*:

- **Core or context?** Core is the differentiation customers choose you for. Context is everything they expect but never reward — auth, email, parsing, config. Build core; reuse context.
- **Commodity or novel?** Commodity capabilities are standardized and stable. Novel ones are still changing or specific to you. Reuse commodities; build novelty.

|             | Commodity                                                       | Novel                                            |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------ |
| **Core**    | Reuse the substrate, build the thin layer that differentiates.  | Build in-house — this is the moat.               |
| **Context** | Reuse aggressively: built-in → platform → dependency → commercial. | Do the minimum: defer, stub, or simplest reuse.  |

Then scale scrutiny to **reversibility**: a two-way-door choice (easy to swap or delete) decides fast; a one-way-door commitment (deep platform, data-format, or vendor lock-in) earns rigor and a written exit plan.

## The Rule

Once you know what you are choosing to own, walk the reuse ladder. Stop at the first rung that satisfies the requirement:

1. **Do nothing**: skip speculative requirements and scaffolding.
2. **Use built-ins**: prefer language built-ins and the standard library.
3. **Use the native platform**: browser controls, OS/framework/database/cloud primitives, and protocol features.
4. **Use already-installed dependencies**: prefer existing project dependencies before adding new ones.
5. **Use open source**: add a mature library only when it lowers total ownership cost.
6. **Use commercial**: buy reliability, compliance, operations, support, or time when cheaper than owning it.
7. **Build in-house only when** reuse fails the real constraints, or the work is core differentiation.

For non-obvious choices, the agent compares fit, total cost of ownership, security, licensing, maintenance, integration, maturity, reversibility, and exit risk.

## What It Changes

| Without Buy vs Build | With Buy vs Build |
| --- | --- |
| "I'll write a utility for this." | "Does the standard library already do this?" |
| "Let's add a package." | "Is this smaller than the dependency?" |
| "I'll build the integration layer." | "Is there a maintained client or platform primitive?" |
| "Commercial tools are expensive." | "Is owning this more expensive?" |
| "It's just auth/date parsing/CSV/OIDC." | "That phrase has a long incident history." |

Example decision note:

```text
Decision: use native-platform: native date input.
Tradeoff: accessibility and browser behavior are good enough for a due-date field.
Rejected: open-source date picker because it adds styling, keyboard, and date-edge ownership.
Revisit if product needs range selection or non-Gregorian calendar support.
```

## Safety Boundaries

This is not "do less at any cost." Buy-vs-build thinking must never cut:

- Trust-boundary validation
- Security and privacy requirements
- Data-loss protection
- Accessibility
- Production observability
- Explicit user requirements

Cheap code that loses customer data is not cheap. It is just a delayed invoice.

## Supported Agent Surfaces

This repo ships the same rule through the files each host already knows how to read.

| Host | Files |
| --- | --- |
| Codex | `.codex-plugin/plugin.json`, `skills/buy-vs-build/`, `hooks/hooks.json`, `AGENTS.md` |
| Claude Code | `.claude-plugin/plugin.json`, `CLAUDE.md`, lifecycle hook config |
| Gemini CLI / Antigravity | `gemini-extension.json`, `GEMINI.md`, `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/buy-vs-build.mdc` |
| Windsurf | `.windsurf/rules/buy-vs-build.md` |
| Cline | `.clinerules/buy-vs-build.md` |
| Kiro | `.kiro/steering/buy-vs-build.md` |
| OpenCode | `opencode.json`, `.opencode/plugins/buy-vs-build.mjs` |
| OpenClaw | `.openclaw/skills/buy-vs-build/` |
| Pi-style harnesses | `package.json` `pi.skills` |
| Generic agents | `AGENTS.md` |

The hook files are included for hosts that support lifecycle injection. Hosts that only read instruction files still get the rule, just without startup fanfare.

## Install

### Codex

```bash
codex plugin marketplace add stdin/buy-vs-build
```

Open `/plugins`, install Buy vs Build, and start a new session. If your Codex surface reads `AGENTS.md`, cloning the repo or copying `AGENTS.md` into a project is enough for instruction-only mode.

### Claude Code

Use the Claude plugin flow with this repository as the source, or copy `CLAUDE.md` into the target project for instruction-only mode.

### Gemini CLI

```bash
gemini extensions install https://github.com/stdin/buy-vs-build
```

### OpenCode

Run OpenCode from a checkout of this repo, or add this plugin path to your project `opencode.json`:

```json
{
  "plugin": ["./.opencode/plugins/buy-vs-build.mjs"]
}
```

The OpenCode plugin injects the ruleset into the system prompt every turn and registers this repo's `skills/` path.

### Instruction-Only Hosts

Copy the matching file into your project:

- GitHub Copilot: `.github/copilot-instructions.md`
- Cursor: `.cursor/rules/buy-vs-build.mdc`
- Windsurf: `.windsurf/rules/buy-vs-build.md`
- Cline: `.clinerules/buy-vs-build.md`
- Kiro: `.kiro/steering/buy-vs-build.md`
- Generic: `AGENTS.md`

This is the lowest-tech install path, which is appropriate for a project about not overbuilding things.

## Commands / Skills

Skill-capable hosts can use:

| Skill | Use it when |
| --- | --- |
| `$buy-vs-build` | Apply the core rule while coding. |
| `$buy-vs-build-review` | Review a diff for avoidable custom code or unnecessary dependencies. |
| `$buy-vs-build-audit` | Audit a repo or subsystem for ownership mistakes. |
| `$buy-vs-build-decision` | Draft a short decision memo. |
| `$buy-vs-build-gain` | Summarize benchmark cases and measured impact. |

## Benchmarks

Local overhead is intentionally tiny:

- Instruction generation: about `0.009ms` average.
- Hook process startup: about `28ms` average.

Behavior benchmark cases live in `benchmarks/behavior-cases.json`. They cover common overbuild traps: date inputs, CSV export, validation, password reset email, OpenID Connect, and proprietary scoring logic.

Latest live validation:

- Run: [behavior-claude-2026-06-19T09-38-44-054Z.md](benchmarks/results/behavior-claude-2026-06-19T09-38-44-054Z.md)
- Agent: Claude Code `2.1.183`, model `claude-opus-4-8[1m]`, Node `v24.12.0`, macOS arm64.
- 7 cases, heuristic scoring: baseline `31/35`, Buy vs Build enabled `33/35`. All 7 enabled cases recommend the correct rung **and** the right option (7/7).
- The `realtime-transport` case confirms the fit principle: with the rule on, the agent recommends **Server-Sent Events** for a one-way feed (not WebSockets) and names the distinguishing requirement in its decision note.
- Caveat: a strong base model already scores well on the coarse keyword heuristic, so the aggregate gap is small and varies run to run. For finer signal, run with the LLM judge (`npm run benchmark:behavior:claude -- --judge`), which scores each recommendation against a rubric.

Run it yourself:

```bash
npm run benchmark:behavior         # Codex CLI
npm run benchmark:behavior:claude  # Claude CLI
```

Important honesty note: this benchmark scores final recommendations, not code diffs, token spend, or incident reduction. It is still useful because it tests the thing this plugin promises first: does the agent make the buy-vs-build decision visible before it starts owning code? Marketing is allowed to wear shoes; it is not allowed to fly.

## Development

Run the test suite:

```bash
npm test
```

Run the local overhead benchmark:

```bash
npm run benchmark
```

Run the live behavior benchmark (Codex CLI or Claude CLI):

```bash
npm run benchmark:behavior
npm run benchmark:behavior:claude
```

Check benchmark report generation without calling a model:

```bash
npm run benchmark:behavior:dry
npm run benchmark:behavior:claude:dry
```

Check copied rule files for drift:

```bash
node scripts/check-rule-copies.js
```

Validate the Codex skill and plugin (paths are relative to your Codex install):

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/buy-vs-build
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

When changing the compact rules, edit `rules/buy-vs-build.md` first, then update the copied instruction files. The drift check will complain if they diverge, which is its one job and it takes that job very seriously.

## FAQ

**Is this anti-open-source?**
No. It is pro-ownership clarity. Use open source when it lowers total cost and risk. Avoid it when it turns three obvious lines into another thing to patch forever.

**Is this anti-commercial tools?**
No. A paid service can be the cheapest option when it buys reliability, compliance, support, or operations you do not want to own.

**When should we build in-house?**
When the behavior is core product differentiation, the code is smaller and clearer than a dependency, or reuse fails security, privacy, licensing, latency, offline, portability, data-residency, or integration constraints.

**Will this slow agents down?**
The local rule overhead is tiny. The decision may add a sentence. That sentence is cheaper than a migration.

## License

[MIT](LICENSE).
