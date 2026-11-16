# Recent project verification patterns

Observed from recent project work and ChatGPT sessions on 2026-09-16 through 2026-09-20. These are examples of paths that actually produced evidence; they are not permanent commands. A project's own verifier overrides this file once created.

## business-world-agent-diaper

**Surface:** Next.js Business World + Eve agent.

**Observed verification path:**
- exact Vercel Preview / candidate URL;
- browser drive through `/chat` → Eve session → user message;
- inspect resulting state/API behavior and auth boundary;
- verify a 401 path where auth protection is expected;
- capture browser/runtime evidence from the same candidate.

**Tools actually used:** Grokbot real Chromium/browser drive, Vercel Preview, API requests/curl, Eve CLI for build/session checks.

**Important boundary:** `typecheck`, `eve build`, deployment READY, or `/api/health` alone are setup/diagnostic evidence, not a PASS for the product flow. Model-backed tool calls and approval-gated writes must be driven separately when in scope.

## ChatCut / html-artifacts

**Surface:** interactive landing/product demo.

**Observed verification path:**
- open the exact preview/production candidate;
- Playwright Chromium at desktop and mobile viewports;
- verify hydration and interactive islands;
- click/Send/Generate through the demo rather than watching a passive animation;
- confirm interactive edits are not overwritten by passive transcript animation;
- inspect horizontal overflow, console errors, page errors;
- preserve screenshots plus machine-readable report.

**Tools actually used:** Playwright, Chromium, Vercel Preview / GitHub Pages candidate URLs.

## glyph-factory

**Surface:** browser UI, Developer Lab, Aha Lab.

**Observed verification path:**
- exact preview/Pages candidate;
- drive `/developer-lab` and `/aha-lab`;
- trigger real asset/screen interactions;
- compare expected asset/screen registry behavior;
- exercise in Chromium and, where used, WebKit;
- capture screenshots and browser-visible outcomes.

**Tools actually used:** ChatGPT webapp-testing/Playwright, Chromium, WebKit, Grokbot browser capture, Vercel Preview / GitHub Pages.

## pet-store-mcp-app

**Surface:** MCP server + web UI + persisted favorites.

**Observed verification path:**
- real MCP smoke through public tools/resources such as `search_pets`, `get_pet`, and the MCP UI resource;
- real browser drive of product list, filter, favorite action;
- reload and verify favorite persistence;
- verify favorite filtering and visible product count/content;
- check console/page errors;
- inspect `/api/health` only as supporting runtime evidence.

**Tools actually used:** MCP client/smoke calls, Playwright, browser reload/read-back, Vercel Preview, HTTP health request.

## win-agent-os

A project verifier already exists:

`.cursor/skills/verify-win-eve-os/SKILL.md`

For its canvas-viewer surface it defines:
- isolated ephemeral-port launch;
- explicit doctor health gate;
- Playwright Chromium + curl drive;
- feature-map recipes;
- artifacts under `artifacts/verify-win-eve-os/<feature-id>/`;
- targeted cleanup that preserves proof.

Broader Win Agent OS verification has also used Eve strict evals, Mac mini runtime smoke, exact Vercel candidates, tool routing/QC checks, and real state/session behavior.

**Rule:** maintain the existing project verifier for its surface instead of creating a duplicate root verifier.

## resume / claude-resume-kit

**Surface:** generated PDF artifact.

**Observed verification path:**
- run the repository's aggregate verification/build path;
- render every requested PDF;
- confirm page count and A4/single-page constraints where applicable;
- inspect rendered pages for truncation, overlap, and garbling;
- validate embedded hyperlinks/click-through behavior;
- preserve rendered snapshots/results.

**Tools actually used:** repository build/verification scripts, PDF rendering, PDF structure/link validation, visual inspection.

## Cross-project lessons

1. **Candidate identity matters.** Evidence from another SHA/preview is not proof for the current head.
2. **Drive the user's surface.** UI-first changes require UI interaction; API calls underneath are supporting evidence only.
3. **Persistence requires read-back.** Action → reload/reopen/new session → observe state.
4. **Protected previews are BLOCKED unless a valid authenticated path is actually driven.**
5. **Build/CI/READY are setup evidence.** They never substitute for runtime behavior.
6. **Capture before judging.** Screenshots, terminal panes, response bodies, session/tool traces, or rendered documents should survive cleanup.
7. **Persist the working path.** After a cold-start verification succeeds, write or maintain the project's verifier so the next session does not rediscover it.
