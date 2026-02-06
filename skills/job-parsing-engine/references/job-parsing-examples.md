# Provider-Specific Parsing Examples

Use these examples to disambiguate classification or extraction patterns.

## Greenhouse
Subject examples:
- "Thanks for applying to <Company>"
- "Update regarding your application"
Phrases:
- "We have received your application" -> APPLIED
- "We'd like to schedule an interview" -> INTERVIEW

## Workday
Subject examples:
- "<Company> Application Update"
- "Your application status has been updated"
Phrases:
- "We will be moving forward with other candidates" -> REJECTED
- "Please complete the assessment" -> SCREENING

## Lever
Subject examples:
- "Application received at <Company>"
- "Next steps at <Company>"
Phrases:
- "Please select a time for a call" -> SCREENING
- "We would like to move you to the next round" -> INTERVIEW

## Ashby
Subject examples:
- "<Company> application received"
- "Interview scheduling"
Phrases:
- "Schedule a 30-minute interview" -> INTERVIEW

## iCIMS
Subject examples:
- "Thank you for your interest"
Phrases:
- "Position has been filled" -> REJECTED

## Generic ATS
Common patterns:
- "Keep your resume on file" -> REJECTED
- "Employment agreement" -> OFFER
- "Calendar invite" -> INTERVIEW
