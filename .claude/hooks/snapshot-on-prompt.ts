// UserPromptSubmit hook: record the working tree in the turn history as the turn starts, so the
// Stop hook can tell exactly which files this turn changed. Never blocks the prompt and prints
// nothing (stdout from this hook would be added to Claude's context). If it fails, the Stop hook
// falls back to the transcript's record of edit-tool calls.

import { projectDir, readHookInput } from "./hook-input.ts";
import { recordSnapshot } from "./turn-history.ts";

try {
  const { session_id } = readHookInput();
  if (session_id) recordSnapshot(projectDir, session_id, "start");
} catch {
  // Fall back silently; see above.
}
