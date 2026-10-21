# 0002: Mermaid diagrams in Markdown, checked by Mermaid's own parser

Status: accepted, 2026-10-21

## Context

We want architecture and sequence diagrams that agents create and keep current, that render wherever the repo is read, and that carry a log of changes. Agents edit text far more reliably than images. GitHub, GitLab, VS Code, and JetBrains render Mermaid inside Markdown with nothing installed.

## Decision

Diagrams are ```` ```mermaid ```` blocks in `docs/diagrams/*.md`, logged in `docs/diagrams/CHANGELOG.md`. `scripts/check-diagrams.mjs` parses every Mermaid block with the `mermaid` package under jsdom, and checks that the diagrams name every workspace package and service and that diagram changes are logged. It runs in the edit hook, the Stop hook, pre-commit, `pnpm check`, and CI.

## Why

- Mermaid is plain text, so diagrams diff and review like code, and an agent can edit them.
- Parsing with the same library the renderers use catches the errors that stop a diagram from rendering, in about a second, with no browser.
- Checking for package names gives a check that fails on a missing diagram update, for the cases code can detect: a new package or service.

Not a reason: full render fidelity. Parsing doesn't run layout, so a diagram that parses can still look cramped. `@mermaid-js/mermaid-cli` renders for real but downloads a headless Chromium; add it to CI if that becomes a problem.

## Consequences

Two dev dependencies (`mermaid`, `jsdom`). A diagram's accuracy is still a review question; the Stop hook makes the agent say why no diagram changed when source changed. To undo this, remove the `diagrams` command from `lefthook.yml`, the CI step, and `check:diagrams` from `pnpm check`.
