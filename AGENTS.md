# Agent instructions

Read this before changing anything. It applies to every coding agent and every person working here.

## What this repo is

<!-- One or two sentences: what this project is and the question or problem it answers. -->
<PROJECT SUMMARY>. Why: `docs/intent.md`. What it must do: `docs/spec.md`. Choices and their reasons: `docs/decisions/`.

## Layout

- `packages/contracts`: Zod schemas and types shared by every service. The only package other packages may import.
- `services/example`: an example service that answers greeting requests. Replace it with your own.
<!-- - `services/<name>`: what it does. -->
<!-- - `apps/<name>`: what it does. Add `apps/*` to pnpm-workspace.yaml and vitest.config.ts. -->

## Commands

- `pnpm install`: install, and set up the git hooks.
- `pnpm check`: lint, typecheck, and test. Run it before you say you're done.
- `pnpm format`: fix formatting and safe lint issues.
- `pnpm test`: run all tests with Vitest.

## Rules

- Contracts first. A new request, response, or event gets a Zod schema in `packages/contracts` before any code uses it. Parse at every service boundary.
- Services talk over HTTP, never by importing each other.
- Code decides facts; models make judgment calls. <WHICH DECISIONS ARE FACTS, e.g. eligibility, timing, budgets, gates> are deterministic code with tests. Only <WHICH COMPONENTS> call models, and each sits behind an interface with a replay or stub implementation.
- Deterministic by default. Tests and the default mode never call a paid API or need a key.
- Changing behavior that the <CHARACTERIZATION OR CONTRACT> tests cover is a decision, not a refactor. Say so, update the spec, and add a record in `docs/decisions/`.
- No secrets in code, tests, or fixtures. Keys come from `.env`, which is never committed. `.env.example` lists the names with no values.
- Keep changes small and on a branch. Don't push or open pull requests unless asked.

## What runs automatically

- On every file edit (Claude Code): Biome formats it and reports lint errors back.
- Before an agent turn ends (Claude Code): the workspace must typecheck.
- On commit: Biome, typecheck, and a gitleaks secret scan if gitleaks is installed.
- On push: the tests.
- In CI: Biome, typecheck, tests, and gitleaks.
