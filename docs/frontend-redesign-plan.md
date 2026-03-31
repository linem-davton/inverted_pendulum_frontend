# Inverted Pendulum Frontend Redesign Plan

## Objective

Redesign the frontend into a modern simulation dashboard without changing the backend API contract. The app should still use the current endpoints and interaction model, but it should feel intentional, fast, and credible as a control-system product rather than a student demo.

## Product Framing

- Product: real-time inverted pendulum simulator with a C++ backend
- Primary jobs:
  - observe system state quickly
  - tune PID and disturbance parameters with confidence
  - start, pause, and reset the simulation without friction
  - read response trends from charts without hunting through clutter
- Constraint: keep the current API shape for `/status`, `/sim`, `/startstop`, `/reset`, `/pid`, and `/params`

## Current Problems

- The layout is functional but flat: one large undifferentiated dark surface with weak hierarchy.
- The simulator, controls, and charts compete for attention instead of forming a clear workflow.
- Typography is generic and inconsistent with the subject matter.
- The control area feels like raw form inputs, not a tuned operator console.
- The fetch interval uses `prompt()`, which breaks immersion and feels dated.
- The chart presentation is serviceable but visually disconnected from the rest of the product.
- Mobile behavior is mostly a stacked fallback, not a designed experience.

## Design Direction

### Design Language Name

**Kinetic Control Deck**

### Core Feel

Industrial precision, scientific instrumentation, and polished observability UI.

The interface should feel like a live systems console:

- high contrast, but not generic dark mode
- dense with information, but still breathable
- kinetic and technical, without looking militaristic or overdesigned
- expressive enough to feel current, but serious enough to suit a control simulator

## Visual Language

### Typography

- Headings: `Space Grotesk` or `Sora`
- Body/UI: `IBM Plex Sans`
- Numeric data and labels: `IBM Plex Mono`

Reasoning:

- geometric heading font gives the product a sharper identity
- neutral sans keeps forms readable
- mono font makes telemetry, units, and parameter values feel instrument-grade

### Color System

Use a control-lab palette, not purple-accent SaaS defaults.

- Base background: deep graphite-blue
- Surface panels: translucent slate with subtle edge glow
- Primary accent: signal orange
- Secondary accent: electric cyan
- Positive/live state: acid-lime
- Warning or reset state: ember red-orange
- Text: warm white with muted steel-blue secondary text

Suggested tokens:

- `--bg-0: #071017`
- `--bg-1: #0d1720`
- `--bg-2: #13222d`
- `--panel: rgba(12, 27, 35, 0.78)`
- `--panel-strong: rgba(15, 32, 43, 0.92)`
- `--line: rgba(115, 173, 212, 0.18)`
- `--text: #f4f7f8`
- `--text-muted: #93a7b5`
- `--accent-primary: #ff7a1a`
- `--accent-secondary: #59d3ff`
- `--accent-live: #9df871`
- `--accent-danger: #ff6b57`

### Surfaces and Background

- layered radial and linear gradients instead of a flat page fill
- subtle grid or blueprint pattern in the page background
- large rounded panels with crisp internal borders
- restrained glass effect only where it helps depth, not everywhere

### Motion

- staggered panel entrance on first render
- subtle live pulse on connection/status chip
- chart and simulator cards should feel active, but not animated for the sake of animation
- hover states should tighten contrast and edge glow, not bounce
- honor `prefers-reduced-motion`

## Layout System

## Desktop

Use a dashboard composition rather than a 50/50 split.

- Top bar:
  - product title
  - backend/server environment toggle
  - live status indicator
  - quick links in a compact utilities cluster
- Main hero row:
  - left: large simulation stage card
  - right: operator rail with primary actions and key tuning controls
- Secondary row:
  - stacked telemetry charts
  - optional summary cards above charts for current angle, cart position, force, and sample interval

### Layout Intent

- the simulator is the visual anchor
- the controls form a coherent cockpit
- the charts read as analysis panels, not leftover content

## Mobile

Mobile should be designed, not merely collapsed.

- order:
  - top bar
  - live simulator card
  - primary actions row
  - summary metrics
  - tuning cards
  - telemetry charts
- sliders and number inputs become vertical control cards with larger tap targets
- sticky action footer is acceptable on mobile if it remains compact

## Component Plan

### 1. App Shell

- introduce a structured shell with header, main grid, and footer
- move away from a single `.container` grid doing all layout work

### 2. Simulation Stage Card

- prominent title and short status line
- framed canvas with a background rail/grid
- supporting metric strip:
  - time
  - cart position
  - pendulum angle
  - current force

### 3. Operator Rail

Break controls into distinct cards:

- Session card:
  - Start
  - Pause/Continue
  - Restart
- Runtime card:
  - fetch interval input replacing `prompt()`
  - backend target switch
- PID tuning card:
  - `Kp`, `Ki`, `Kd`
- Disturbance card:
  - reference
  - delay
  - jitter
- Reset action should live inside the relevant parameter card, not float as an afterthought

### 4. Metrics and Status

- use compact metric tiles with large numeric values and mono labels
- use chips/badges for:
  - live/paused
  - local/remote
  - sample interval

### 5. Charts

- each chart gets its own card, title, and one-sentence purpose
- unify axes, tooltip, and legend styling with the dashboard palette
- use line thickness and glow intentionally
- keep orange for pendulum-related values and cyan for cart/force-related values

Suggested chart titles:

- `Position vs Angle`
- `Force Response vs Angle`

### 6. Footer

- reduce footer emphasis
- keep documentation and GitHub links, but present them as utility links rather than underlined page furniture

## Interaction Guidelines

- remove blocking UI patterns like `prompt()`
- prefer inline editable values or modal sheets only if there is a real need
- buttons should communicate hierarchy:
  - primary: start/continue
  - secondary: restart
  - tertiary: utility actions
- slider cards should show:
  - label
  - current value
  - unit
  - min/max bounds

## Content Tone

- precise
- technical
- calm
- avoid filler copy and generic marketing language

Examples:

- `Simulation idle`
- `Controller active`
- `Tracking unstable`
- `Sampling every 300 ms`

## Accessibility and Usability

- maintain strong contrast for charts and controls
- use visible focus rings, not default browser artifacts
- ensure controls remain fully keyboard accessible
- do not rely on color alone to communicate state
- support smaller laptop heights without hiding primary controls

## Technical Approach

Keep the current stack and improve structure first.

- React + MUI remain acceptable for now
- define a proper theme with design tokens instead of scattered inline `sx`
- move page structure into semantic sections and reusable cards
- replace ad hoc CSS with a token-based layout and component stylesheet strategy
- keep `recharts`, but restyle it aggressively to match the product

## Proposed Implementation Phases

### Phase 1: Foundation

- create design tokens in `index.css`
- define typography, spacing, radii, shadows, and core color variables
- update the MUI theme to match the new token system

### Phase 2: Layout Rewrite

- restructure `App.tsx` into dashboard sections
- add top bar, hero stage card, operator rail, metric strip, and chart cards

### Phase 3: Control UX

- replace `prompt()` fetch interval editing with an inline control
- convert the slider section into card-based control groups
- improve button hierarchy and state visibility

### Phase 4: Telemetry Polish

- redesign chart cards and tooltips
- add summary metrics and state badges
- make empty states intentional instead of plain text placeholders

### Phase 5: Responsive Refinement

- design mobile and tablet layouts explicitly
- tune spacing, chart heights, and sticky action behavior

## Acceptance Criteria

- the interface has a clear visual anchor and obvious workflow
- controls look like part of a unified design system
- the simulator, metrics, and charts feel connected
- mobile and desktop both look intentional
- no backend API changes are required
- the redesign improves appearance without reducing functional clarity

## Implementation Notes for the Next Step

When we start coding, the first pass should focus on structure and tokens, not micro-polish. The right order is:

1. app shell and layout
2. typography and color system
3. action/control cards
4. metric strip
5. chart styling
6. responsive cleanup

That sequence will produce visible improvement quickly and reduce rework.
