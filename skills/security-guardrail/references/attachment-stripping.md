# Attachment Stripping

## Rules
- Drop all attachments during ingestion.
- Only pass text/plain and text/html to parsing.
- Log attachment count for audit, but never store files.
