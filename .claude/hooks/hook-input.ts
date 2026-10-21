// What Claude Code passes a hook on stdin, for the fields these hooks use.

import { readFileSync } from "node:fs";

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  stop_hook_active?: boolean;
  last_assistant_message?: string;
  tool_input?: { file_path?: string };
}

export function readHookInput(): HookInput {
  return JSON.parse(readFileSync(0, "utf8")) as HookInput;
}

export const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
