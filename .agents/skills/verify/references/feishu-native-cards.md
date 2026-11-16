# Feishu visual cards: real verification recipe

Observed 2026-09-23. Historical results are not a new runtime run.

## Target and readiness

- Work at the luckin-feishu-agent Git root. Check remote liush2yuxjtu/luckin-feishu-agent, branch, SHA and dirty state; read AGENTS.md and docs/verify-real-cards.md.
- Runtime: existing Supabase coffee-cards, enabled Qoder channel and authorized external Feishu test group. Preserve channel and callback authentication. Record config existence only; never export credentials.
- Supporting local check: npm run verify, Node >=20 and Python >=3.10. On the observed Mac use the existing ~/.local/bin and ~/.local/node/bin before system tools if necessary.
- Changed illustrations: node scripts/build-card-assets.mjs. Track gateway/visual.mjs, gateway/assets/*.svg, *.png and generated gateway/assets.mjs.
- Deploy six files: supabase/functions/coffee-cards/index.ts and gateway/{handler,clients,cards,callback,assets}.mjs. Read deployed files back independently and compare byte-for-byte to the candidate; record function version/hash. ACTIVE and /health ready are setup evidence only.
- After merge compare these files against origin/main too. Source equality is not a new browser run or a platform-provided deployment commit SHA.

## Real browser drive

Use mcp__cua_repl in the authorized side browser. Reacquire current tabs/state and fresh locators.

1. Open the authorized external group, choose its 瑞幸助手 member using the @ picker, then send a fresh ordinary customer request: 东升科技园2期4号楼店，一杯大杯冰的小奶酪拿铁，不另外加糖。请发可点选的报价卡给我，只看价格，不下单。 Avoid identical messages within ten minutes; resolver rejects ambiguity.
2. Open the new topic. Observe native illustration, product/quantity/size, independent ice/hot tiles, selected border, native price, quote ID/version/expiry, store and refresh button.
3. Click the ice tile at the real UI. Observe official preview returning and the same message updating to a higher version. Click refresh and verify another version change and consistent amount/specs.
4. Adjacent UI probe: request hot while valid, or click an expired card without changing its expiry. Unavailable hot with a truthful retained selection proves exception handling, not a successful hot conversion.
5. Correlate the group request with Qoder session/tool behavior for the agent-path claim. A direct authenticated MCP resend is recovery evidence, not a substitute for an automatically successful Qoder flow.

## Independent state and runtime logs

Use Supabase read-only SQL to project coffee_cards: id, message_id, version, status, and safe quote fields shop/drink/specs/totalFen/sourceResponseHash. Read coffee_card_events event_id/action/created_at separately; the connector may return only the last SQL statement.

In the browser open the coffee-cards Logs page. Refresh and wait for actual rows; a transient empty loading state is not missing events. Preserve coffee_callback_ack and coffee_preview for the exact card:
- actor_hash == quote_owner_hash and identity_match=true;
- received_at, ack_at and latency_ms <=3000. This measures server receive-to-response-construction, not network RTT;
- official total_fen / 100 == displayed amount; match shop/product/specs too;
- response_hash hashes JSON.stringify(parsed official result), not raw HTTP bytes;
- message_id stays the same while version increases.

Double-click suppression alone is not backend replay proof. Mark synthetic expiry/replay/changed-price tests CONTRACT_TEST; actual browser actions REAL_RUNTIME.

## Evidence, verdict and cleanup

Create a new timestamped docs/evidence/<run>/ directory with candidate/deployment file comparison, actual screenshots, visible card fields, selected log records, safe DB projection, local bundle/report and SHA256SUMS. Never archive the full environment, signed callback payload, credentials or full Airtable record.

Stop only owned temporary services; retain the existing Screen Lab if it remains a requested deliverable. Preserve the real card tab and prior evidence. Record git status.

PASS/FAIL/BLOCKED/SKIP apply to the exact scoped claim. Docs-only changes are SKIP and do not require another group message. Original full-product acceptance remains separate.

## Observed gotchas

- Feishu 230099/subcode10002 rejected direct RGBA background_style on temperature containers. Native default background plus green selected border worked. Investigate exact errors with current official docs and repeat the real UI after a fix.
- An unsent DB row is not already_sent. Recovery checks message_id and uses the same card/send UUID; do not delete state to hide failures.
- Provider failure must show the last quote with its original expiry and manual refresh. Do not fabricate a quote, extend expiry or automatically retry. Timeout recovery has contract evidence; final ice/refresh were real.
- v25 observed ice/refresh ACK166ms/112ms with matching ¥12.90. Prior v24 hot returned unavailable; do not relabel it v25 successful hot evidence.
- Stop at previewOrder. createOrder/payment/fulfillment/cancelOrder are NOT RUN without new specific authorization.

Official references:
- https://open.feishu.cn/document/feishu-cards/card-json-v2-components/containers/interactive-container
- https://open.feishu.cn/document/feishu-cards/card-callback-communication
- https://open.feishu.cn/document/server-docs/im-v1/image/create

## Thread replies and official temperature selection (observed 2026-09-23, v27)

- Reproduce in an existing Feishu topic, not only a new root message. The official chat-history API omits topic replies; enumerate returned thread IDs and query thread history. Keep bounded pagination and fail on incomplete/ambiguous identity. An old root can have a fresh reply, so do not limit root discovery to the message freshness window.
- In Qoder Forward Sessions open the exact topic Session, select the resolve/show tool events and inspect actual input/result. Session sess_00qasngkui0aproapsrs exposed the original resolve error and a text-only menu that never invoked show_coffee_menu. Do not infer a missing card implementation or lost menu memory from a resolve error.
- Successful v27 browser path in that existing topic: @瑞幸助手 再查一下这杯热的鲜萃轻轻茉莉，还是大杯少甜，发报价卡，只看价格。 Native card rendered ¥8.80; click ice then hot. Same message/card v1→v2→v3; actual SKU hot SP3257-00114, ice SP3257-00071. ACK79ms/381ms and independent DB readback matched. This is historical evidence, not a reusable PASS for a new candidate.
- Temperature selection now reads queryProductDetailInfo IDs and uses switchProduct operation=3 per official docs (https://open.luckincoffee.com/docs); verify an actual change of selected temperature, not just a successful callback. The read-only provider allowlist is queryProductDetailInfo, switchProduct, previewOrder.
- Distinguish timeouts from permission errors. v26 had a generic SEND_FAILED after about14s; it did not prove a permission issue. v27 gives official MCP requests25s and reports TimeoutError explicitly; successful retry is not retrospective proof of the original error cause.
- A duplicate short phrase may result in the Agent referring to an already sent card without calling the resolver. That observation does not prove duplicate-resolution acceptance; inspect the tool trace. Contract tests remain separately labelled.
- Template edits must be saved, read back after page reload, and exercised in a fresh topic/session. Record both prompt snapshots without credentials. Remove obsolete fixed test-drink goals; menu requests include “有哪些奶茶”, not just “新品”. No nonexistent confirmation controls.
- Browser Supabase Logs: filter Search events by card UUID, press Enter, then read actual rows after loading. Extract only coffee_callback_ack / coffee_preview JSON, not credentials. No-data while Refresh is disabled is loading, not proof of missing logs.

## Menu intent and bounded search (observed 2026-09-23)

- Test a NEW topic after independently reloading the saved Qoder template, using an ordinary request without asking for a card: “东升科技园2期4号楼店，想看看热的少甜奶茶，有什么可选？只查价格。”
- Inspect actual tool events, not only the final reply. The first template revision found a valid candidate immediately but continued more than 20 synonym searches. Preserve this FAIL trace; cancel only that test Agent turn and verify Session idle. This is not cancelOrder and must not disable the channel.
- A second saved template rule limited searches to two and required immediate menu rendering after a valid candidate. Fresh Session sess_00qay9bzb435stx9x7gc performed one search, resolve, show_coffee_menu(status=sent), and finished in 37s. This is observed prompt adherence for one run, not a server-enforced budget.
- Click “选这杯” in the actual native menu, then independently compare card, DB and logs. Observed card ea7b41f9-26c0-44fa-b78e-dd2eff322366 changed v1→v2 with official ¥8.80, 大杯/热/少甜/牛奶/不含轻咖. choose_0 callback ACK94ms and trusted identity matched. The full response hash is in the evidence package.
- Do not promote same-topic context to long-term memory. Cross-topic user preferences, full size/sugar/milk controls and actual duplicate-click replay remain separate acceptance checks.
