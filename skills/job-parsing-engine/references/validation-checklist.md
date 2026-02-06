# Validation Checklist (Email Edge Cases)

Use this during QA and debugging.

- Conflicting phrases ("moving forward" + "not moving forward")
- Multiple dates in one email (interview vs assessment)
- Multiple roles in a single thread
- Forwarded or quoted email chains
- Auto-reply messages that include old content
- International time formats (24-hour, dd/mm/yyyy)
- Missing company name; sender is a generic domain (e.g., `no-reply@system.com`)
- Titles without "role" or "position" keywords
- Calendar invites with minimal text
- HTML-only emails with missing text/plain
- Duplicate notifications for the same event
- Status regression (interview -> applied)
- Offer language without the word "offer"
