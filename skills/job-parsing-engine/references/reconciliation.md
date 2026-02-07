# Reconciliation & Fuzzy Matching

## Matching Rules
- Normalize company and title (lowercase, strip punctuation).
- Compute similarity between (company, title) pairs.
- Merge if similarity >= 0.85.

## Source Priority (timestamp within 5 minutes)
1. Manual Entry
2. Job Board Metadata
3. AI Email Parsing

## Conflict Handling
- Keep highest priority values for company/title/status.
- Store lower-priority source as evidence metadata.
