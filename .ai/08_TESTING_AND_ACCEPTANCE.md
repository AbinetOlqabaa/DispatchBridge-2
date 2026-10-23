# Phase 8 — Testing and Acceptance

## Rules
Inspect existing test tooling first. Reuse it. Never claim a command passed unless it was run in the current workspace. If a tool is unavailable, say so and give a manual alternative.

## Test layers
- Unit: validation, quantity arithmetic/decimal precision, state transitions, permission helpers, locale formatting.
- Integration: auth/session, membership authorization, dispatch creation, idempotency, view receipt, receipt submission, discrepancy review, notification outbox and audit.
- Security: cross-tenant IDOR, unauthorized role actions, forged business IDs, mass assignment, expired/replayed invitation/share tokens, file access, export access, duplicate/replayed writes.
- UI/component: validation feedback, loading/empty/error/retry states, navigation and responsive components.
- End-to-end: registration/sign-in → onboarding/business selection → partner/location → dispatch with multiple lines → submit/share → recipient authenticated detail view → proof-of-view → receipt report → sender review/resolution → audit and notifications.
- Regression: all previously working features, including map/telemetry, scanner/checkpoints, PDF manifest, CSV import/export, analytics, languages and theme if they still exist.

## Responsive test matrix
At minimum check 390x844, 768x1024, 820x1180, 1024x768 and 1440x900. Prefer also 360x800, 1180x820 and 1280x800. Test every major route for both tablet orientations. Record routes, viewports, methods and results.

## Release gates
- Lint/typecheck/build passes.
- Relevant tests pass with test count and failures reported accurately.
- No known critical security issue left unacknowledged.
- All required flows work with real configured persistence, or sandbox-only limitations are clearly documented.
- No false provider delivery claims.
- Tablet layouts pass the viewport matrix or remaining failures are listed as blockers.
- No critical flow is implemented as a fake success.
