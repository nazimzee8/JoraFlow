# JoraFlow Technical Integration Guide

This guide keeps Lovable (frontend) and Codex (backend) aligned on data contracts, API behavior, security, and deployment constraints for the Day 4 demo.

## 0. Stack Decisions (Current)
- **Backend runtime:** Supabase Edge Functions (Deno)
- **Database:** Supabase Postgres
- **API style:** Supabase Edge Function endpoints (e.g., `supabase.functions.invoke('parse-inbox')`)
- **Frontend data flow:** Supabase Realtime subscriptions
- **LLM provider:** Gemini 3 Pro (single provider)

## 1. Source-of-Truth Data Model
The backend is the source of truth. The frontend must match these fields exactly.

### Table: `applications`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "company": "string",
  "role": "string",
  "status": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "UNKNOWN",
  "confidence_score": 0.0,
  "last_sync": "timestamp",
  "source_provider": "string",
  "source_email_id": "string|null"
}
```

### Table: `status_history`
Tracks transitions for Sankey/funnel flow.

```json
{
  "id": "uuid",
  "application_id": "uuid",
  "from_status": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "UNKNOWN",
  "to_status": "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "UNKNOWN",
  "changed_at": "timestamp",
  "source": "email" | "manual" | "import"
}
```

### Table: `sync_logs`
Tracks parsing state for realtime UI.

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "idle" | "parsing" | "done" | "error",
  "progress": 0,
  "last_sync": "timestamp",
  "message": "string|null"
}
```

**Frontend rule:** TypeScript types must match these names and enums exactly.

## 2. API Contracts (Edge Functions)
### Parse Inbox
- **Endpoint:** Supabase Edge Function `parse-inbox`
- **Invocation:** `supabase.functions.invoke('parse-inbox')`
- **Auth:** Supabase JWT required
- **Purpose:** Trigger agentic parsing and job status extraction

Request body:
```json
{
  "user_id": "uuid",
  "days": 90
}
```

Response:
```json
{
  "queued": true,
  "job_count_estimate": 120
}
```

### Sync Status (Fallback)
- **Endpoint:** Edge Function `sync-status`
- **Purpose:** Polling fallback if realtime is unavailable

Response:
```json
{
  "status": "idle" | "parsing" | "done" | "error",
  "last_sync": "timestamp"
}
```

## 3. Realtime UX Sync (Lovable)
Parsing is async. Frontend should reflect backend status.

- Backend writes to `sync_logs` as it processes.
- Frontend subscribes to `sync_logs` (realtime) to update UI instantly.
- UI shows a Parsing Status component with loading state until `done`.

## 4. Security & Privacy Guardrails
Enforce in backend implementation:

- Never store full email bodies.
- Use strict Zod validation for all API requests.
- Sanitize any HTML snippets using `dompurify` before rendering.
- Validate sender domains (MX lookup) to flag spoofing.
- Require Supabase Auth JWT for all endpoints.
- Enforce RLS on all tables.

## 5. Token Efficiency & Rate Limiting
To control costs:

- Pre-filter emails with lightweight keyword checks before LLM parsing.
- Batch parsing requests where possible.
- Rate limit inbox parsing per user.

## 6. Skills Directory Deployment Constraint (Edge Functions)
`AgentOrchestrator.ts` reads skills from `skills/` using Node `fs`. This will **not** work inside Supabase Edge Functions (Deno).

**Required adaptation for Edge:**
- Bundle skills into JSON at build time, or
- Store skill definitions in Supabase and load via DB/API, or
- Use `import` with `Deno.readTextFile` and ship skills with the function (if allowed).

## 7. Team Sync Checklist
- Shared schema updated? Update frontend types and backend models.
- New API endpoint? Document request/response in this file.
- New skill? Ensure backend can load it and frontend knows effects.
- Security change? Update `security-guardrail` references.

## 8. Ownership
- **Backend (Codex):** Skills, ingestion, parsing, DB writes, security, auth.
- **Frontend (Lovable):** UI, realtime updates, data visualization, user flows.

## 9. Project Directive (4-Day Plan)
No `Project_Directive` file found in this repo yet. If you have one, add it to `docs/` and link it here so both Lovable and Codex can follow the same plan.

## 9. Project Directive (4-Day Plan)
See docs/Project_Directives.txt for the official 4-day execution pipeline. Key points:
- Day 1: SQL schema + OpenAPI spec + OAuth scopes
- Day 2: UI build + mock data + realtime listeners
- Day 3: Edge Functions + Gemini parsing + security guardrails
- Day 4: Integration + animations + full demo run

Directive: Do not deviate from the OpenAPI spec or SQL schema established on Day 1. Frontend must be responsive; backend must enforce Zero-Trust security.

## 10. Day-by-Day Sync Checklist
Use this to keep Lovable and Codex aligned on exact files and endpoints.

Day 1 (Backend - Codex)
- SQL schema created: tables pplications, status_history, sync_logs
- OpenAPI spec created: docs/openapi.yaml
- OAuth scopes configured in Supabase dashboard

Day 2 (Frontend - Lovable)
- UI components wired to mock data
- TypeScript types aligned with pplications + status_history
- Realtime subscriptions set to status_history and sync_logs

Day 3 (Backend - Codex)
- Edge Functions deployed: parse-inbox, sync-status
- Orchestrator in Edge-compatible form (no Node s)
- Security guardrails active (DNS validation, PII scrubbing)

Day 4 (Integration)
- Lovable swaps mock calls for supabase.functions.invoke('parse-inbox')
- Dashboard live updates verified
- Demo run: 100 sample emails end-to-end

## 11. Contract Enforcement Checklist
- Any API change must update docs/openapi.yaml first.
- Frontend requests must match the OpenAPI request bodies exactly.
- Backend responses must match the OpenAPI response schemas exactly.
- If a field is added/renamed, update both TypeScript types and DB schema.
- Do not ship changes that break the contract without updating this guide.
\n## 12. Skill References Loading\nAll skills must declare a 'Required References' section in SKILL.md. The orchestrator auto-loads those reference files and appends them to the system prompt. If you add a new reference file, add it to that section.\n

## 13. Security Blacklist + WAF + Rate Limits
- security_blacklist table defined in docs/migrations/001_security_blacklist.sql.
- Edge Functions must log prompt-injection attempts to security_blacklist.
- WAF headers (x-waf-*) should be validated on every Edge request.
- Rate limit sync attempts to 5/min and return HTTP 429 with etry_after_seconds.

Frontend notes (Lovable):
- If a 429 is returned, show a friendly cooldown state.
- If a 403 waf_blocked or high_risk_sender is returned, show a security warning.

## 14. Frontend Error Handling (Lovable)
Map backend security errors to clear UI states:
- 429 rate_limited: show cooldown state with retry timer.
- 403 waf_blocked: show a security warning and stop retries.
- 403 high_risk_sender: mark sender as High Risk and quarantine.
- 401 prompt_injection_detected: show a generic security error and log out user.

## 15. Security Tests (Codex)
Backend tests live in ackend/tests/ and are run via:
- 
pm run backend:test
These validate prompt injection detection, WAF header logic, and rate limiting.


## 16. Lovable UI Mapping (Security)
Front-end should render these states based on API responses:
- ate_limited: show cooldown timer + retry CTA
- waf_blocked: show security warning + support link
- high_risk_sender: tag sender as High Risk in UI
- prompt_injection_detected: force logout + show generic security error

## 17. Evidence Window + A11y Requirements (Lovable)
- The Sankey node detail view must show a "Source Snippet" (Evidence Window) from the email that triggered the status.
- Masked PII only; never display raw phone or address text.
- Add ARIA labels to all Sankey SVG paths and enable high-contrast mode for funnel stages.
- Provide a "Scanning Inbox" skeleton state before first sync completes.

## 18. Cross-Platform Reconciliation
- Merge email-derived and job-board metadata into one application record.
- Fuzzy match Company + Role at >= 85% similarity.
- Source priority within 5 minutes: Manual > Job Board > Email parsing.
- Store lower-priority source as evidence for the Evidence Window.

## 19. Job Board Metadata Requirements
- Parse LinkedIn/Indeed/Greenhouse confirmation pages.
- Extract source_channel (e.g., LinkedIn Easy Apply vs Direct Career Site).
- Detect referral tags and store eferral = true for badge display.
