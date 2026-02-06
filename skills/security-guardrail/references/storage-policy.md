# Storage Policy

## Data Minimization
- Store only normalized fields: provider, status, company, title, event date/time, confidence, source email id.
- Do not store full email bodies.

## Retention
- Purge raw ingestion buffers immediately after parsing.
- Log only metadata needed for debugging (timestamps, provider, status).
