# Bumpers

A TypeScript starter for AI-agent development that keeps you out of trouble.

Like the bumpers in a bowling lane, it keeps you and your agents out of the gutter without taking over the throw. The guardrails are deterministic and enforced, not advisory. Formatting, linting, types, tests, and secret scanning run as hooks and CI checks that block, so an agent (or a person) can't skip them by forgetting.

## Guardrails

| Guardrail                                                   | When it runs                                       | What it catches                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit hook: `.claude/hooks/format-and-lint.ts`               | Claude Code, after every Edit or Write             | Formats the file with Biome (code, JSON, Markdown, YAML) and applies safe fixes. Remaining lint errors go back to Claude (exit code 2) so it fixes them in the same turn. For Markdown, also parses every Mermaid diagram, so one that won't render is caught at once.                                                                                                                                                                                                      |
| Stop hook: `.claude/hooks/typecheck-on-stop.ts`             | Claude Code, before a turn ends                    | Type errors anywhere in the workspace, including the hooks and scripts. Claude can't finish the turn until `pnpm typecheck` passes; it gets one retry before the hook lets it stop, so it can't loop.                                                                                                                                                                                                                                                                       |
| Prompt hook: `.claude/hooks/snapshot-on-prompt.ts`          | Claude Code, when a prompt is sent                 | Nothing by itself. Commits the working tree to the turn history (below), so the Stop hook can see every file the turn changed.                                                                                                                                                                                                                                                                                                                                              |
| Stop hook: `.claude/hooks/review-turn-on-stop.ts`           | Claude Code, before a turn that changed files ends | A final message with no `Unrequested decisions:` section; source changed with no diagram change and no `Diagrams:` line explaining why; files changed without an edit tool (by a command, or out of band by an editor or watcher) that the message doesn't name; and any diagram check failure. Patterns in `.claude/turn-review-ignore` are left out. Without a turn-start snapshot it falls back to the transcript's edit-tool calls. One retry, like the typecheck hook. |
| Pre-commit: Biome (`lefthook.yml`)                          | `git commit`, on staged files                      | Formatting and lint errors in code, JSON, Markdown, and YAML. Fixes what it safely can and restages it.                                                                                                                                                                                                                                                                                                                                                                     |
| Pre-commit: typecheck                                       | `git commit`, when TypeScript files are staged     | Type errors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Pre-commit: diagrams (`scripts/check-diagrams.ts --staged`) | `git commit`                                       | Diagrams that don't parse, packages missing from the architecture diagram, services in no sequence diagram, and a staged diagram change with no `docs/diagrams/CHANGELOG.md` change.                                                                                                                                                                                                                                                                                        |
| Pre-commit: gitleaks                                        | `git commit`, if gitleaks is installed             | Secrets in staged changes: API keys, tokens, private keys. Skipped with a message if gitleaks isn't installed; CI still scans.                                                                                                                                                                                                                                                                                                                                              |
| Pre-push: tests                                             | `git push`                                         | Failing Vitest tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CI: `.github/workflows/ci.yml`                              | Push to `main` and every pull request              | `biome ci`, typecheck, tests, the diagram check against the base branch, and gitleaks over the full history. On pull requests, the description must have an `Unrequested decisions` section (`.github/pull_request_template.md`). The backstop for anything run with `--no-verify` or outside Claude Code.                                                                                                                                                                  |
| Node version: `.nvmrc`, `engines`, `.npmrc`                 | `pnpm install`, and every Claude Code hook         | Running on anything older than Node 26. `pnpm install` stops with an "unsupported engine" error, and the hooks say which Node they found and how to switch.                                                                                                                                                                                                                                                                                                                 |
| TypeScript strict config: `tsconfig.base.json`              | Every typecheck                                    | `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. The root `tsconfig.json` adds `erasableSyntaxOnly` for the hooks and scripts, which Node runs directly.                                                                                                                                                                                                                                                                |
| pnpm strict dependencies                                    | Install and import                                 | A package importing something it didn't declare. Services can only reach each other's code if they declare a dependency on it.                                                                                                                                                                                                                                                                                                                                              |
| Zod contracts: `packages/contracts`                         | Runtime, at every service boundary                 | Malformed requests, responses, and events, rejected where they enter instead of deep inside a service.                                                                                                                                                                                                                                                                                                                                                                      |

Some rules in `AGENTS.md` are conventions, not checks: contracts first, services talking over HTTP, and code deciding facts while models make judgment calls. Review enforces those. Two are checked only in part: the hooks can require that diagrams render, cover every package, and are logged, and that an agent says which decisions it made unasked, but not that a diagram is accurate or that the list of decisions is complete. Review covers the rest.

## Quick start

New to TypeScript or to working with coding agents? Each step says what it does.
1. **Install Node 26** with a version manager, so each project can use the Node it needs. With [nvm](https://github.com/nvm-sh/nvm), run `nvm install` in this folder; it reads `.nvmrc`. To make Node 26 your default, also run `nvm alias default 26`.
2. **Install pnpm**, the package manager: `npm install --global pnpm`. (Node 26 no longer includes Corepack, the older way to get pnpm.)
3. **Install the project**:

   ```bash
   git init          # skip if you cloned the repo
   pnpm install      # dependencies, git hooks, and the turn history
   pnpm setup:tools  # offers to install gitleaks and the GitHub CLI
   pnpm check        # lint, typecheck, check diagrams, and test
   ```

   `pnpm install` lists any optional tools you're missing; `pnpm setup:tools` asks before installing each one, with Homebrew on macOS and Linux or winget on Windows.

4. **Open the folder in Claude Code** from a terminal where `node -v` shows v26. The hooks in `.claude/settings.json` load from the project and run on Node.

## Turn history

Each Claude Code turn is committed twice, when it starts and when it ends, to a separate git repository in `.claude/turn-history/`. It's gitignored, local to your clone, and never touches the project's own `.git`. The Stop hook uses it to see every file a turn changed. You can use it to see what any turn did:

```bash
git --git-dir=.claude/turn-history for-each-ref refs/sessions    # one branch per session
git --git-dir=.claude/turn-history log --stat refs/sessions/<id> # its turns, newest first
```

Sessions with no activity for 30 days are pruned. Delete the folder to start over; the next `pnpm install` or prompt recreates it.

## Layout

- `packages/contracts`: Zod schemas and their inferred types, shared by every service. The only package other packages may import.
- `services/example`: one service that imports only `@app/contracts` and parses its input at the boundary.
- `docs/diagrams/`: Mermaid architecture and sequence diagrams, and a changelog of every change to them.
- `scripts/`: repo tooling in TypeScript, run directly by Node: the diagram check, `prepare` (runs after `pnpm install`), and `setup:tools`. `scripts/tools.ts` lists the command-line tools the repo uses.
- `.claude/hooks/`: the Claude Code hooks, in TypeScript. `.claude/settings.json` wires them up through `run.sh`, which checks the Node version first.
- `docs/intent.md`: why the project exists. `docs/spec.md`: what it must do, with requirement IDs. `docs/decisions/`: choices and their reasons.
- `AGENTS.md`: rules for agents and people. `CLAUDE.md` imports it.

## Adapting it

1. Rename the root package in `package.json` and the `@app/` scope in each `package.json` and import.
2. Fill in the placeholders (`<LIKE THIS>`) in `AGENTS.md`, `docs/intent.md`, and `docs/spec.md`.
3. Replace the greeting schemas in `packages/contracts` with your own, and `services/example` with your first service. Keep the test next to each schema.
4. Adding an `apps/` folder or another workspace root: add it to `pnpm-workspace.yaml` and to `projects` in `vitest.config.ts`. Every package needs a `typecheck` script, which `pnpm typecheck` runs.
5. Replace the diagrams in `docs/diagrams/` with your own, and log it in its `CHANGELOG.md`.
6. Exclude generated files or vendored code from Biome with `"!path"` in `files.includes` in `biome.json`.
7. Add the names of any keys to `.env.example` with no values, and copy it to `.env`.
8. Record each significant choice in `docs/decisions/`, starting from `0000-template.md`.
9. Change `.nvmrc`, `engines`, and `@types/node` together when you move to the next Node LTS.
10. Add a command-line tool the repo needs to `scripts/tools.ts`, so `pnpm install` reports it and `pnpm setup:tools` offers it.

## License

Apache License 2.0. See `LICENSE` and `NOTICE`.
