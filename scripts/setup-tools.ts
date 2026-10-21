// `pnpm setup:tools`: offers to install each missing tool in scripts/tools.ts, asking first. Uses
// Homebrew on macOS and Linux and winget on Windows. Without either, or without a terminal to ask
// in, it prints where to get each tool instead.

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { findInstaller, isInstalled, tools } from "./tools.ts";

const missing = tools.filter((t) => !isInstalled(t));
if (missing.length === 0) {
  console.log(`All tools are installed: ${tools.map((t) => t.name).join(", ")}.`);
  process.exit(0);
}

const installer = findInstaller();
const interactive = Boolean(process.stdin.isTTY && installer);
const prompt = interactive
  ? createInterface({ input: process.stdin, output: process.stdout })
  : undefined;

if (!installer) {
  console.log("No Homebrew (macOS, Linux) or winget (Windows) found, so install these yourself:\n");
}

for (const tool of missing) {
  console.log(`${tool.name}: ${tool.why}`);
  if (!installer || !prompt) {
    const command = installer ? installer.command(tool).join(" ") : undefined;
    console.log(`  Install: ${command ?? tool.install.url}\n`);
    continue;
  }
  const command = installer.command(tool);
  let answer: string;
  try {
    answer = await prompt.question(
      `  Install it with ${installer.name} (${command.join(" ")})? [Y/n] `,
    );
  } catch {
    // Ctrl+C or Ctrl+D: stop asking, without a stack trace.
    console.log("\nStopped. Run `pnpm setup:tools` again any time.");
    break;
  }
  if (/^n/i.test(answer.trim())) {
    console.log(`  Skipped. Other ways to install: ${tool.install.url}\n`);
    continue;
  }
  const [bin = "", ...args] = command;
  const result = spawnSync(bin, args, { stdio: "inherit" });
  console.log(
    result.status === 0
      ? `  Installed ${tool.name}.\n`
      : `  ${installer.name} couldn't install ${tool.name}. Try: ${tool.install.url}\n`,
  );
}

prompt?.close();
