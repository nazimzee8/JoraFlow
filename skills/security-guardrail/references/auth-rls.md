# Auth + RLS

## Supabase Auth (PKCE)
- Use PKCE flow for OAuth providers.
- Refresh tokens stored securely; never log tokens.

## Session Policy
- Session expires after 24 hours of inactivity.

## RLS
- Enable RLS on all tables.
- Every query must include `user_id` filtering under RLS policies.
