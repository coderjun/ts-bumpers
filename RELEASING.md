# Releasing Bumpers

How a version of Bumpers gets published. This file, the release workflow, and its build script are left out of the starter zip (see `.gitattributes`).

## Promote a version

1. Make sure `main` has what you want to release and its CI is green.
2. Pick the version, using [semantic versioning](https://semver.org/):
   - patch (`1.0.1`): fixes, nothing a user has to change;
   - minor (`1.1.0`): new guardrails or features that existing projects can adopt;
   - major (`2.0.0`): changes a project made from an older version would have to migrate to, such as a new Node version.
3. Run the release: on GitHub, Actions > Release > Run workflow, from `main`, with the version. Or:

   ```bash
   gh workflow run release.yml -f version=1.2.0
   ```

The workflow runs `pnpm check`, builds `bumpers-v1.2.0.zip`, and tests it the way the README says to use it: unzip, `git init`, `pnpm install`, `pnpm check`. Only then does it tag the commit `v1.2.0` and publish a GitHub Release with the zip and release notes generated from the merged pull requests. If any step fails, nothing is tagged or published.

## Try it first

Build and test the zip locally without publishing anything:

```bash
node scripts/build-starter.ts 1.2.0   # builds from the last commit; leaves dist/bumpers-v1.2.0.zip
```

## What's in the zip

Every committed file except the ones marked `export-ignore` in `.gitattributes`. Uncommitted and gitignored files (`.env`, `node_modules`, the turn history) can't get in, because the zip is built with `git archive` from the commit. To leave another file out, add it to `.gitattributes`, and to the check in `scripts/build-starter.ts`.

## The template repository

The repo is also a GitHub template, so people can click "Use this template" instead of downloading the zip. A template copies every file, including the release machinery, so the release workflow only runs in `coderjun/ts-bumpers`.
