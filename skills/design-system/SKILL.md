---
name: design-system
description: JoraFlow design system and UI principles; use when designing UI, layouts, components, motion, or styling for the JoraFlow app.
---
# JoraFlow Design System

## Overview
Use this skill to apply JoraFlow’s visual language, layout rules, and motion guidelines consistently across UI and component work.

## Visual Aesthetic
- Glassmorphism cards: blur `10px`, opacity `60%` (approx `rgba(255,255,255,0.6)`), soft borders.
- Color palette:
  - Primary: `#4F46E5` (Indigo)
  - Secondary: `#0F172A` (Slate)
  - Success: `#10B981` (Emerald)

## Layout & Responsiveness
Desktop:
- 3-column grid: Sidebar, Main Analytics, Activity Feed.

Mobile:
- Single column layout.
- Bottom navigation with `Home`, `Funnel`, `Settings`.

Sankey diagram:
- Must be horizontally scrollable on mobile to preserve readability.

## Motion & Engagement
- Use Framer Motion for layout transitions when filtering data.
- Elements fade-in-up with `0.2s` stagger.

## References
- `references/component-guidelines.md`: Component styling and usage. Load when creating or reviewing components.
- `references/layout-recipes.md`: Concrete layout recipes for desktop and mobile. Load when implementing responsive layouts.
- `references/motion-spec.md`: Motion timing and easing guidance. Load when implementing animations.
