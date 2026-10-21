# ts-agent-starter

A TypeScript starter for agent-assisted development where the guardrails are deterministic and enforced, not advisory. Formatting, linting, types, tests, and secret scanning run as hooks and CI checks that block, so an agent (or a person) can't skip them by forgetting.

## Guardrails

| Guardrail | When it runs | What it catches |
| --- | --- | --- |
| Edit hook: `.claude/hooks/format-and-lint.sh` | Claude Code, after every Edit or Write of a `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, or `.jsonc` file | Formats the file with Biome and applies safe fixes. Remaining lint errors go back to Claude (exit code 2) so it fixes them in the same turn. |
| Stop hook: `.claude/hooks/typecheck-on-stop.sh` | Claude Code, before a turn ends | Type errors anywhere in the workspace. Claude can't finish the turn until `pnpm typecheck` passes; it gets one retry before the hook lets it stop, so it can't loop. |
| Pre-commit: Biome (`lefthook.yml`) | `git commit`, on staged files | Formatting and lint errors. Fixes what it safely can and restages it. |
| Pre-commit: typecheck | `git commit`, when TypeScript files are staged | Type errors. |
| Pre-commit: gitleaks | `git commit`, if gitleaks is installed | Secrets in staged changes: API keys, tokens, private keys. Skipped with a message if gitleaks isn't installed; CI still scans. |
| Pre-push: tests | `git push` | Failing Vitest tests. |
| CI: `.github/workflows/ci.yml` | Push to `main` and every pull request | `biome ci`, typecheck, tests, and gitleaks over the full history. The backstop for anything run with `--no-verify` or outside Claude Code. |
| TypeScript strict config: `tsconfig.base.json` | Every typecheck | `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. |
| pnpm strict dependencies | Install and import | A package importing something it didn't declare. Services can only reach each other's code if they declare a dependency on it. |
| Zod contracts: `packages/contracts` | Runtime, at every service boundary | Malformed requests, responses, and events, rejected where they enter instead of deep inside a service. |

Some rules in `AGENTS.md` are conventions, not checks: contracts first, services talking over HTTP, and code deciding facts while models make judgment calls. Review enforces those.

## Quick start

Requires Node 22 or later, pnpm, and `jq` (the Claude Code hooks use it). Install gitleaks for local secret scanning (`brew install gitleaks`).

```bash
git init
pnpm install   # also installs the git hooks
pnpm check     # lint, typecheck, and test
```

Open the folder in Claude Code; the hooks in `.claude/settings.json` load from the project.

## Layout

- `packages/contracts`: Zod schemas and their inferred types, shared by every service. The only package other packages may import.
- `services/example`: one service that imports only `@app/contracts` and parses its input at the boundary.
- `docs/intent.md`: why the project exists. `docs/spec.md`: what it must do, with requirement IDs. `docs/decisions/`: choices and their reasons.
- `AGENTS.md`: rules for agents and people. `CLAUDE.md` imports it.

## Adapting it

1. Rename the root package in `package.json` and the `@app/` scope in each `package.json` and import.
2. Fill in the placeholders (`<LIKE THIS>`) in `AGENTS.md`, `docs/intent.md`, and `docs/spec.md`.
3. Replace the greeting schemas in `packages/contracts` with your own, and `services/example` with your first service. Keep the test next to each schema.
4. Adding an `apps/` folder or another workspace root: add it to `pnpm-workspace.yaml` and to `projects` in `vitest.config.ts`. Every package needs a `typecheck` script, which `pnpm typecheck` runs.
5. Exclude generated files or vendored code from Biome with `"!path"` in `files.includes` in `biome.json`.
6. Add the names of any keys to `.env.example` with no values, and copy it to `.env`.
7. Record each significant choice in `docs/decisions/`, starting from `0000-template.md`.
8. Change `.nvmrc` and `engines` together if you move off Node 22.

## License

Apache License 2.0. See `LICENSE` and `NOTICE`.
