#!/usr/bin/env node
// UserPromptSubmit hook: snapshot the working tree as the turn starts, so the Stop hook can tell
// exactly which files this turn changed. Never blocks the prompt and prints nothing (stdout from
// this hook would be added to Claude's context). If it fails, the Stop hook falls back to the
// transcript's record of edit-tool calls.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { snapshotFile, snapshotTree } from "./worktree-snapshot.mjs";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const file = snapshotFile(projectDir, input.session_id);
  // Remove the last turn's snapshot first, so a failure below can't leave a stale one behind.
  rmSync(file, { force: true });
  const tree = snapshotTree(projectDir);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${tree}\n`);
} catch {
  // Fall back silently; see above.
}
