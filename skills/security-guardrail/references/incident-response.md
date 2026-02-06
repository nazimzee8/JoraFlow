# Incident Response Checklist

## Detection & Triage
- Confirm incident scope and affected systems.
- Preserve logs and evidence.

## Containment
- Revoke affected OAuth tokens.
- Disable compromised accounts or keys.
- Apply emergency rate limits if abuse is suspected.

## Eradication & Recovery
- Patch root cause.
- Restore services with verified clean state.
- Monitor for reoccurrence.

## Communication
- Notify internal stakeholders.
- Prepare user notifications if required.
- Document timeline and actions taken.

## Post-Incident
- Conduct a postmortem.
- Update runbooks and guardrails.
- Add regression tests where possible.
