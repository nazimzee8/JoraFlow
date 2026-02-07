# Rate Limiting Policy

## Policy
- Max 5 sync attempts per user per minute.
- On breach: return HTTP 429 (Too Many Requests).

## Response Body
```json
{ "error": "rate_limited", "retry_after_seconds": 60 }
```

## Notes
- Use a shared store (Redis/Upstash/Supabase) for production.
- In-memory maps are acceptable only for local dev.
