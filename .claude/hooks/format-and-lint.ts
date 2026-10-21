// PostToolUse hook: format the file Claude just edited with Biome (code, JSON, Markdown, YAML) and
// report remaining lint errors back to Claude. For Markdown, also check that its Mermaid diagrams
// parse, so a diagram that won't render is caught at once.
// Exit code 2 sends stderr to Claude so it fixes the problem; anything else stays silent.

import { execFileSync } from "node:child_process";
import { isAbsolute, relative } from "node:path";
import { projectDir, readHookInput } from "./hook-input.ts";

const file = readHookInput().tool_input?.file_path;
if (!file) process.exit(0);
const path = relative(projectDir, file);
if (path.startsWith("..") || isAbsolute(path)) process.exit(0); // outside the project

function run(command: string, args: string[]): string | undefined {
  try {
    execFileSync(command, args, { cwd: projectDir, encoding: "utf8", stdio: "pipe" });
    return undefined;
  } catch (error) {
    const { stdout = "", stderr = "" } = error as { stdout?: string; stderr?: string };
    return `${stdout}${stderr}`.trim();
  }
}

const problems: string[] = [];
const biome = run("pnpm", ["exec", "biome", "check", "--write", "--no-errors-on-unmatched", path]);
if (biome) problems.push(`Biome found problems in ${path}:\n${biome}`);
if (path.endsWith(".md")) {
  const diagrams = run("node", ["scripts/check-diagrams.ts", "--parse-only", path]);
  if (diagrams) problems.push(diagrams);
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join("\n\n")}\n`);
  process.exit(2);
}
