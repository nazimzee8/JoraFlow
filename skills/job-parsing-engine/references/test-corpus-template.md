# Test Corpus Template

Purpose: Build a labeled set of emails for evaluation and regression testing.

## Format (JSONL suggested)
Each line is one email record.

Fields:
- id: Unique identifier
- subject: Email subject
- from: Sender email
- body: Raw email body (text)
- provider_expected: Expected provider (or "unknown")
- status_expected: Expected status label
- company_expected: Expected company
- title_expected: Expected job title
- event_date_expected: Expected date (YYYY-MM-DD) or null
- event_time_expected: Expected time (HH:MM) or null
- event_timezone_expected: Expected timezone (e.g., "EST") or null
- notes: Optional notes for edge cases

Example record:
{
  "id": "email-001",
  "subject": "Your application for Software Engineer",
  "from": "jobs@greenhousemail.com",
  "body": "Thank you for your interest in Acme...",
  "provider_expected": "greenhouse",
  "status_expected": "APPLIED",
  "company_expected": "Acme",
  "title_expected": "Software Engineer",
  "event_date_expected": null,
  "event_time_expected": null,
  "event_timezone_expected": null,
  "notes": "Basic applied confirmation"
}

## Suggested Coverage
- 10+ records per provider (Greenhouse, Workday, Lever, Ashby, iCIMS)
- 10+ generic ATS records
- 5+ records with conflicting phrases
- 5+ records with multiple dates
- 5+ records with missing company or title
