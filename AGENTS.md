## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

---

# DailyUseCalc Project Rules

DailyUseCalc is an SEO-first, static-first platform for everyday calculators
and decision-support tools.

Before making major architectural, product, or UI decisions, consult the
relevant documents in `/docs`.

## Architecture

- Astro is the primary application framework.
- Use TypeScript with strict type checking.
- Prefer Astro components for static and SEO-critical content.
- Use React only for interactive islands where client-side state is justified.
- Never convert the application into a React SPA.
- Use Tailwind CSS for styling.
- Use Lucide for icons.
- V1 is frontend-only: no backend, database, authentication, or server-side
  calculation API.

## Calculator Architecture

Keep these concerns separate:

Input
→ Validation
→ Calculation
→ Recommendation
→ Presentation

- Calculation engines must be pure TypeScript.
- Never put core formulas directly inside React/Astro UI components.
- Calculation functions must be deterministic.
- Recommendation rules must be separate from mathematical calculations.
- Shared unit conversion logic must be centralized.
- New calculators must reuse shared infrastructure instead of copying an
  existing calculator.

## Astro and React

Use Astro for:

- layouts
- navigation
- footer
- SEO content
- breadcrumbs
- FAQs
- guides
- related calculator sections
- static page content

Use React only where appropriate for:

- interactive calculator workspaces
- live results
- dependent inputs
- advanced interactive controls

Minimize client-side JavaScript and hydration.

## UI / UX

DailyUseCalc is mobile-first.

The product should feel:

- clean
- modern
- calm
- trustworthy
- fast
- premium without being flashy

Requirements:

- Light, Dark, and System themes.
- Dark mode is a first-class experience.
- Follow the DailyUseCalc UI/UX specifications and design tokens.
- Follow the installed `web-design-guidelines` skill.
- Use progressive disclosure for advanced calculator options.
- Prefer clarity over decoration.
- Avoid excessive animations, gradients, and visual clutter.
- Respect `prefers-reduced-motion`.

## Accessibility

Target WCAG 2.2 AA.

Use:

- semantic HTML
- proper form labels
- keyboard navigation
- visible focus states
- accessible validation messages
- sufficient contrast
- practical touch targets

Never communicate important information using color alone.

## Performance

Performance is a product requirement.

- Prefer static HTML.
- Minimize shipped JavaScript.
- Avoid unnecessary dependencies.
- Optimize images.
- Avoid layout shifts.
- Prefer CSS transitions for simple interactions.
- Target Lighthouse Performance >= 95 where realistically achievable.

## SEO

DailyUseCalc is SEO-first.

SEO-critical content must be available in generated HTML.

Do not hide important:

- headings
- explanations
- FAQs
- guides
- breadcrumbs
- related calculator links

behind React hydration.

Pages should support:

- unique title
- meta description
- canonical URL
- Open Graph metadata
- breadcrumbs
- appropriate structured data
- sitemap inclusion

## Monetization

DailyUseCalc is designed for future Google AdSense monetization.

Revenue must never interrupt the user's primary task.

Never place advertisements:

- between calculator inputs
- inside the interactive calculator workflow
- between calculation and results
- between results and the main recommendation
- disguised as product UI

Approved areas include:

- desktop context rails
- mobile after introductory content
- after results/recommendation/actions
- educational reading sections
- after FAQs where appropriate

Reserve ad dimensions where practical to reduce CLS.

## Context Rails

Very wide desktop layouts may use left/right Context Rails.

They may contain:

- advertisements
- related guides
- popular calculators
- future affiliate recommendations

Context Rails must disappear when insufficient width exists and must never
squeeze the primary calculator experience.

## Testing

Automated tests are required for core calculation logic.

Prioritize tests for:

- formulas
- unit conversion
- rounding
- validation
- recommendation rules
- edge cases

## Dependencies

Do not install a new package until checking whether the requirement can be
handled cleanly using the existing Astro, TypeScript, React, Tailwind, and
project dependencies.

Avoid dependencies for trivial functionality.

## Documentation

Detailed requirements live in `/docs`.

Consult:

- PRD for product direction
- Product Specification for product behavior
- TDD for architecture
- UI/UX Specification for interaction/design decisions
- Design System for visual rules

Do not silently contradict approved documentation.

If implementation requires a major change to an approved decision, surface
the conflict before changing the architecture.

## Core Rule

Build the first calculator as though it will eventually be one of hundreds.

A new calculator should primarily require new domain configuration,
calculation logic, recommendations, content, and tests — not a redesign of
the platform.
