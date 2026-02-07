# DNS Risk Logic

## Checks
- MX record exists.
- SPF record present and passes.
- DMARC policy present.

## Risk Flagging
- If MX missing or SPF/DMARC fails, mark sender domain as High Risk.
- Persist a `risk_flag` field for UI badge display.
