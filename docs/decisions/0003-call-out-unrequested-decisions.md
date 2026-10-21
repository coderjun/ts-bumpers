# 0003: Agents list the decisions nobody asked for

Status: accepted, 2026-10-21

## Context

An agent filling gaps in a prompt makes choices: a library, a default, a name, a scope cut. Unannounced, they look like part of the request and slip past review. `docs/decisions/` records significant choices, but only the ones someone thinks to record.

## Decision

Every agent turn that edits files ends with an `Unrequested decisions:` section, listing each choice the prompt didn't specify, or saying "none". Every pull request description has the same section. The Claude Code Stop hook (`.claude/hooks/review-turn-on-stop.mjs`) and a CI job on pull requests require that the section is present.

## Why

- A fixed heading is something code can check. Whether a choice "counts" is judgment, but whether the agent addressed the question at all is not.
- Making the agent write "none" turns silent defaults into a stated claim that a reviewer can dispute.
- Small choices go in the turn's message; significant ones still get a decision record, so the log doesn't fill with noise.

Not a reason: completeness. The hook can't tell whether the list is complete. A model-based Stop hook could judge that, but it would cost money and be nondeterministic, against `AGENTS.md`'s "deterministic by default".

## Consequences

Every editing turn ends with a few extra lines. The Stop hook reads the session transcript to find the turn's edits and final message, so a change to Claude Code's transcript format could make it skip the check silently or block wrongly; it prefers the `last_assistant_message` hook input when present. To undo this, remove the hook from `.claude/settings.json` and the `pull-request-body` CI job.
