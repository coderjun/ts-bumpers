// Runs after every `pnpm install` (the "prepare" script). Sets up what a fresh clone needs:
//   1. the git hooks (lefthook.yml),
//   2. the Claude Code turn history (.claude/hooks/turn-history.ts),
//   3. a report of command-line tools that are missing, with how to get them.
// It never prompts, because pnpm install also runs in CI and editors, and never fails the install
// over something optional.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ensureHistory, historyDir } from "../.claude/hooks/turn-history.ts";
import { isInstalled, tools } from "./tools.ts";

const projectDir = process.cwd();
const inCI = Boolean(process.env.CI);

if (!existsSync(".git")) {
  console.log(
    "Skipped setup: this folder isn't a git repository yet. Run git init, then pnpm install again.",
  );
  process.exit(0);
}

const lefthook = spawnSync("lefthook", ["install"], { stdio: "inherit" });
if (lefthook.error)
  console.log("Skipped git hooks: lefthook isn't installed. Run pnpm install again.");

if (!inCI) {
  try {
    ensureHistory(projectDir);
  } catch (error) {
    console.log(`Couldn't set up the turn history in ${historyDir}: ${String(error)}`);
  }

  const missing = tools.filter((t) => !isInstalled(t));
  if (missing.length > 0) {
    console.log("\nOptional tools not installed:");
    for (const tool of missing) console.log(`  ${tool.name}: ${tool.why}`);
    console.log("Run `pnpm setup:tools` to install them.\n");
  }
}
