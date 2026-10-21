#!/usr/bin/env node
// Stop hook: before Claude finishes a turn that edited files, check what the turn left behind.
//   1. The final message has an "Unrequested decisions:" section, listing the choices Claude made
//      that the prompt didn't ask for, or saying "none".
//   2. If the turn changed source but no diagram, the final message has a "Diagrams:" line saying
//      why no diagram needed to change.
//   3. The diagrams still render, cover every package, and have changelog entries.
// On failure, exit code 2 keeps Claude working with the reasons; stop_hook_active prevents a loop.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
if (input.stop_hook_active) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const editTools = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);

/** The transcript entries since the user's last prompt (tool results don't count as prompts). */
function currentTurn(transcriptPath) {
  const entries = readFileSync(transcriptPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    })
    .filter((e) => e.type === "user" || e.type === "assistant");
  const isPrompt = (e) =>
    e.type === "user" &&
    !e.isMeta &&
    (typeof e.message?.content === "string" ||
      e.message?.content?.some?.((block) => block.type === "text"));
  const start = entries.findLastIndex(isPrompt);
  return entries.slice(start + 1);
}

const turn = currentTurn(input.transcript_path);
const blocks = turn.flatMap((e) =>
  e.type === "assistant" && Array.isArray(e.message?.content) ? e.message.content : [],
);

const edited = blocks
  .filter((b) => b.type === "tool_use" && editTools.has(b.name))
  .map((b) => b.input?.file_path ?? b.input?.notebook_path)
  .filter(Boolean)
  .map((p) => (isAbsolute(p) ? relative(projectDir, p) : p));
if (edited.length === 0) process.exit(0);

// The final message is the text after the turn's last tool call.
const lastToolUse = blocks.findLastIndex((b) => b.type === "tool_use");
const finalMessage =
  input.last_assistant_message ??
  blocks
    .slice(lastToolUse + 1)
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

const problems = [];

if (!/unrequested decisions/i.test(finalMessage)) {
  problems.push(
    'Your final message needs an "Unrequested decisions:" section. List each choice you made that the prompt didn\'t ask for (a library, a name, a default, a scope cut, a behavior change), with a one-line reason, or write "Unrequested decisions: none." A significant one also gets a record in docs/decisions/.',
  );
}

const isSource = (f) =>
  /^(packages|services|apps)\/[^/]+\/src\/.+\.(ts|tsx|js|mjs)$/.test(f) &&
  !/\.(test|spec)\.[^.]+$/.test(f);
const sourceChanged = edited.filter(isSource);
const diagramsChanged = edited.some((f) => f.startsWith("docs/diagrams/"));
if (sourceChanged.length > 0 && !diagramsChanged && !/^\W*diagrams:/im.test(finalMessage)) {
  problems.push(
    `This turn changed source (${[...new Set(sourceChanged)].join(", ")}) but no diagram in docs/diagrams/. If the architecture or a flow changed, update the diagram and add a CHANGELOG.md entry. If not, add a line to your final message: "Diagrams: no change needed, because <reason>."`,
  );
}

try {
  execFileSync("node", ["scripts/check-diagrams.mjs", "--base", "HEAD"], {
    cwd: projectDir,
    encoding: "utf8",
    stdio: "pipe",
  });
} catch (error) {
  problems.push(String(error.stderr || error.message).trim());
}

if (problems.length > 0) {
  process.stderr.write(`Before finishing:\n\n- ${problems.join("\n\n- ")}\n`);
  process.exit(2);
}
