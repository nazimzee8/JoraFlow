---
name: job-parsing-engine
description: Parse job-related emails and job-board notifications into structured status updates (applied, screening, interview, offer, rejected), extracting company, title, and event details; use when handling recruiting emails, ATS notifications, or application status threads.
---
# Job Parsing Engine

## Overview
Use this skill to normalize job-application emails into a consistent status record with provider detection, status classification, entity extraction, and confidence scoring.

## Workflow
1. Detect provider (ATS) if possible.
2. Classify status using priority + negation rules.
3. Extract company, role, and any event date/time.
4. Assign confidence; if low, set status to UNKNOWN.
5. For threads, resolve conflicts by latest email unless a final decision is explicit.

## Provider Detection (Heuristic)
Check for known ATS domains/markers first, then fall back to content-based classification.
Common markers:
- Greenhouse: `greenhouse.io`, `gh-status-update`, `greenhousemail.com`
- Workday: `myworkdayjobs.com`, `workday.com`, "Candidate Home"
- Lever: `lever.co`, `jobs.lever.co`, "Application Received"
- Other ATS: `icims.com`, `smartrecruiters.com`, `brassring.com`, `jobvite.com`, `ashbyhq.com`, `taleo.net`

## Status Classification
Priority order (highest to lowest):
1. REJECTED
2. OFFER
3. INTERVIEW
4. SCREENING
5. APPLIED
6. UNKNOWN

Negation handling:
- If negation appears (e.g., "not moving forward", "unable to offer"), classify as REJECTED even if other positive phrases appear.

Thread rule:
- Use the latest email in a thread unless an earlier email clearly contains a final decision (explicit rejection or offer).

## Extraction Protocol
Dates:
- If multiple dates are present, prioritize the one adjacent to "interview", "assessment", or "call".
- Store time as local time; include timezone only if explicitly stated.

Company:
- Prefer explicit company name in header or signature.
- Fallback to sender domain, stripping subdomains like `mail.` or `jobs.`.

Job title:
- Prefer the first quoted or bolded title near "position" or "role".
- Fallback to subject line pattern: "Your application for <Title>".

## Confidence Scoring
Assign a confidence score (0.0 to 1.0):
- 0.9: Strong provider + strong phrase match
- 0.7: Strong phrase match only
- 0.5: Weak phrase match, ambiguous content
- 0.3: No clear match, inferred from context

If confidence < 0.5, set status to UNKNOWN.

## Output Schema (Example)
{
  "provider": "greenhouse",
  "status": "INTERVIEW",
  "company": "Acme",
  "title": "Software Engineer",
  "event_date": "2026-02-10",
  "event_time": "10:30",
  "event_timezone": "EST",
  "confidence": 0.9,
  "source_email_id": "..."
}

## References
- `references/job-parsing-examples.md`: Provider-specific examples and phrasing patterns. Load this when you need concrete examples.
- `references/test-corpus-template.md`: Template for building a labeled test corpus. Load this when creating tests or evaluation sets.
- `references/validation-checklist.md`: Edge-case checklist for QA. Load this during validation or debugging.
\n## Required References\n- eferences/ files listed below must be loaded when executing this skill.\n- eferences/job-parsing-examples.md\n- eferences/test-corpus-template.md (when building tests)\n- eferences/validation-checklist.md (when validating)\n
