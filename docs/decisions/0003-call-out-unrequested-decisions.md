# 0003: Agents list the decisions nobody asked for

Status: accepted, 2026-10-21

## Context

An agent filling gaps in a prompt makes choices: a library, a default, a name, a scope cut. Unannounced, they look like part of the request and slip past review. `docs/decisions/` records significant choices, but only the ones someone thinks to record.

## Decision

Every agent turn that changes files ends with an `Unrequested decisions:` section, listing each choice the prompt didn't specify, or saying "none". Every pull request description has the same section. The Claude Code Stop hook (`.claude/hooks/review-turn-on-stop.ts`) and a CI job on pull requests require that the section is present.

## Why

- A fixed heading is something code can check. Whether a choice "counts" is judgment, but whether the agent addressed the question at all is not.
- Making the agent write "none" turns silent defaults into a stated claim that a reviewer can dispute.
- Small choices go in the turn's message; significant ones still get a decision record, so the log doesn't fill with noise.

Not a reason: completeness. The hook can't tell whether the list is complete. A model-based Stop hook could judge that, but it would cost money and be nondeterministic, against `AGENTS.md`'s "deterministic by default".

## Consequences

Every editing turn ends with a few extra lines.

Revised 2026-10-21: what a turn changed comes from a snapshot, not the transcript. The first version found changed files from the transcript's edit-tool calls, so files changed by shell commands (`sed`, scripts, `pnpm format`) went unseen. Now `snapshot-on-prompt.ts` records the working tree when a prompt is sent, and the Stop hook compares against it. A snapshot can't say who changed a file, so a file changed without an edit tool must be named in the final message: as changed by a command the agent ran, or under `Out-of-band changes:` if the agent didn't change it (the user's editor, a watcher). The agent knows which commands it ran; the hook doesn't. Files that change as a side effect, like `pnpm-lock.yaml`, are listed in `.claude/turn-review-ignore`.

The hook still reads the transcript for the final message (unless the `last_assistant_message` hook input is present) and for which files the edit tools touched. A change to Claude Code's transcript format could make it block wrongly. Without a snapshot, it falls back to the transcript's edit-tool calls, with the shell-command gap.

Revised again 2026-10-21: snapshots live in a separate git repository, `.claude/turn-history/` (gitignored), not in the project's `.git`. The first snapshot version wrote objects into the project's object store, where git's cleanup deleted them after about two weeks, and kept its pointer file in `.git/`. A separate repository leaves the project's `.git` alone, keeps a lasting history (a commit at the start and end of every turn, one branch per session, pruned after 30 days of inactivity), and keeps its own index, so each snapshot only rehashes changed files. `pnpm install` creates it, and the hooks create it if it's missing.

The hook can't verify that a file listed as out of band really was, and a file both the agent and someone else changed counts as the agent's.

To undo this, remove both hooks from `.claude/settings.json` and the `pull-request-body` CI job.
