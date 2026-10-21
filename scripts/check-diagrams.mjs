#!/usr/bin/env node
// Diagram guardrail. Fails (exit 1) when:
//   1. A ```mermaid block in any Markdown file doesn't parse, so it wouldn't render on GitHub or in an editor.
//   2. A fence is spelled like mermaid but not exactly `mermaid`, so it would show as plain text.
//   3. A workspace package is missing from docs/diagrams/architecture.md, or a service is missing
//      from every sequence diagram in docs/diagrams/.
//   4. A diagram file isn't mentioned in docs/diagrams/CHANGELOG.md, or (with --staged or --base)
//      a diagram changed without CHANGELOG.md changing too.
//
// Usage:
//   node scripts/check-diagrams.mjs                 all checks except change coupling
//   node scripts/check-diagrams.mjs --staged        also: staged diagram changes need a changelog entry
//   node scripts/check-diagrams.mjs --base <ref>    also: changes since merge-base with <ref> need one
//   node scripts/check-diagrams.mjs --parse-only <file.md>...   only check that these files render

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const diagramsDir = "docs/diagrams";
const architectureFile = `${diagramsDir}/architecture.md`;
const changelogFile = `${diagramsDir}/CHANGELOG.md`;

const args = process.argv.slice(2);
const parseOnly = args.includes("--parse-only");
const staged = args.includes("--staged");
const baseIndex = args.indexOf("--base");
const base = baseIndex === -1 ? undefined : args[baseIndex + 1];
const fileArgs = args.filter(
  (a, i) => !a.startsWith("--") && (baseIndex === -1 || i !== baseIndex + 1),
);

const problems = [];

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
}

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

/** Every fenced block in a Markdown file, with its info string and starting line. */
function fencedBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split("\n");
  let open;
  lines.forEach((line, i) => {
    const fence = /^(\s*)(`{3,}|~{3,})\s*([^`\s]*)/.exec(line);
    if (!open && fence) {
      open = { marker: fence[2], lang: fence[3] ?? "", line: i + 1, body: [] };
    } else if (open && fence?.[2].startsWith(open.marker) && !fence[3]) {
      blocks.push({ lang: open.lang, line: open.line, source: open.body.join("\n") });
      open = undefined;
    } else if (open) {
      open.body.push(line);
    }
  });
  return blocks;
}

function mermaidBlocks(file) {
  return fencedBlocks(read(file)).filter((b) => b.lang === "mermaid");
}

// 1 and 2: every mermaid block parses, and every mermaid-looking fence is spelled so it renders.
const { window } = new JSDOM("");
globalThis.window = window;
globalThis.document = window.document;
const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false, logLevel: "fatal" });

const markdownFiles =
  fileArgs.length > 0
    ? fileArgs.map((f) => relative(root, resolve(f)))
    : git("ls-files", "--cached", "--others", "--exclude-standard", "*.md").filter((f) =>
        existsSync(join(root, f)),
      );

for (const file of markdownFiles) {
  for (const block of fencedBlocks(read(file))) {
    if (block.lang !== "mermaid" && /^mermaid$/i.test(block.lang.replace(/[{}.]/g, ""))) {
      problems.push(
        `${file}:${block.line}: fence is "${block.lang}"; use exactly "mermaid" or it won't render.`,
      );
    }
    if (block.lang !== "mermaid") continue;
    try {
      await mermaid.parse(block.source);
    } catch (error) {
      problems.push(
        `${file}:${block.line}: Mermaid diagram doesn't parse:\n${String(error.message ?? error)}`,
      );
    }
  }
}

if (!parseOnly) {
  // 3: coverage. Every workspace package is in the architecture diagram; every service is in a sequence diagram.
  const workspaceDirs = read("pnpm-workspace.yaml")
    .split("\n")
    .map((l) => /^\s*-\s*["']?([\w-]+)\/\*["']?\s*(#.*)?$/.exec(l)?.[1])
    .filter(Boolean);
  const packages = workspaceDirs.flatMap((dir) =>
    existsSync(join(root, dir))
      ? readdirSync(join(root, dir))
          .filter((name) => existsSync(join(root, dir, name, "package.json")))
          .map((name) => ({ dir, name: JSON.parse(read(`${dir}/${name}/package.json`)).name }))
      : [],
  );

  const diagramFiles = existsSync(join(root, diagramsDir))
    ? readdirSync(join(root, diagramsDir))
        .filter((f) => f.endsWith(".md") && f !== "CHANGELOG.md" && f !== "README.md")
        .map((f) => `${diagramsDir}/${f}`)
    : [];

  if (!existsSync(join(root, architectureFile))) {
    problems.push(`${architectureFile} is missing. It holds the architecture diagram.`);
  } else {
    const architecture = mermaidBlocks(architectureFile)
      .map((b) => b.source)
      .join("\n");
    for (const pkg of packages) {
      if (!architecture.includes(pkg.name)) {
        problems.push(
          `${architectureFile}: package ${pkg.name} (${pkg.dir}/) isn't in the architecture diagram.`,
        );
      }
    }
  }

  const sequences = diagramFiles
    .flatMap(mermaidBlocks)
    .filter((b) => /^\s*sequenceDiagram/m.test(b.source))
    .map((b) => b.source)
    .join("\n");
  for (const pkg of packages.filter((p) => p.dir === "services")) {
    if (!sequences.includes(pkg.name)) {
      problems.push(
        `${diagramsDir}/: service ${pkg.name} isn't a participant in any sequence diagram.`,
      );
    }
  }

  // 4: changelog. Every diagram file has an entry, and diagram changes come with a changelog change.
  if (!existsSync(join(root, changelogFile))) {
    problems.push(`${changelogFile} is missing.`);
  } else {
    const changelog = read(changelogFile);
    for (const file of diagramFiles) {
      const name = file.slice(diagramsDir.length + 1);
      if (!changelog.includes(name)) {
        problems.push(`${changelogFile}: no entry mentions ${name}.`);
      }
    }
  }

  let changed;
  if (staged) {
    changed = git("diff", "--cached", "--name-only");
  } else if (base) {
    const mergeBase = git("merge-base", base, "HEAD")[0];
    changed = [
      ...git("diff", "--name-only", mergeBase),
      ...git("ls-files", "--others", "--exclude-standard"),
    ];
  }
  if (changed) {
    const changedDiagrams = changed.filter(
      (f) => f.startsWith(`${diagramsDir}/`) && f !== changelogFile,
    );
    if (changedDiagrams.length > 0 && !changed.includes(changelogFile)) {
      problems.push(
        `These diagrams changed without an entry in ${changelogFile}:\n  ${changedDiagrams.join("\n  ")}`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`Diagram check failed:\n\n${problems.join("\n\n")}`);
  process.exit(1);
}
