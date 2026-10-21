// Command-line tools this repo uses that pnpm can't install. scripts/prepare.ts reports the missing
// ones after every install; scripts/setup-tools.ts offers to install them. To add a tool, add an
// entry here.

import { spawnSync } from "node:child_process";

export interface Tool {
  name: string;
  /** Why the repo wants it, in a sentence a newcomer can act on. */
  why: string;
  /** A command that succeeds when the tool is installed. */
  check: [string, ...string[]];
  /** Package names for each installer, and a page with other ways to install. */
  install: { brew: string; winget: string; url: string };
}

export const tools: Tool[] = [
  {
    name: "gitleaks",
    why: "Scans each commit for secrets (API keys, tokens) before it leaves your machine. CI scans too, but by then the secret is pushed.",
    check: ["gitleaks", "version"],
    install: {
      brew: "gitleaks",
      winget: "Gitleaks.Gitleaks",
      url: "https://github.com/gitleaks/gitleaks#installing",
    },
  },
  {
    name: "gh",
    why: "The GitHub CLI. Agents use it to open pull requests and read CI results.",
    check: ["gh", "--version"],
    install: { brew: "gh", winget: "GitHub.cli", url: "https://cli.github.com" },
  },
];

export function isInstalled(tool: Tool): boolean {
  const [command, ...args] = tool.check;
  return spawnSync(command, args, { stdio: "ignore" }).status === 0;
}

export interface Installer {
  name: string;
  command(tool: Tool): string[];
}

/** Homebrew on macOS and Linux, winget on Windows, or undefined if neither is available. */
export function findInstaller(): Installer | undefined {
  const works = (command: string) =>
    spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
  if (process.platform !== "win32" && works("brew")) {
    return { name: "Homebrew", command: (t) => ["brew", "install", t.install.brew] };
  }
  if (process.platform === "win32" && works("winget")) {
    return {
      name: "winget",
      command: (t) => ["winget", "install", "--exact", "--id", t.install.winget],
    };
  }
  return undefined;
}
