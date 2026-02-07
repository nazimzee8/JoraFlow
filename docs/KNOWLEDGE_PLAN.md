# JoraFlow Master Knowledge Plan

This document is the shared blueprint for Lovable (frontend) and Codex (backend). It defines the non-negotiable contracts, security posture, and UI/UX requirements.

## 1. Core Mission & High-Level Architecture
**Mission:** Eliminate job-search fatigue through an automated, agentic recruitment dashboard.

**Bridge-First Strategy:** `docs/openapi.yaml` and `docs/TECHNICAL_INTEGRATION_GUIDE.md` are the source of truth. Any deviation is a breaking change.

**Backend Runtime:** Supabase Edge Functions (Deno). No Node.js-specific `fs`/`path` at runtime. (Local dev may use Node for tooling only.)

**Frontend Stack:** React 19, Tailwind CSS, Framer Motion, Lucide Icons.

## 2. Technical Data Contracts (Source of Truth)
**Database Schema:**
- `applications`: Primary record (includes `status`, `confidence_score`, `source_provider`, `source_channel`, `referral`).
- `status_history`: Mandatory for Sankey flow.
- `sync_logs`: Tracks agent progress (parsing/cleaning/complete).

**API Pattern:** Frontend uses `supabase.functions.invoke()`. Direct frontend writes to application status are prohibited; only AI agent or user actions via validated forms may update state.

## 3. Agentic Orchestration & Skills Directory
**Orchestrator Logic:** `backend/services/AgentOrchestrator.ts` uses keyword scoring to select skills. It auto-loads `Required References` from each skill.

**Skill Modules:**
- `security-guardrail`: Always active for ingestion; DNS validation + PII masking.
- `job-parsing-engine`: Multi-source extraction + de-duplication + reconciliation.
- `design-system`: UI system (Indigo/Slate, Sankey layout, Evidence Window).
- **Planned:** `browser-metadata-parser` (if later split from job-parsing-engine).

## 4. Hardened Security & Compliance (Zero-Trust)
- **Zero-Trust:** Never trust email bodies; sanitize snippets (DOMPurify) and validate inputs (Zod).
- **DNS Verification:** MX + SPF + DMARC checks before parsing; flag unverified domains in UI.
- **Credential Isolation:** OAuth tokens stored in Supabase Vault; LLM never receives raw tokens.
- **Malware Defense:** Strip attachments; process only text/plain or text/html.
- **Rate Limiting:** 5 sync attempts/minute; return 429.
- **Prompt Injection:** Detect + revoke session; log to `security_blacklist`.

## 5. Coding Conventions & Best Practices
- **TypeScript-first:** No `any`. Strict typing required.
- **Responsive Design:** Tailwind fluid grid; mobile ? 4K.
- **Realtime UI:** Supabase Realtime; UI pulses when `sync_logs` shows active.
- **Performance:** Target <1s LCP; lazy-load Sankey; memoize heavy charts.

## 6. External References & APIs
- **Primary AI:** Gemini 3 Pro.
- **APIs:** Gmail (restricted scopes), Outlook, Greenhouse, LinkedIn metadata.
- **Certificates:** Require TLS 1.3 where supported and valid CAs.

## 7. Implementation Instructions
**To Lovable:**
- Follow this plan and the design-system skill.
- Sankey must map to `status_history`.
- Use Evidence Window with masked snippets.
- Do not bypass the AgentOrchestrator for ingestion.

**To Codex:**
- Follow this plan and the security-guardrail skill.
- Edge Functions must be Deno-compatible.
- Inject `security-guardrail` for all parsing tasks.
- Follow SQL schema and OpenAPI exactly.
