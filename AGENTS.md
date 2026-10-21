# Agent instructions

Read this before changing anything. It applies to every coding agent and every person working here.

## What this repo is

<!-- One or two sentences: what this project is and the question or problem it answers. -->
<PROJECT SUMMARY>. Why: `docs/intent.md`. What it must do: `docs/spec.md`. Choices and their reasons: `docs/decisions/`.

## Layout

- `packages/contracts`: Zod schemas and types shared by every service. The only package other packages may import.
- `services/example`: an example service that answers greeting requests. Replace it with your own.
- `docs/diagrams`: Mermaid architecture and sequence diagrams, and their `CHANGELOG.md`.
<!-- - `services/<name>`: what it does. -->
<!-- - `apps/<name>`: what it does. Add `apps/*` to pnpm-workspace.yaml and vitest.config.ts. -->

## Commands

- `pnpm install`: install, and set up the git hooks.
- `pnpm check`: lint, typecheck, check diagrams, and test. Run it before you say you're done.
- `pnpm check:diagrams`: check that every Mermaid diagram renders, covers every package, and has a changelog entry.
- `pnpm format`: fix formatting and safe lint issues.
- `pnpm test`: run all tests with Vitest.

## Rules

- Contracts first. A new request, response, or event gets a Zod schema in `packages/contracts` before any code uses it. Parse at every service boundary.
- Services talk over HTTP, never by importing each other.
- Code decides facts; models make judgment calls. <WHICH DECISIONS ARE FACTS, e.g. eligibility, timing, budgets, gates> are deterministic code with tests. Only <WHICH COMPONENTS> call models, and each sits behind an interface with a replay or stub implementation.
- Deterministic by default. Tests and the default mode never call a paid API or need a key.
- Changing behavior that the <CHARACTERIZATION OR CONTRACT> tests cover is a decision, not a refactor. Say so, update the spec, and add a record in `docs/decisions/`.
- No secrets in code, tests, or fixtures. Keys come from `.env`, which is never committed. `.env.example` lists the names with no values.
- Diagrams change with the code. `docs/diagrams/architecture.md` shows every package in `packages/` and `services/` and how they connect; every service is a participant in at least one sequence diagram. When a change adds or removes a package, adds a dependency or a service-to-service call, or changes a flow's steps or error paths, update the diagram in the same change. Write diagrams as ```` ```mermaid ```` blocks in Markdown. Every added, changed, or removed diagram gets a dated entry in `docs/diagrams/CHANGELOG.md` saying what changed and why.
- Call out decisions nobody asked for. Whenever you make a choice the prompt didn't specify (a library, a name, a default, a file layout, a scope cut, a behavior change), say so. End every turn that changed files with an `Unrequested decisions:` section listing each one with a one-line reason, or `Unrequested decisions: none.` Ask first when the choice is hard to undo. A significant choice also gets a record in `docs/decisions/`. Pull request descriptions carry the same section.
- Keep changes small and on a branch. Don't push or open pull requests unless asked.

## What runs automatically

- On every file edit (Claude Code): Biome formats it and reports lint errors back.
- On every Markdown edit (Claude Code): its Mermaid diagrams must parse.
- Before an agent turn ends (Claude Code): the workspace must typecheck; a turn that edited files must end with an `Unrequested decisions:` section; a turn that changed source but no diagram must end with a `Diagrams:` line saying why; and the diagram check must pass.
- On commit: Biome, typecheck, the diagram check (a staged diagram change needs a changelog entry), and a gitleaks secret scan if gitleaks is installed.
- On push: the tests.
- In CI: Biome, typecheck, tests, the diagram check against the base branch, gitleaks, and, on pull requests, an `Unrequested decisions` section in the description.
