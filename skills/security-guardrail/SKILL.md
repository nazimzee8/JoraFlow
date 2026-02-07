---
name: security-guardrail
description: Security and privacy protocols for JoraFlow; use when handling email ingestion, data storage, authentication, API validation, and network-layer defenses.
---
# Security Guardrail

## Hardened Security Addendum
This skill enforces Zero-Trust ingestion, defense-in-depth controls, secure communications, and strict least-privilege access for Gmail/Outlook processing.

## Overview
Apply these security and privacy rules whenever designing or implementing ingestion, storage, API validation, authentication, or network-level protections for JoraFlow.

## Zero-Trust Ingestion
- Never store the full email body in the database.
- Procedure: ingest -> parse metadata in-memory -> discard body -> store structured JSON.
- Store only minimal fields needed for analytics and UI rendering.
- Micro-segmentation: Ingestion is isolated from parsing until validation passes.

## Network-Level Guardrails
- Verify WAF-injected headers (e.g., threat score, geo-IP) on all Edge requests.
- Rate limit sync attempts to 5 per minute per user; return HTTP 429 on breach.
- Enforce TLS 1.3 for outbound requests where supported and reject invalid certificates.

## Validation Standards
- Enforce strict Zod schemas for all API requests.
- Sanitize any HTML snippets before rendering with `dompurify`.
- Implement MX/SPF/DMARC checks for sender domains to flag spoofing/phishing.
- Strip attachments; process only text/plain and text/html.

## Authentication & Access
- Use Supabase Auth with PKCE flow.
- Sessions expire after 24 hours of inactivity.
- All database access uses Row Level Security (RLS).
- Frontend role is read-only for `applications`.

## Prompt Injection Response
- Detect prompt injection attempts in user input or email content.
- Immediately revoke the session JWT and log origin IP to `security_blacklist`.

## Regex & DNS Logic
Use the regex and DNS rules defined in `references/regex-dns-logic.md` when validating sender domains and email metadata. Load that reference before implementing validation logic.

## References
- `references/storage-policy.md`: Data minimization and retention notes.
- `references/validation-checklist.md`: API validation and sanitization checklist.
- `references/auth-rls.md`: Auth + RLS requirements and examples.
- `references/infra-security.md`: Zero-Trust, defense-in-depth, and secure communications.
- `references/dns-risk-logic.md`: DNS/MX/SPF/DMARC checks and risk flagging.
- `references/attachment-stripping.md`: Attachment handling and malware protection.
- `references/regex-dns-logic.md`: Regex and DNS validation patterns.
- `references/network-guardrails.md`: WAF headers and TLS enforcement guidance.
- `references/rate-limiting.md`: Rate limiting policy and error handling.
- `references/prompt-injection.md`: Prompt injection detection and response.
- `references/dpia-template.md`: DPIA template for data processing review.
- `references/security-test-checklist.md`: Minimal security test checklist.
- `references/incident-response.md`: Incident response checklist.

## Required References
- `references/storage-policy.md`
- `references/validation-checklist.md`
- `references/auth-rls.md`
- `references/infra-security.md`
- `references/dns-risk-logic.md`
- `references/attachment-stripping.md`
- `references/regex-dns-logic.md`
- `references/network-guardrails.md`
- `references/rate-limiting.md`
- `references/prompt-injection.md`
- `references/dpia-template.md`
- `references/security-test-checklist.md`
- `references/incident-response.md`
