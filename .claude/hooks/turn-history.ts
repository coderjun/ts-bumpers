// The turn history: a separate git repository in .claude/turn-history/ (gitignored) whose working
// tree is this project. Each Claude Code turn gets a commit when it starts and when it ends, so the
// Stop hook can see every file a turn changed, however it changed (edit tools, shell commands,
// formatters, someone's editor). The project's own .git is never read or written.
//
// Look back at it with git:
//   git --git-dir=.claude/turn-history log --stat refs/sessions/<session-id>
//   git --git-dir=.claude/turn-history diff <start-commit> <end-commit>
//
// Each session has its own branch (refs/sessions/<id>) and its own index file, so parallel sessions
// never contend for a lock. Sessions with no commit in the last 30 days are pruned.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const historyDir = ".claude/turn-history";
const retentionDays = 30;

const identity = {
  GIT_AUTHOR_NAME: "Claude Code turn history",
  GIT_AUTHOR_EMAIL: "turn-history@localhost",
  GIT_COMMITTER_NAME: "Claude Code turn history",
  GIT_COMMITTER_EMAIL: "turn-history@localhost",
};

function git(projectDir: string, args: string[], env: Record<string, string> = {}): string {
  return execFileSync(
    "git",
    [`--git-dir=${join(projectDir, historyDir)}`, `--work-tree=${projectDir}`, ...args],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...process.env, ...identity, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function safe(sessionId: string): string {
  return sessionId.replace(/[^\w-]/g, "_");
}

/** Creates the history repository if it doesn't exist yet. Safe to call every time. */
export function ensureHistory(projectDir: string): void {
  const dir = join(projectDir, historyDir);
  if (existsSync(join(dir, "HEAD"))) return;
  mkdirSync(dir, { recursive: true });
  execFileSync("git", ["init", "--bare", "--quiet", dir], { stdio: "ignore" });
  // The project's .gitignore already excludes this directory; this keeps the history from
  // recording itself even if that line is removed.
  mkdirSync(join(dir, "info"), { recursive: true });
  writeFileSync(join(dir, "info", "exclude"), `/${historyDir}/\n`);
}

/** Commits the working tree to the session's branch and returns the commit id. */
export function recordSnapshot(
  projectDir: string,
  sessionId: string,
  phase: "start" | "end",
): string {
  ensureHistory(projectDir);
  const id = safe(sessionId);
  const sessionRef = `refs/sessions/${id}`;
  const startRef = `refs/turn-start/${id}`;
  if (phase === "start") {
    // Drop the last turn's start first, so a failure below can't leave a stale one behind.
    tryGit(projectDir, ["update-ref", "-d", startRef]);
  }
  const index = { GIT_INDEX_FILE: join(projectDir, historyDir, `index-${id}`) };
  git(projectDir, ["add", "--all"], index);
  const tree = git(projectDir, ["write-tree"], index);
  const parent = tryGit(projectDir, ["rev-parse", "--verify", "--quiet", sessionRef]);
  // Nothing changed since the last snapshot: reuse it instead of adding an empty commit.
  const unchanged = parent && tryGit(projectDir, ["rev-parse", `${parent}^{tree}`]) === tree;
  const message = `${phase} of turn\n\nsession: ${sessionId}`;
  const commit = unchanged
    ? parent
    : git(projectDir, ["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", message]);
  git(projectDir, ["update-ref", sessionRef, commit]);
  if (phase === "start") git(projectDir, ["update-ref", startRef, commit]);
  return commit;
}

/** The commit recorded when the session's current turn started, if there is one. */
export function turnStart(projectDir: string, sessionId: string): string | undefined {
  return tryGit(projectDir, [
    "rev-parse",
    "--verify",
    "--quiet",
    `refs/turn-start/${safe(sessionId)}`,
  ]);
}

/**
 * Files that differ between two commits, as repo-relative paths, minus any matching a pattern in
 * .claude/turn-review-ignore (git glob pathspecs, one per line).
 */
export function changedFiles(
  projectDir: string,
  from: string,
  to: string,
  ignorePatterns: string[],
): string[] {
  const excludes = ignorePatterns.map((p) => `:(exclude,glob)${p}`);
  return git(projectDir, ["diff", "--name-only", "--no-renames", from, to, "--", ".", ...excludes])
    .split("\n")
    .filter(Boolean);
}

/** Deletes sessions with no commit in the last 30 days. Runs at most once a day. */
export function pruneHistory(projectDir: string): void {
  const dir = join(projectDir, historyDir);
  if (!existsSync(join(dir, "HEAD"))) return;
  const marker = join(dir, "last-prune");
  const day = 24 * 60 * 60 * 1000;
  if (existsSync(marker) && Date.now() - statSync(marker).mtimeMs < day) return;
  writeFileSync(marker, `${new Date().toISOString()}\n`);

  const cutoff = Date.now() / 1000 - retentionDays * 24 * 60 * 60;
  const refs = git(projectDir, [
    "for-each-ref",
    "--format=%(refname) %(committerdate:unix)",
    "refs/sessions",
  ])
    .split("\n")
    .filter(Boolean);
  let pruned = 0;
  for (const line of refs) {
    const [ref = "", date = "0"] = line.split(" ");
    if (Number(date) >= cutoff) continue;
    const id = ref.slice("refs/sessions/".length);
    tryGit(projectDir, ["update-ref", "-d", ref]);
    tryGit(projectDir, ["update-ref", "-d", `refs/turn-start/${id}`]);
    rmSync(join(dir, `index-${id}`), { force: true });
    pruned++;
  }
  if (pruned > 0) tryGit(projectDir, ["gc", "--prune=now", "--quiet"]);
}

function tryGit(projectDir: string, args: string[]): string | undefined {
  try {
    return git(projectDir, args) || undefined;
  } catch {
    return undefined;
  }
}
