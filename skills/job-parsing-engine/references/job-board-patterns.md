# Job Board Parsing Patterns

## LinkedIn
- URL patterns: `linkedin.com/jobs/view/`, `linkedin.com/jobs/collections/`
- Confirmation headers: "Application sent", "Applied on"

## Indeed
- URL patterns: `indeed.com/viewjob`, `indeed.com/jobs`
- Confirmation headers: "Application submitted", "Your application has been sent"

## Greenhouse
- URL patterns: `boards.greenhouse.io`, `greenhouse.io`
- Confirmation headers: "Application received", "Thanks for applying"

## Referral Detection
- Look for tags like "Referral", "Employee referral", "Referred by" in page metadata or confirmation text.
