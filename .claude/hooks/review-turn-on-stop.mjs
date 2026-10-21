#!/usr/bin/env node
// Stop hook: before Claude finishes a turn that changed files, check what the turn left behind.
//   1. The final message has an "Unrequested decisions:" section, listing the choices Claude made
//      that the prompt didn't ask for, or saying "none".
//   2. If the turn changed source but no diagram, the final message has a "Diagrams:" line saying
//      why no diagram needed to change.
//   3. The final message names every file that changed without an edit tool: changed by a command
//      Claude ran, or out of band (someone's editor, a watcher), which only Claude can tell apart.
//   4. The diagrams still render, cover every package, and have changelog entries.
// Changed files come from comparing the working tree with the snapshot snapshot-on-prompt.mjs took
// as the turn started, minus .claude/turn-review-ignore. Without a snapshot, they come from the
// transcript's edit-tool calls, and check 3 is skipped.
// On failure, exit code 2 keeps Claude working with the reasons; stop_hook_active prevents a loop.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { changedFiles, snapshotFile, snapshotTree } from "./worktree-snapshot.mjs";

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

const toolEdited = blocks
  .filter((b) => b.type === "tool_use" && editTools.has(b.name))
  .map((b) => b.input?.file_path ?? b.input?.notebook_path)
  .filter(Boolean)
  .map((p) => (isAbsolute(p) ? relative(projectDir, p) : p));

/** Every file the turn changed, by snapshot, or undefined if there's no usable snapshot. */
function snapshotChanges() {
  try {
    const file = snapshotFile(projectDir, input.session_id);
    if (!existsSync(file)) return undefined;
    const ignoreFile = join(projectDir, ".claude/turn-review-ignore");
    const ignore = existsSync(ignoreFile)
      ? readFileSync(ignoreFile, "utf8")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#"))
      : [];
    const start = readFileSync(file, "utf8").trim();
    return changedFiles(projectDir, start, snapshotTree(projectDir), ignore);
  } catch {
    return undefined;
  }
}

const changed = snapshotChanges();
const edited = [...new Set(changed ?? toolEdited)];
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
    `This turn changed source (${sourceChanged.join(", ")}) but no diagram in docs/diagrams/. If the architecture or a flow changed, update the diagram and add a CHANGELOG.md entry. If not, add a line to your final message: "Diagrams: no change needed, because <reason>."`,
  );
}

// A file counts as named if its path, or one of its directories followed by "/", is in the message.
const named = (f) =>
  f
    .split("/")
    .map((_, i, parts) => parts.slice(0, i + 1).join("/") + (i < parts.length - 1 ? "/" : ""))
    .some((p) => finalMessage.includes(p));
const unexplained = (changed ?? []).filter((f) => !toolEdited.includes(f) && !named(f));
if (unexplained.length > 0) {
  problems.push(
    `These files changed during this turn, but not through your edit tools:\n  ${unexplained.join("\n  ")}\nName each in your final message (a directory ending in "/" covers what's under it). If a command you ran changed it, say which. If you didn't change it, list it under "Out-of-band changes:" so the user knows it changed outside your work (their editor, a watcher, another process). Don't revert out-of-band changes. Patterns in .claude/turn-review-ignore are never listed here.`,
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
