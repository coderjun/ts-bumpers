# Specification: <RELEASE>

What <RELEASE> must do. Each requirement has an ID so tests and pull requests can cite it. Open questions are marked as such and get resolved by a decision record in `decisions/`.

How to write requirements:
- One prefix per area (`EX-`, `API-`, `DATA-`), numbered from 1. Never reuse a retired ID.
- Each requirement is one testable statement. Tests cite it in their `describe` name, e.g. `describe("greet (EX-3)")`.
- Mark an unresolved requirement as "open question", with the candidates, and resolve it with a decision record.

## Example

The example contract and service. Replace this section with your own.
- EX-1: A greeting request has a name (trimmed, 1 to 100 characters) and an optional `formal` flag that defaults to false.
- EX-2: A greeting response has a message.
- EX-3: The example service parses the request body with `GreetingRequest` at its boundary and rejects a malformed request before doing any work.

## <AREA>

- <PREFIX>-1: <requirement>.
- <PREFIX>-2: Open question. <The question, and the candidates.> Decide this after <what would settle it>.
