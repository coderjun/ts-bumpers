// Records the working tree as a git tree object, so the Stop hook can see every file a turn
// changed, however it changed: edit tools, shell commands, formatters. Tracked and untracked files
// count; gitignored files don't. The real index is never touched.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function git(cwd, args, env = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Hashes the working tree into a git tree object and returns its id. */
export function snapshotTree(cwd) {
  const dir = mkdtempSync(join(tmpdir(), "turn-snapshot-"));
  const index = join(dir, "index");
  try {
    try {
      // Starting from a copy of the real index lets git skip rehashing files whose stat is unchanged.
      copyFileSync(resolve(cwd, git(cwd, ["rev-parse", "--git-path", "index"])), index);
    } catch {
      // No index yet, or it's locked: start empty. Slower, same result.
    }
    git(cwd, ["add", "--all"], { GIT_INDEX_FILE: index });
    return git(cwd, ["write-tree"], { GIT_INDEX_FILE: index });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Where a session's start-of-turn snapshot is kept: inside .git, out of the working tree. */
export function snapshotFile(cwd, sessionId) {
  const dir = resolve(cwd, git(cwd, ["rev-parse", "--git-path", "claude-turn-snapshots"]));
  return join(dir, String(sessionId).replace(/[^\w-]/g, "_"));
}

/**
 * Files that differ between two snapshots, as repo-relative paths, minus any matching a pattern
 * in .claude/turn-review-ignore (git glob pathspecs, one per line).
 */
export function changedFiles(cwd, from, to, ignorePatterns) {
  const excludes = ignorePatterns.map((p) => `:(exclude,glob)${p}`);
  return git(cwd, ["diff", "--name-only", "--no-renames", from, to, "--", ".", ...excludes])
    .split("\n")
    .filter(Boolean);
}
