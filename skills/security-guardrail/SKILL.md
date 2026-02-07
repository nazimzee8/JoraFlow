---
name: security-guardrail
description: Security and privacy protocols for JoraFlow; use when handling email ingestion, data storage, authentication, or API validation.
---
# Security Guardrail\r?\n\r?\n## Hardened Security Addendum\r?\nThis skill enforces Zero-Trust ingestion, defense-in-depth controls, secure communications, and strict least-privilege access for Gmail/Outlook processing.\r?\n
## Overview
Apply these security and privacy rules whenever designing or implementing ingestion, storage, API validation, or authentication for JoraFlow.

## Zero-Trust Ingestion
- Never store the full email body in the database.
- Procedure: ingest -> parse metadata in-memory -> discard body -> store structured JSON.
- Store only minimal fields needed for analytics and UI rendering.

## Validation Standards
- Enforce strict Zod schemas for all API requests.
- Sanitize any HTML snippets before rendering with `dompurify`.
- Implement MX record verification for sender domains when feasible to flag spoofing/phishing.

## Authentication & Access
- Use Supabase Auth with PKCE flow.
- Sessions expire after 24 hours of inactivity.
- All database access uses Row Level Security (RLS).

## References
- `references/storage-policy.md`: Data minimization and retention notes.
- `references/validation-checklist.md`: API validation and sanitization checklist.
- `references/auth-rls.md`: Auth + RLS requirements and examples.




\n## Regex & DNS Logic\nUse the regex and DNS rules defined in eferences/regex-dns-logic.md when validating sender domains and email metadata. Load that reference before implementing validation logic.\n
\n## Required References\n- eferences/ files listed below must be loaded when executing this skill.\n- eferences/storage-policy.md\n- eferences/validation-checklist.md\n- eferences/auth-rls.md\n- eferences/infra-security.md\n- eferences/dns-risk-logic.md\n- eferences/attachment-stripping.md\n- eferences/regex-dns-logic.md\n- eferences/dpia-template.md\n- eferences/security-test-checklist.md\n- eferences/incident-response.md\n
