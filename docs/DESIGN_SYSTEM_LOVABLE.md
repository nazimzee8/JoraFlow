# JoraFlow Design System (Lovable Edition)

This document is a Lovable-focused subset of the design system. It prioritizes aesthetic appeal, playful clarity, and trustworthy AI UX without sacrificing performance or accessibility.

## 1. Visual Language
- **Aesthetic:** Glassmorphism cards with blur and soft borders.
- **Palette:**
  - Primary: `#4F46E5` (Indigo)
  - Secondary: `#0F172A` (Slate)
  - Success: `#10B981` (Emerald)
- **Background:** Use layered gradients or subtle texture; avoid flat white.

## 2. Evidence Window (Source-Grounding)
- Every AI classification must be explainable.
- When a Sankey node is selected, show the **Source Snippet** that triggered the classification.
- Include metadata: `source_provider`, `source_channel`, and timestamp.
- **PII Masking:** Only show masked snippets; no raw phone/address.

## 3. Sankey Diagram UX
- **A11y:** Add ARIA labels to all SVG paths; ensure keyboard focus states.
- **High-Contrast Mode:** Provide alternate color tokens for funnel stages.
- **Mobile:** Sankey must be horizontally scrollable.

## 4. Empty + Loading States
- **Zero state:** “Scanning Inbox” skeleton for first-time users.
- Use Framer Motion fade-in-up (0.2s stagger) on placeholders.

## 5. Interactive Moments
- Subtle motion on filters and node selection.
- Use micro-feedback (hover glow, soft lift) to build trust and delight.

## 6. Responsiveness
- Desktop: 3-column grid (Sidebar, Analytics, Activity Feed).
- Mobile: single column + bottom nav (Home, Funnel, Settings).

## 7. Performance
- Lazy-load Sankey and memoize heavy charts.
- Target <1s LCP on primary dashboard.

## 8. UI Patterns (Extra)
- **Referral Boost Badge:** Show a small badge if `referral = true`.
- **Source Channel Pill:** Display `source_channel` as a pill (e.g., “LinkedIn Easy Apply”).
- **Risk Badge:** If sender is High Risk, show a red badge and de-emphasize CTA.
- **Confidence Meter:** Show `confidence_score` as a slim progress bar or dot scale.
- **Sync Pulse:** When `sync_logs.status = parsing`, animate a subtle pulse ring.

## 9. Implementation Notes (Lovable)
- Follow Tailwind utility patterns for consistency.
- Use `Framer Motion` for layout transitions.
- Use `Lucide` for icons.
