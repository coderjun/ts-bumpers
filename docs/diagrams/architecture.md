# Architecture

The workspace packages and how they depend on each other. Every package in `packages/` and `services/` must appear here by its package name; `pnpm check:diagrams` fails otherwise.

```mermaid
flowchart LR
  client(["HTTP client"])

  subgraph services["services/"]
    example["@app/example<br/>answers greeting requests"]
  end

  subgraph packages["packages/"]
    contracts["@app/contracts<br/>Zod schemas and types"]
  end

  client -- "HTTP + JSON" --> example
  example -- "imports schemas, parses at the boundary" --> contracts
```

Rules the diagram reflects (from `AGENTS.md`):
- `@app/contracts` is the only package other packages may import.
- Services talk to each other over HTTP, never by importing each other. A service-to-service edge is labeled with its protocol.
