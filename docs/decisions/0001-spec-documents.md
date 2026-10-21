# 0001: Plain intent and spec documents instead of a spec tool

Status: accepted

## Context

We separate why (`intent.md`), what (`spec.md`), and how (the code). Tools exist to scaffold this kind of spec-driven workflow, such as GitHub Spec Kit.

## Decision

Use two plain Markdown documents and short decision records, with requirement IDs that tests and pull requests cite.

## Why

- A spec format should outlive the tool that generates it. Spec tools for agent-assisted development are young, and their formats and maintenance can change under you.
- Two Markdown files work with every agent and every editor, and need nothing installed.
- Requirement IDs give the traceability a tool would: a test or pull request that cites `EX-3` can be found with a text search.

## Consequences

If a spec tool becomes a clear standard, these documents can move into it.
