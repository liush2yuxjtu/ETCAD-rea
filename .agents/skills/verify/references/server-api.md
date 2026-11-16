# Server/API runtime reference

## Run

Reuse the project recipe to reach a listening service. Record the exact build/deployment and the relevant public route. Readiness and health checks establish reachability, not the behavior under test.

## Drive

For an API claim, use its public request boundary. For a UI save claim, submit through the UI and use API/storage reads only as additional proof. Use an authorized test record or reversible change; capture the original state and protect concurrent edits. Do not widen permissions merely to make the probe pass.

## Proof

Check the transport response, the application's result, and the intended affected record/count. Then independently read/reopen the record and compare the requested fields. A 200 with an empty affected-row list can mean that a permission policy matched no rows. A 401/403 cannot be overridden by a UI `writable` flag. A return value alone is not durability proof.

Where a form displays translated labels or shortened timestamps, compare untouched metadata too: changing an unrelated metric must not silently rewrite the source name, notes, or sub-minute precision. If a shared record changed concurrently, stop restoration rather than overwriting the new state.

For proposal/draft flows, verify the inverse claim: opening, cancelling, or editing the draft does not write to the external system or run the job. Inspect request evidence and relevant durable state before/after. A read-only fixture proves only that fixture's interaction contract; retain the real-host acceptance gate.

## Unlock

When writes fail, distinguish validation, auth/policy, transport, and read-back mismatch using non-secret diagnostics. Record the smallest missing prerequisite and continue independent work. Keep the original persistence requirement open when shipping a truthful read-only fallback. Never count that fallback as fulfillment of a requested save feature.

Stop/clean up only processes started for the probe, preserving evidence. Update the project recipe with the command or constraint actually observed; do not turn a one-project finding into an unconditional platform rule.
