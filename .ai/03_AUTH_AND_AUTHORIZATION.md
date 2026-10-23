# Phase 3 — Authentication, Registration and Authorization

## Objective
Audit and complete authentication and membership-scoped authorization without replacing working systems unnecessarily.

## Required user journeys
- Registration with name, email, password, confirm-password validation, password visibility toggle, phone capture, terms/privacy acknowledgement where configured, and clear validation.
- Sign in, sign out, session expiry/refresh behavior, password reset, and useful invalid-credential/rate-limit messages that do not leak account existence.
- Google/OAuth only if actually configured. Phone verification only if a real SMS provider is configured. Never fake a successful verification.
- Explicit onboarding: create a business or accept an invitation; handle a user who belongs to multiple businesses and make active business context visible.
- Role-aware dashboards/navigation for Super Administrator, Business Owner, Sender, Receiver.
- A controlled, documented, one-time super-admin provisioning flow; no default password, public backdoor, or client-side privilege escalation.

## Authorization rules
- Treat UI route guards as usability, not security. Enforce authorization in server routes/functions and database rules.
- Resolve permissions from authenticated identity + active business membership + resource relationships. Never trust role/business IDs supplied by client without checking them.
- A user may hold different roles in different businesses. Do not rely on one global role string.
- Deny by default and test IDOR/cross-tenant attempts for reads, writes, exports, uploads and nested resources.
- Protect invitation tokens: store hashes where appropriate, use expiry, single-use semantics, anti-replay and safe error handling.
- Rate-limit sensitive endpoints when supported; use secure cookies/session settings appropriate to the deployed architecture; avoid logging secrets or credentials.

## Deliverables
- Implement/fix applicable auth and onboarding pages and server-side checks.
- Document provider setup and environment variables in `.env.example` without real secrets.
- Add tests for authentication state, membership switching, role permission boundaries, invitation expiry/replay, reset flows and unauthorized resource IDs.
- Update `.ai/BUILD_STATE.md`; identify which flows are real, mocked, or blocked by provider configuration.
