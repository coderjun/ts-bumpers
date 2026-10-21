// Builds the starter zip for a Bumpers release, then checks that it works the way the README says
// to use it: unzip, git init, pnpm install, pnpm check. Used by .github/workflows/release.yml. Run
// it locally to try a release without publishing anything:
//   node scripts/build-starter.ts 1.2.0
// Builds from the last commit (HEAD), not uncommitted changes, and leaves dist/bumpers-v1.2.0.zip.
// Files marked export-ignore in .gitattributes (release machinery) are left out of the zip.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const version = process.argv[2] ?? "";
const tag = `v${version}`;
const name = `bumpers-${tag}`;
const zip = resolve("dist", `${name}.zip`);

function fail(message: string): never {
  console.error(`Release ${tag}: ${message}`);
  process.exit(1);
}

function run(command: string, args: string[], cwd = process.cwd()): string {
  return execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
}

function step(title: string, command: string, args: string[], cwd: string): void {
  console.log(`\n▶ ${title}: ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

// 1. The version is X.Y.Z, unused, and higher than every earlier release.
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`"${version}" isn't a version like 1.2.0.`);
const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
const newer = (a: number[], b: number[]) => {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
};
const released = run("git", ["tag", "--list", "v*.*.*"]).split("\n").filter(Boolean);
if (released.includes(tag)) fail("that version is already released.");
const latest = released.reduce<string | undefined>(
  (best, t) => (!best || newer(parse(t), parse(best)) ? t : best),
  undefined,
);
if (latest && !newer(parse(version), parse(latest))) {
  fail(`the latest release is ${latest}; a new release has to be higher.`);
}

// 2. Build the zip from the last commit. Only committed files go in, so nothing local can leak.
mkdirSync("dist", { recursive: true });
run("git", ["archive", "--format=zip", `--prefix=${name}/`, "-o", zip, "HEAD"]);
const contents = run("unzip", ["-Z1", zip]).split("\n");
const leaked = contents.filter((f) =>
  /\/(\.env|\.gitattributes|RELEASING\.md|\.github\/workflows\/release\.yml|scripts\/build-starter\.ts)$/.test(
    f,
  ),
);
if (leaked.length > 0) fail(`the zip contains files it shouldn't:\n  ${leaked.join("\n  ")}`);

// 3. Use it the way a newcomer would, following the README quick start.
const workspace = mkdtempSync(join(tmpdir(), "bumpers-smoke-"));
run("unzip", ["-q", zip, "-d", workspace]);
const starter = join(workspace, name);
step("Start a repository", "git", ["init", "--quiet"], starter);
step("Install", "pnpm", ["install", "--frozen-lockfile"], starter);
step("Check", "pnpm", ["check"], starter);

console.log(`\nBuilt and checked ${zip} (${contents.length} entries).`);
