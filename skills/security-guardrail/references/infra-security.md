# Infrastructure Security (Master Reference)

## Zero-Trust Ingestion Architecture
- Treat ingestion as an isolated segment; only pass validated data to parsing.
- Use least-privilege roles. Frontend role is read-only for `applications`.
- Require short-lived JWTs; validate at the Edge before AI logic runs.

## Defense-in-Depth
### SQL Injection
- Use Supabase RPC or PostgREST bindings only.
- Forbid raw SQL strings in app logic.
- Validate all inputs with Zod before persistence.

### XSS
- Sanitize all email snippets with DOMPurify.
- Enforce strict CSP: block `eval()` and restrict script sources.

### Malware Protection
- Strip attachments; process only text/HTML.

## Secure Communications
- Enforce TLS 1.3 where supported.
- Reject invalid/expired certificates.
- Only connect to trusted CA-signed endpoints.

## DNS Validation
- Perform MX lookup and SPF/DMARC checks on sender domains.
- Flag failures as High Risk and quarantine in UI.

## Session Protection
- Store tokens in HttpOnly cookies.
- Use AES-256-GCM for token encryption at rest where applicable.
