# Provider Security Notes

## Google (Gmail)
- Use OAuth with the minimum required scopes.
- Prefer read-only scopes where possible.
- Handle restricted scopes with Google verification requirements if full message access is ever requested.
- Avoid storing access tokens in logs; store refresh tokens securely.

## Microsoft (Outlook/Graph)
- Use OAuth with least-privilege scopes.
- Prefer delegated permissions for end-user access.
- Respect tenant admin consent requirements for higher-risk scopes.

## General
- Clearly surface to users which scopes are requested and why.
- Revoke tokens on user account deletion.
- Implement webhook signature verification where supported.
