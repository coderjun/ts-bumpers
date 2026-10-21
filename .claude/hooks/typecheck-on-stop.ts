// Stop hook: before Claude finishes a turn, the workspace must typecheck.
// On failure, exit code 2 keeps Claude working with the errors; stop_hook_active prevents a loop.

import { execFileSync } from "node:child_process";
import { projectDir, readHookInput } from "./hook-input.ts";

if (readHookInput().stop_hook_active) process.exit(0);

try {
  execFileSync("pnpm", ["typecheck"], { cwd: projectDir, encoding: "utf8", stdio: "pipe" });
} catch (error) {
  const { stdout = "", stderr = "" } = error as { stdout?: string; stderr?: string };
  process.stderr.write(`Typecheck failed. Fix these before finishing:\n${stdout}${stderr}\n`);
  process.exit(2);
}
