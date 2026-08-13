# Releasing `mainstreet-oracle`

There was no release document until 2026-08-13, and an audit that day found every defect of this project
living in exactly that gap: a release that believed it had happened, a package page pointing at a dead
name, and five branches from which the abandoned package could still be published. This file is short on
purpose — it records what is TRUE about releasing here, not a process anyone has to follow from memory.

## The canonical package is `mainstreet-oracle`

Unscoped, on npm. The scoped `@raskhaaa/mainstreet-oracle` is **abandoned** and must never be published
again. It is still installable — npm serves `@raskhaaa/mainstreet-oracle@0.9.0` — and it will never receive
a fix, which is worse than not existing, because nothing on that page says so.

⛔ **Five branches of this repo still declare the scoped name** (measured 2026-08-13):
`add-smithery-config` 0.9.0 · `cli-audit-catalog` 0.8.0 · `fix-railway-urls-toolcount` 0.9.2 ·
`mcp-registry-prep` 0.8.0 · `publish-workflow` 0.8.0. None of them carries any publish guard. A tag pushed
onto one of them publishes the dead package. `add-smithery-config` declares exactly the version npm serves
for that scope, which is most likely where it came from.

## How a release actually happens

`.github/workflows/publish.yml` triggers on `push` of a tag matching `v*.*.*`, and on `workflow_dispatch`.
**A commit named `release(x.y.z)` publishes nothing.** `1d57bed` of 2026-07-30 is such a commit, its whole
purpose was to fix a README pointing at the dead package, and fourteen days later npm still served 0.9.2 —
because no tag was ever pushed. There is no newer tag than `v0.9.0`; 0.9.2 reached npm untagged, by hand or
by dispatch.

So the release is: bump `package.json`, commit, **push the tag**, and check the workflow ran.

⛔ **Never bump the version ahead of publishing.** The sibling repo's `server.json` is submitted to the MCP
registry and must name a version that EXISTS on npm; a number set in advance produces a manifest true in
its shape and false at install time.

## What the workflow refuses

Three guards, all added 2026-08-13, all of them BEFORE `npm publish`:

1. **The full suite**, not one file of three. The gate deciding what reaches users was weaker than the one
   a developer runs locally.
2. **Tag vs `package.json` version** (tag pushes only). The sibling repo shipped 0.1.0 under a tag saying
   v0.2.0 because nothing compared them, and a pushed tag cannot be re-pointed without rewriting public
   history — that mistake cost a version number.
3. **Package name vs `mainstreet-oracle`** (both paths, deliberately). Guard 2 proves the tag and version
   agree; it says nothing about WHICH package ships. On a stale branch declaring the dead scope at 0.9.2, a
   `v0.9.2` tag passes guard 2 and publishes the wrong package. If the package is ever renamed on purpose,
   this fails loudly and the new name is written into the workflow by hand — that is intended.

⛔ These guards live in the workflow **at the tagged commit**. A tag on a stale branch runs that branch's
workflow, which has none of them. The guards protect `main`; only removing the stale branches closes the
rest, and that is not an automated decision.

## Pending — needs Phil's npm credentials

Neither has been done; both are stated here rather than in a chat log so they survive the session.

```bash
npm deprecate @raskhaaa/mainstreet-oracle "moved to mainstreet-oracle - this scope is abandoned and receives no fixes"
```

Deprecate, never unpublish: unpublishing breaks anyone who already depends on it, while a deprecation notice
shows on every install and leaves working installs working. With no version range it covers all versions.

And `0.9.3` still is not on npm. It is the release that fixes the README naming the dead scope sixteen
times on the package page, so publishing it and deprecating the scope are the same job done from both ends.

## The dead scope is also in the directories

Measured 2026-08-14 by `scripts/probe-directory-listings.js`, which reports this on every run.

The MCP registry holds four entries for `io.github.philpof102-svg/mainstreet`. **Three of them — 0.8.2,
0.8.3, 0.9.0 — name `@raskhaaa/mainstreet-oracle`.** The newest, 0.9.1, declares no package and routes to
the hosted remote, which answers `tools/list` with 43 tools, so it is healthy; but a client that pins a
version, or lists them, is pointed at the abandoned package. Deprecating on npm helps here too: the notice
travels with the package wherever it is resolved from.

Smithery is stale rather than wrong: 17 tools indexed, "19 MCP tools" in its own description, against 43
served — its two fields already disagree. That listing was created 2026-06-05 from `add-smithery-config`,
whose `smithery.yaml` names four tools and was never merged to main. Refreshing it is a gesture on the
Smithery account. Note that bringing a `smithery.yaml` to main means writing what to advertise and how,
which is sales copy, not a measurement — so this document does not propose one.
