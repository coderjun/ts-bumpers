# Diagram changelog

Newest first. Add an entry whenever a diagram in this folder is added, changed, or removed: the date, the file, what changed, and why. `pnpm check:diagrams` fails if a diagram changes without a change to this file, or if a diagram file has no entry here.

## 2026-10-21

- Added `architecture.md`: the workspace packages, the HTTP client, and the import from `@app/example` to `@app/contracts`. Why: the starter now requires an architecture diagram.
- Added `greeting-sequence.md`: the greeting request, including the rejection of a malformed body (EX-3). Why: every service needs at least one sequence diagram.
