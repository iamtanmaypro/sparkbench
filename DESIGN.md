# Sparkbench DESIGN.md

Design source of truth for the Sparkbench UI. Every visual decision in `src/` must be
traceable to this file. Written for agents: token, rule, and rationale in one place.

## 1. Visual theme and atmosphere

**Direction: "precision instrument."** Sparkbench is a lab bench, not a SaaS dashboard.
The reference is the physics-lab aesthetic: graph paper, brass terminals, engraved panel
labels, the amber of a real indicator LED. Calm, dense, confident. A judge opening this
app should feel they are looking at an instrument that was built, not a template that was
generated.

- Light theme, warm paper base. Not white (#fff is banned as a large surface); a warm
  drafting-paper tone with a visible fine grid on the canvas.
- One dominant accent (electric amber/orange, the "live wire" color) used sparingly for
  energy, activity, and focus. Secondary functional colors: copper for agent actions,
  slate for human actions, signal green only for "conducting/passing" states, alarm red
  only for faults.
- Depth comes from layered paper: cards sit ON the desk, the canvas is the desk. Soft
  ambient shadow (low blur, low opacity), hairline borders (1px, warm gray), never
  heavy drop shadows or glassmorphism.
- Texture: a subtle graph-paper grid on the canvas background (CSS gradient, not an
  image), and a barely-there paper grain on large surfaces. No noise GIFs, no heavy
  textures.

## 2. Color palette and roles

CSS variables (semantic names), all values final:

```css
:root {
  /* base surfaces */
  --paper:        #f6f1e7;  /* app background, warm drafting paper */
  --paper-deep:   #ece5d6;  /* rails, panels, recessed areas */
  --surface:      #fbf8f1;  /* cards, approval cards, inspector */
  --canvas:       #faf7ef;  /* workbench canvas, slightly brighter than paper */

  /* structure */
  --line:         #d8cfbd;  /* hairline borders */
  --line-strong:  #b9ad94;  /* emphasized borders, dividers */
  --ink:          #2b2620;  /* primary text, warm near-black */
  --ink-soft:     #6b6252;  /* secondary text, labels */
  --ink-faint:    #9c917d;  /* disabled, meta */

  /* the live accent */
  --spark:        #e8641b;  /* amber-orange: energy, active agent, focus rings, CTAs */
  --spark-soft:   #fbe8da;  /* spark tint for backgrounds */

  /* functional */
  --copper:       #b06a35;  /* agent-originated actions (glow, badges) */
  --slate:        #4a5a68;  /* human-originated actions */
  --signal:       #2e7d4f;  /* conducting, passed, success */
  --signal-soft:  #e2f0e6;
  --alarm:        #c03a2b;  /* faults, blown fuse, burned LED */
  --alarm-soft:   #f7e3e0;

  /* LED / component state colors (used inside SVG component renderers) */
  --led-lit:      #ffb020;
  --led-dark:     #7d7466;
  --bulb-lit:     #ffd24d;
}
```

Rules:
- `--spark` is never used as a large background. It is a wire, a ring, a dot, a key word.
- Faults use `--alarm` text on `--alarm-soft` fills. Never red backgrounds behind body text.
- The agent's presence is copper, the human's is slate. When the same element can belong
  to either, the color encodes who (badges, log rows, glow).

## 3. Typography

Two-font pairing via Google Fonts, loaded with `font-display: swap`:

- **Display / headings / engraved labels:** "Sometype Mono" (fallback: "IBM Plex Mono",
  monospace). Lab-instrument engraved feel, also perfect for meter readouts and the
  action log.
- **Body / UI text:** "Public Sans" (fallback: system sans). Neutral, unfussy, highly
  legible at small sizes.

Scale (rem):
- `--text-xs: 0.6875rem` (11px) panel labels, uppercase, letter-spacing 0.08em
- `--text-sm: 0.8125rem` (13px) secondary UI, log rows, hints
- `--text-md: 0.9375rem` (15px) body, buttons
- `--text-lg: 1.25rem` section headings (e.g. "Lessons", "Inspector")
- `--text-xl: 1.75rem` app title in the top bar

Rules:
- Panel titles are ALWAYS the mono font, uppercase, `--text-xs`, letter-spaced, `--ink-soft`.
  This is the engraved-plate look and is the strongest identity carrier; do not skip it.
- Numerals in meters, inspector values, and log timestamps use the mono font with
  `font-variant-numeric: tabular-nums`.
- No font weights below 400; bold (700) only for emphasis words and the app title.

## 4. Component stylings

**Buttons.** One base style: 1px `--line-strong` border, `--surface` fill, `--ink` text,
6px radius, mono uppercase `--text-xs` for utility buttons; Public Sans `--text-md` for
primary actions. Hover: border darkens to `--ink-soft`, background shifts to `#fff`.
Primary action (Approve): `--spark` border + `--spark-soft` fill + `--spark` text;
on hover, fill `--spark` and text `--paper`. Danger (Reject, remove): same structure
with `--alarm`. Focus: 2px `--spark` outline offset 2px (keyboard-visible everywhere).

**Cards.** `--surface` fill, 1px `--line` border, 8px radius, `--text-sm` body,
generous 14px padding, soft shadow `0 1px 3px rgb(43 38 32 / 0.08)`. Approval cards get
a 3px left border in `--spark` and a paper-clipped header row (mono, uppercase
"AGENT PROPOSAL").

**Chips / badges.** Pill, mono `--text-xs`, 1px border, tinted fill:
agent = copper tint, human = slate tint, state chips (lit/dark/fault) = signal/alarm.

**Inputs.** 1px `--line-strong` border, `--surface` fill, 6px radius, 8px padding,
mono for numeric fields.

**Toggle / switch controls.** Small lab-knife-switch look: 34x18 track, thumb slides,
`--signal` when closed, `--line-strong` when open.

**Node components (SVG on canvas).** Components look like schematic symbols with real
hardware cues: battery with +/− terminal posts (small copper circles), resistor as a
zigzag with a value label, LED as a triangle-and-bar with a glow halo when conducting,
bulb with radial glow when lit, switch as a physical knife lever that visually rotates,
fuse with a visible break line when blown. Meters show live values in mono numerals.
Terminal handles: 8px circles, grow to 12px with a spark ring on hover.

**Wires.** 3px stroke, `--ink-soft` by default; conducting wires get `--spark` with a
subtle 6px `--spark-soft` outer stroke (energy flow). Faulted wire segments may render
dashed `--alarm`.

**Lesson panel.** Left rail list: each lesson a row with mono number "01".."05", name,
and a status glyph (empty circle, in-progress half, completed filled check in
`--signal`). Active lesson row: `--spark` 2px left border. "Goal complete. Nice work."
state renders as a stamped badge (mono, bordered, slightly rotated -2deg, like a rubber
stamp).

**Action log.** Monospace rows, 13px, newest first, timestamp prefix in `--ink-faint`.
Agent rows carry a copper dot; human rows a slate dot. Approval rows get a bold verb
("approved", "rejected").

**HintPanel / empty states.** Centered card with an engraved-plate title, one sentence
of body text, and prompt buttons styled as mono chips with a copy icon.

**Banner (no WebMCP).** Slim bar across the top of the canvas area, `--spark-soft`
fill, 1px `--spark` border, dismiss X right-aligned. Visual: keep it quiet, it must not
read as an error.

## 5. Layout principles

- The bench is the hero: the canvas takes maximum area; rails are subordinate.
- Top bar: app title (mono, engraved), lesson name, AgentChip right-aligned. Height 56px,
  hairline bottom border.
- Left rail (280px): Lessons + Palette stacked. Right rail (300px): Inspector (meters) +
  Lab Report + Action Log. Both rails `--paper-deep` with hairline separators.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Rails use 16px gutters; cards 14px padding.
- Responsive below 1100px: rails collapse to tabs (canvas first, then Inspector, then
  Log). Below 720px: single column, canvas min-height 420px.
- Canvas grid: 24px graph-paper squares (two-layer CSS gradient: 1px `--line` lines at
  24px, stronger every 120px).

## 6. Depth and elevation

- Level 0: rails/panels on `--paper-deep`.
- Level 1: cards on `--surface` + soft shadow (above).
- Level 2: floating overlays (approval cards, HintPanel on canvas) + medium shadow
  `0 4px 12px rgb(43 38 32 / 0.12)`, 1px `--line-strong` border.
- Level 3: ghost cursor + focus pulse (pure SVG/CSS, no shadow).
- Never stack more than two shadows on one element; never animate box-shadow
  (animate opacity of a pseudo-element instead) except the approval-card entrance.

## 7. Motion

One well-orchestrated entrance and a small set of purposeful micro-motions. All motion
respects `prefers-reduced-motion` (existing guard keeps working).

- Page load: staggered reveal, top bar first (fade+4px rise, 200ms), rails (240ms,
  60ms stagger), canvas last (fade only, no movement, 300ms). One-time, subtle.
- Approval card entrance: scale 0.96 -> 1 + fade, 180ms, ease-out. This is the hero
  moment of the app; make it feel like a ticket being clipped to the bench.
- Ghost cursor: 2.4s fade (existing), keep.
- Focus pulse: keep the 3-iteration ring animation.
- Wire energize: on solve, conducting wires transition stroke color 240ms.
- Switch toggle: lever rotates 30deg in 120ms.
- LED/bulb lit: glow halo opacity transitions 200ms.
- Hover on terminals: ring appears 120ms.
- No bounce, no spring, no confetti. An instrument, not a toy.

## 8. Do's and don'ts

DO:
- Keep every engraved-plate label in the mono uppercase style.
- Use `--spark` only where energy/attention is meant.
- Keep copper=agent, slate=human consistent across badges, log, glow, ghost cursor.
- Test keyboard focus rings on every interactive element (a11y is part of the design).
- Keep the React Flow canvas readable at 100% zoom: components min 44px, terminal
  handles clearly visible.

DON'T:
- No purple/blue gradients, no glassmorphism, no neon-on-black, no emoji icons.
- No Inter/Roboto/system-ui as identity fonts.
- No drop shadows heavier than the tokens in section 6.
- No color-only meaning: every state also carries a text label or glyph (a11y).
- No redesign of the store/tool/UI component APIs; this is a skin pass on top of
  the existing structure. Class names in tests (`.focus-pulse`, `.is-lit`,
  `.from-agent`, `.tool-form-live`, approval layer hooks) must keep working.

## 9. Responsive behavior

- >=1280px: full three-zone layout as described.
- 1100-1279px: rails 260/280px.
- <1100px: right rail becomes a tabbed panel above the log; palette collapses to a
  horizontal strip above the canvas.
- <720px: stacked single column; canvas min-height 420px; approval cards full-width.
- Touch targets >=40px on all interactive elements at every breakpoint.

## 10. Agent prompt guide

When implementing any UI change, re-read sections 2, 3, 4 for the exact tokens and
rules. If a case arises that this file does not cover, decide by asking: "would this
feel at home on a physics lab bench?" Choose the calmer, more precise option. Update
this DESIGN.md with any new token or pattern so it stays the single source of truth.
