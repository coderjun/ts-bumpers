# Diagrams

Architecture and sequence diagrams, written in [Mermaid](https://mermaid.js.org/) inside Markdown so they render on GitHub and in most editors with nothing installed.

- `architecture.md`: every workspace package and how they connect. Required.
- One file per important flow, named `<flow>-sequence.md`, with a `sequenceDiagram`. Every service must be a participant in at least one.
- `CHANGELOG.md`: one entry per added, changed, or removed diagram.

## Keeping them true

Update the diagrams in the same change as the code they describe: a new package or service, a new dependency between packages, a new service-to-service call, or a change to a flow's steps or error paths.

`pnpm check:diagrams` enforces what code can check:

- Every ```` ```mermaid ```` block in any Markdown file parses with Mermaid, so it will render.
- Every package in `packages/` and `services/` appears by name in `architecture.md`.
- Every service appears in a sequence diagram.
- Every diagram file has a changelog entry, and a diagram change comes with a changelog change (on commit and in CI).

Whether a diagram still matches the code is a judgment call. The Claude Code Stop hook asks for it: when a turn changes source but no diagram, the final message must say so on a `Diagrams:` line.

## Writing them

- Use the package name (`@app/example`) as the label or participant alias so the checks can find it.
- Cite requirement IDs (`EX-3`) on the steps they cover.
- Keep one diagram per block, and one idea per diagram. Split a diagram before it needs scrolling.
