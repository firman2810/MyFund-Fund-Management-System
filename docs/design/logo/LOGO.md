# MyFund Logo — "Step"

A square split by a rising staircase: navy (distributed) bottom-right, orange (remaining) top-left. It is the dashboard's ledger step chart reduced to one shape. Colours follow DESIGN.md: navy `#1F3A5F`, orange `#E8590C`, ink `#0B0B0C`.

## Files

| File | Use |
|---|---|
| `logo-mark.svg` | Mark on light backgrounds (navy + orange) |
| `logo-mark-on-ink.svg` | Main logo. Mark on ink / dark backgrounds (white + orange), also the browser tab icon: `<link rel="icon" type="image/svg+xml" href="/logo/logo-mark-on-ink.svg">` |
| `favicon.svg` | Navy + orange tab icon (not used) |

## Wordmark

Live text, not an image: `myfund`, all lowercase, **Geist 600**, `letter-spacing: -0.065em` at display sizes (−0.06em at 22px and below), `line-height: 1`. Ink on light backgrounds, white on dark.

## Lockup

Mark on the left, wordmark on the right, vertically centred, gap ≈ 0.45 × the mark height.

| Context | Mark | Wordmark |
|---|---|---|
| Top bar (on ink) | 24px, on-ink version | 22px, white |
| Login / splash | 96px | 100px |
| Footer / docs | 32px | 28px |

Reference markup (adapt to the project's stack):

```html
<a href="/" aria-label="MyFund" class="logo">
  <img src="/logo/logo-mark-on-ink.svg" width="24" height="24" alt="" aria-hidden="true">
  <span class="logo-wordmark">myfund</span>
</a>
```

```css
.logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.logo-wordmark { font-family: 'Geist', system-ui, sans-serif; font-weight: 600; font-size: 22px;
  letter-spacing: -0.06em; line-height: 1; color: #FFFFFF; padding-bottom: 2px; }
```

## Rules

- Minimum mark size: 16px. Clear space on every side = ¼ of the mark height.
- Never rotate or flip the mark (the staircase rises left to right), recolour the halves, add outlines or shadows, round the corners, or stretch it.
- The mark may stand alone (app icon, favicon, loading state). The wordmark never appears without the mark.
- The logo link carries `aria-label="MyFund"`; the mark inside it is decorative (`alt=""`) when the wordmark text sits next to it.
