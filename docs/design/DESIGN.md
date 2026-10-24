# MyFund Design System — "Ledger + Editorial"

The visual language for MyFund, the government fund distribution and monitoring app. It mixes two ideas:

- **Ledger**: black-and-white, sharp, technical. Monospace IDs and figures, bordered "block" cards, hairline grids. It should feel like an audit trail.
- **Editorial**: serif headlines that state the finding in a sentence ("RM 9.65 million is still waiting to reach beneficiaries"), like a newspaper chart.

`reference.html` in this folder is the full sample dashboard. **Use it as a visual spec only.** It is written in a canvas template format (`{{ }}`, `<sc-for>`, `<sc-if>`, `class Component extends DCLogic`). Never copy that syntax: rebuild the look in this project's own stack.

---

## 1. Core rules

1. **Colour has meaning.** Navy = distributed. Orange = remaining or needs attention. Ink = everything else. Never use orange or navy for decoration.
2. **No rounded corners, shadows or gradients.** Every edge is square. Separate things with borders and rules.
3. **Three fonts, each with one job:** serif for headlines, sans for UI and body text, mono for IDs, labels, dates and table figures.
4. **Headlines state the takeaway.** Section titles may be plain ("Active programmes"), but the main chart headline says what the data shows.
5. **Status is ink, not green.** "Committed" is a check icon plus text in ink. No coloured success pills.

---

## 2. Tokens

Copy these into your global stylesheet, or map them onto your theme config (Tailwind, etc.).

```css
:root {
  /* Neutrals */
  --ink:            #0B0B0C; /* text, primary buttons, top bar, strong borders */
  --page:           #F2F2EF; /* app background */
  --surface:        #FFFFFF; /* cards, tables */
  --text-2:         #3F424A; /* secondary text */
  --text-muted:     #5A5D66; /* labels, captions, axis text (passes 4.5:1 on white) */
  --border:         #D9DBE0; /* card borders, hairline grids */
  --border-control: #C9CBD1; /* row-action buttons, dashed dividers */
  --divider:        #ECEDF0; /* table row separators */
  --gridline:       #E6E7EA; /* chart gridlines */

  /* Top bar (on ink) */
  --bar-text-muted: #C9CBD1; /* inactive nav */
  --bar-text-sub:   #B5B7BD; /* subtitles */
  --bar-border:     #3A3C42;

  /* Data meaning */
  --distributed:      #1F3A5F; /* navy: money that reached beneficiaries */
  --distributed-fill: #E4E9F0; /* area under the distributed line */
  --remaining:        #E8590C; /* orange: fills, squares, bar remainders */
  --remaining-text:   #B03E05; /* orange for TEXT on white (AA contrast) */

  /* Type */
  --font-display: 'Newsreader', Georgia, serif;
  --font-sans:    'Geist', system-ui, sans-serif;
  --font-mono:    'Geist Mono', ui-monospace, monospace;

  /* Layout */
  --content-max: 1320px;
  --gutter: 24px;         /* page side padding, gap between sections */
  --card-pad: 20px 24px;
  --radius: 0;            /* always */
}
```

Fonts (Google Fonts):

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap">
```

Use `--remaining` for shapes and `--remaining-text` for orange text. `#E8590C` is too light for small text on white.

---

## 3. Typography

| Role | Font | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| Page title (H1) | Newsreader | `clamp(30px, 4vw, 44px)` / 1.1 | 400 | letter-spacing −0.01em |
| Section title (H2) | Newsreader | 26px / 1.15 | 400 | |
| Small serif label | Newsreader | 16px / 1.15 | 600 | short programme names under charts |
| Standfirst / lead | Geist | 15px / 1.5 | 400 | `--text-2`, max ~62ch |
| Body / UI | Geist | 14px / 1.5 | 400–500 | |
| Caption | Geist | 12–13px | 400 | `--text-muted` |
| KPI figure | Geist | 30px | 600 | letter-spacing −0.02em |
| Block amount | Geist | 20px | 600 | letter-spacing −0.02em |
| Eyebrow / label | Geist Mono | 11px | 400 | written in UPPERCASE in the copy, `--text-muted` |
| IDs, dates in tables | Geist Mono | 12px | 400 | `TX-DST-2026-006` |
| Big percentage | Geist Mono | 22px | 500 | letter-spacing −0.02em |
| Chart axis text | Geist Mono | 11px | 400 | `--text-muted` |

Never set numbers or UI controls in the serif.

---

## 4. Layout

- **Page:** `--page` background, content centred at `max-width: 1320px`, padding `32px 24px 56px`, sections stacked with a `24px` gap.
- **Page header:** eyebrow (mono) → H1 (serif) → one-sentence standfirst; actions aligned right. A **4px ink rule** closes the header.
- **Cards** come in two variants:
  - *Data card*: white, `1px solid --border`, padding `20–22px 24px`.
  - *Editorial card*: white, **`4px solid --ink` top border only**, no other border. Use it for the main headline chart.
- **Hairline grid** (KPI strip): `display: grid; gap: 1px; background: var(--border); border: 1px solid var(--border)` with white cells. The 1px gap draws the dividers.
- **Responsive:** columns use `flex-wrap` / `grid auto-fit` with sensible minimums (KPIs 240px, blocks 200px, chart columns 100px, side-by-side cards 460–520px). Wide tables sit in an `overflow-x: auto` box with a `min-width`. Nothing scrolls the whole page sideways.

---

## 5. Components

### Top bar
Logo: see docs/design/logo/LOGO.md

Ink background, 64px min height. Nav links are 44px tall. The active link is white with a **3px orange underline** (`box-shadow: inset 0 -3px 0 var(--remaining)`); inactive links are `--bar-text-muted`. The user button is outlined in `--bar-border` with a white initials square.

### Buttons
| Variant | Style |
|---|---|
| Primary | `--ink` fill, white text, 1.5px ink border, min-height 44px, padding 0 18px |
| Secondary | white fill, ink text, 1.5px ink border |
| Row action (in tables) | white, `1px solid --border-control`, min-height 36px, 13px text |

Square corners. No icons are required; use "+" as a text prefix for create actions.

### Links
Ink, weight 500, end with " →" when they navigate to a fuller view. Hover colour: `--remaining-text`.

### KPI cell
Mono eyebrow (with an 8px colour square when the figure has a data meaning) → 30px figure → 12px caption. The Remaining figure is set in `--remaining-text`. Show full ringgit amounts here (`RM 22,850,000`).

### Type tag
Inline, `padding: 2px 8px`, `1.5px solid --ink`, mono 11px uppercase.
- `DISTRIBUTION`: ink fill, white text.
- `ALLOCATION`: white fill, ink text.

Use the same black/white inversion in block headers and chart markers.

### Status
Check icon (12px, stroke 3) + "Committed", ink, 13px. No background.

### Block card (ledger entry)
`1.5px solid --ink` border. The header strip is mono 11px, with the ID on the left and the type on the right, inverted by type (see Type tag), separated by a 1.5px ink rule. Body: amount (20px 600) → `from → to` (12px, one line, ellipsis) → dashed `--border-control` divider → mono 11px date (left) + running total such as `Σ 21.05M` or `CAP 32.5M` (right). Show blocks oldest → newest, left to right.

### Programme row
Name (Geist 600) + agency (12px muted) on the left, mono 22px percentage on the right. Below: an 8px split bar with navy for the distributed share, a 2px gap, then orange for the remainder. Then a mono 12px line: `DIST RM …` · `LEFT RM …` (in `--remaining-text`) · `TOTAL RM …`. Rows are separated by 1px `--border` top rules.

### Data table
Header row: `1.5px solid --ink` top border, 1px `--border` bottom, mono 11px muted labels. Body rows are separated by 1px `--divider`. Outer cells are padded 24px so the table aligns with the card's edges. Amounts are right-aligned, Geist 600, no wrap. Long names truncate with an ellipsis (max-width ~200–220px). Newest entries first.

---

## 6. Data visualisation

**Shared encoding (never change it):**

| Meaning | Encoding |
|---|---|
| Distributed | `--distributed` navy (line, bar, square) |
| Remaining / gap | `--remaining` orange (solid in squares and bars, ~20% opacity as an area) |
| Allocation ceiling / target | ink dashed line, `stroke-dasharray: 6 4`, 1.5px |
| Distribution event | 10px navy square marker |
| Allocation event | 10px white square with 2px ink stroke |

### Ledger step chart
Cumulative distributed amount as a **step line** (2.5px navy) over time, with the allocation ceiling as a dashed ink step line. Draw it in this order: orange area under the ceiling (20% opacity) → opaque `--distributed-fill` area under the distributed line → ceiling line → distributed line → markers. The visible orange band is then exactly the money still to be distributed. The y-axis starts at RM 0, with gridlines every RM 10M in `--gridline`. Axis labels are mono 11px (`RM 10M`, `12 FEB`). Each marker gets a mono label with its short transaction ID (`DST-005`).

### Unit bars (waffle columns)
**One square = RM 50,000.** Each programme is a column 10 squares wide (8px squares, 2px gaps), bottom-aligned so the column heights compare. Orange (remaining) squares sit on top and navy (distributed) squares fill from the bottom. Under each column: a 1px ink rule, the short serif name, `CODE · 75% OUT` in mono, then `RM 3.75M left` in `--remaining-text` 600. The headline above states the total remaining.

### General chart rules
- Every chart has a legend with small colour swatches (18×3px line, 12px square, or 10px square).
- Every chart has a descriptive `aria-label` (role="img") summarising what it shows.
- Use one scale for comparable things and start the axis at zero.
- No red/green pairs. Navy/orange is the only contrast pair.
- Amounts: full in tables and KPIs (`RM 4,200,000`), compact in charts and captions (`RM 4.2M`, `RM 9.65M`).

---

## 7. Copy and formats

- **Money:** `RM 22,850,000` (full) or `RM 22.85M` (compact). Never mix both styles in one component.
- **Dates:** tables use `02 Mar 2026, 09:40`; compact mono uses `02 MAR 09:40`; eyebrows use `AS OF 02 MAR 2026, 09:40`.
- **Transaction IDs:** `TX-DST-2026-006` (distribution) and `TX-ALC-2026-004` (allocation); chart labels drop the prefix (`DST-006`).
- **Agencies:** full name followed by the code in brackets: `National Disaster Management Agency (NADMA)`.
- **Headlines:** one sentence, sentence case, with the number in words-and-figures ("RM 9.65 million is still waiting…").

---

## 8. Accessibility

- Text contrast is at least 4.5:1. Use `--text-muted` (#5A5D66) as the lightest text colour on white and `--remaining-text` for orange text.
- Interactive targets are at least 44px tall (36px allowed for row actions inside tables).
- Use real `<button>` and `<a href>` elements. Icon-only buttons get an `aria-label`. Row actions say which row they act on (`aria-label="Details for TX-DST-2026-006"`).
- Focus: `outline: 2px solid var(--ink); outline-offset: 2px` on every interactive element (orange outline on the ink top bar).
- Colour is never the only signal: values are always printed next to bars and squares.

---

## 9. Don'ts

- ✗ Rounded corners, drop shadows, gradients, glassmorphism.
- ✗ Green "success" pills or coloured badges per transaction type.
- ✗ Orange used for brand or decoration. It only ever means remaining or attention.
- ✗ Serif for numbers, buttons, tables or labels.
- ✗ Coloured left-border accent cards.
- ✗ Truncated axes or per-chart scales when comparing programmes.
- ✗ Copying `reference.html` template syntax into the codebase.
