# Threat-Model Checklist

## Data Exposure
- Ensure full email bodies are never persisted.
- Verify backups do not contain raw ingestion buffers.

## Phishing & Spoofing
- Validate sender domain format before MX checks.
- Flag mismatched From/Reply-To domains.

## Injection & XSS
- Sanitize all HTML snippets with `dompurify` before rendering.
- Encode output by default; avoid dangerouslySetInnerHTML unless sanitized.

## Auth & Session
- Enforce PKCE for OAuth flows.
- Invalidate sessions after 24h inactivity.
- Rotate refresh tokens and store securely.

## Access Control
- Enforce RLS on every table.
- Validate `user_id` scoping on all reads and writes.

## Abuse & Rate Limits
- Rate limit ingestion endpoints.
- Detect repeated failed OAuth attempts.
