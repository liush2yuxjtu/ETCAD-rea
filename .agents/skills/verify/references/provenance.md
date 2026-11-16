# Verification workflow provenance

Checked 2026-09-22.

## Official sources

- Sid Bidasaria, Anthropic: [Stop babysitting your agents — Tokyo session](https://claude.com/code-with-claude/session/tyo-stop-babysitting-your-agents), 10 June 2026. The official page names the speaker and describes a walkthrough of workflows used by Claude Code engineers.
- [London session](https://claude.com/code-with-claude/session/ldn-stop-babysitting-your-agents), 19 May 2026. Its current description emphasizes routines, triggers, context, and steering.
- [Official Claude recording](https://www.youtube.com/watch?v=wI0ptqCSL0I). The official browser transcript export reported no transcript available. A separately published third-party transcription has now been read; its limitations are recorded below.
- Anthropic's [Claude Code skills documentation](https://code.claude.com/docs/en/skills) is the behavior documentation for the native skill family; see the repository's `UPSTREAM.md` for historical version evidence.

These session pages are not interchangeable with an adjacent talk such as “What's new in Claude Code”. Third-party prompt extractions are historical comparison material, not official source publication or a licensing grant.

## Transcript recovery and source limits

On 22 September 2026, the full available [SozAI transcription](https://sozai.app/transcript/stop-babysitting-agents/) was read from its opening at 00:16 through the closing thanks at 36:58. It identifies the Claude talk and reports 37:02 duration. [uListen](https://ulisten.ai/channels/claude/stop-babysitting-your-agents_wI0ptqCSL0I) independently indexes the exact official video ID and corroborates the main themes. These are third-party generated texts, not an Anthropic-published or word-for-word audio-verified transcript. Names and product words contain obvious recognition errors; use the official page for identity. Publication/transcription dates do not establish which event the recording came from.

The following are paraphrases and time ranges **reported by the third-party transcript**, not newly verified video timestamps:

- 07:07–09:04: reproduce an engineer's build, run, side-effect/database inspection and regression-check workflow with the tools and instructions the agent needs.
- 09:18–11:58: write, observe failure, debug and repeat toward the requested success criterion.
- 12:14–14:27: run the application, drive it through a browser, capture proof, and unblock authentication/state setup. The portable Run / Drive / Proof / Unlock headings summarize this sequence; they are not claimed as a verbatim slide transcription.
- 14:27–15:44 and 20:38–22:13: turn a working verification path into a shared skill and document newly resolved blockers for the next run.
- 22:34–26:32: use that skill on a real change, including fixing lint failures and verifying again; the demonstration's success is not evidence that a different project works.
- 26:32–36:58: session management and background loops follow verification. Discussion of automation does not authorize additional integrations, messages, parallel agents or paid services in a user's project.

The accessible third-party text is now read. The official transcript remains unavailable, and exact audio alignment is not established. Do not repeat the older blanket claim that no transcript can be found, or promote this recovery into an official transcript verification.

## Project-derived operational guidance

The Run / Drive / Proof / Unlock headings are this portable workflow's operational organization. Current guidance also draws on independently observed runtime cases: a storage write denied by row policy; a 200 update affecting zero rows; translated form metadata changing on an unrelated save; an input reset caused by unstable parent state; and proposal navigation that must leave durable records unchanged.

Those observations support targeted probes, not universal claims about a database, framework, or model. Historical source-corpus notes are a discovery index only. Recheck the named candidate and live surface; never present an old successful run as current proof.
