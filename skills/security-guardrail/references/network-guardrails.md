# Network Guardrails

## WAF Header Verification
- Expect headers like:
  - `x-waf-threat-score`
  - `x-waf-geo-ip`
  - `x-waf-request-id`
- If missing or malformed, downgrade trust level and log an audit warning.

## TLS Enforcement
- Require HTTPS for all outbound requests.
- Enforce TLS 1.3 where supported by the runtime.
- Reject invalid/expired certificates.

## Geo-IP
- Optionally block or flag regions based on policy.
