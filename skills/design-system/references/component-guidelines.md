# Component Guidelines

Use these rules when designing or reviewing components.

## Cards
- Glassmorphism: `backdrop-filter: blur(10px)`
- Background: `rgba(255,255,255,0.6)`
- Border: `1px solid rgba(255,255,255,0.25)`
- Shadow: subtle, low elevation

## Buttons
- Primary button: background `#4F46E5`, text white
- Secondary button: background transparent, border `#4F46E5`, text `#4F46E5`
- Success button: background `#10B981`, text white

## Typography
- Use clear hierarchy: title, section header, body, caption
- Avoid all-caps for body text

## Status Badges
- Applied: neutral (use slate)
- Screening: primary (indigo)
- Interview: primary (indigo)
- Offer: success (emerald)
- Rejected: muted slate or desaturated red

## Evidence Window
- Component shows source snippet + provider + date.
- Use monospace style for snippet and a subtle border.
## High Contrast Mode
- Provide alternative color tokens for funnel stages with WCAG AA contrast.
