# 0004: Node 26, and repo tooling written in TypeScript

Status: accepted, 2026-10-21

## Context

The repo required Node 22.13 or later. The Claude Code hooks were shell scripts that needed `jq`, plus JavaScript (`.mjs`) files that weren't typechecked. The repo is meant as a starting point for people new to TypeScript and to agent-assisted development, so each extra tool or language makes it harder to start. Node 24 moved to maintenance LTS on 2026-10-20. Node 26 becomes active LTS on 2026-10-28 and is supported until April 2029.

## Decision

Pin Node 26: `.nvmrc` is `26`, `engines.node` is `>=26`, and `.npmrc` sets `engine-strict=true` so `pnpm install` stops on an older Node. Write the hooks and scripts in TypeScript, which Node 26 runs directly, and typecheck them with the root `tsconfig.json` (with `erasableSyntaxOnly`, since Node strips types rather than compiling them). The hooks go through `.claude/hooks/run.sh`, which checks the Node version first and says how to fix it.

## Why

- One language for the product and its tooling. A newcomer reading a hook reads the same TypeScript as the services, and the typechecker covers it.
- No `jq`. The hooks parse their JSON input in TypeScript.
- Pinning a major version means nothing changes when 26 becomes LTS. The next required move is to Node 28 before April 2029.
- `engine-strict` turns a confusing failure later into a clear one at install.

Not a reason: Biome's Markdown support. That came from upgrading Biome to 2.6, which works on any Node.

## Consequences

Contributors need Node 26. `nvm install` reads `.nvmrc`. Claude Code must be started from a shell running Node 26, or the hooks report the version they found instead of running. Node 26 no longer includes Corepack, so pnpm is installed with `npm install --global pnpm`. Until 2026-10-28, Node 26 releases can still add small features. To move to a later Node, change `.nvmrc`, `engines`, and `@types/node` together.
