# Prompt Injection Response

## Detection Signals
- Attempts to override system instructions.
- Requests to exfiltrate secrets or access hidden data.
- Instructions to ignore security rules.

## Response
- Revoke session JWT immediately.
- Log origin IP to `security_blacklist`.
- Return a generic security error without revealing detection rules.
