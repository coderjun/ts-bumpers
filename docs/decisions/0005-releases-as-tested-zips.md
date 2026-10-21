# 0005: Releases are tested starter zips, promoted by hand

Status: accepted, 2026-10-21

## Context

People should be able to start a project from a known-good version of Bumpers without cloning its history. GitHub already attaches a "Source code (zip)" to every release, and can mark a repository as a template ("Use this template"). Neither checks that what people get actually works.

## Decision

A manually run workflow (`.github/workflows/release.yml`) takes a version, runs `pnpm check`, builds `bumpers-vX.Y.Z.zip` with `git archive`, and smoke-tests it by following the README quick start in a clean folder. Only if all of that passes does it tag the commit and publish a GitHub Release with the zip. Release-only files are marked `export-ignore` in `.gitattributes`, so they're left out of the zip and of GitHub's own source downloads. The repository is also a template, for people who'd rather start from `main` on GitHub.

## Why

- Promoting by hand keeps releases deliberate; every merge to `main` isn't a release.
- Running the workflow, rather than pushing a tag, means nothing is tagged unless the zip passes. A pushed tag would exist even when the build failed.
- `git archive` only includes committed files, so `.env`, `node_modules`, and the turn history can't leak into a release.
- The smoke test catches what the repo's own CI can't: a starter that works as a clone but not from a zip. For example, the diagram check needs a git repository, which the quick start's `git init` provides.

Not a reason: hiding Bumpers' history. The decision records and diagram changelog stay in the zip because they explain the guardrails.

## Consequences

Versions follow semantic versioning, described in `RELEASING.md`. Template users get every file, including the release workflow, so the workflow only runs in `coderjun/ts-bumpers`. To publish from a fork or a renamed repository, change that condition.
