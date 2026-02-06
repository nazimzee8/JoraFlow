# Minimal Security Test Checklist

## Ingestion
- Verify full email body is never persisted.
- Ensure ingestion buffer is purged after parsing.

## Validation
- Zod schemas reject unknown fields.
- HTML sanitization is applied before rendering.

## Auth
- PKCE enforced on OAuth flows.
- Sessions expire after 24h inactivity.

## Access Control
- RLS enabled on all tables.
- RLS policies enforce `user_id` scoping.

## Logging
- Tokens are not logged.
- PII is redacted from logs.

## Abuse
- Rate limits in place for ingestion endpoints.
- Alerts on repeated OAuth failures.
