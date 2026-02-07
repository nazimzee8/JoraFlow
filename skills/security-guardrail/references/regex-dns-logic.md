# Regex & DNS Logic

## Email Pre-Filter (cheap heuristic)
Purpose: discard obviously non-job emails before LLM parsing.

### Subject/Body Keyword Regex
- Must match at least one:
  - `(?i)\b(application|applied|interview|assessment|screening|offer|rejection|not\s+moving\s+forward)\b`
- Or ATS domains in From:
  - `(?i)\b(lever\.co|greenhouse\.io|workday\.com|myworkdayjobs\.com|ashbyhq\.com|icims\.com|jobvite\.com|taleo\.net|smartrecruiters\.com)\b`

## Domain Validation
### Domain Format Regex
- Allow only:
  - `(?i)^[a-z0-9-]+(\.[a-z0-9-]+)+$`

### MX Lookup (Required)
- If no MX records, mark as `High Risk` and quarantine.

### SPF Check
- Query TXT for `v=spf1`.
- If no SPF record, mark as `High Risk`.

### DMARC Check
- Query `_dmarc.<domain>` TXT for `v=DMARC1`.
- If missing, mark as `High Risk`.

## Risk Flagging Logic
- If MX missing OR SPF missing OR DMARC missing, set `risk_flag = high`.
- Store reason: `risk_reason = 'mx_missing' | 'spf_missing' | 'dmarc_missing'`.
