# Design tokens — derived from Tend_Brand_Concept_Spec.md

Drop into `globals.css` and `tailwind.config.ts` once the project is scaffolded.

## Palette

| Token | Hex | Use |
|---|---|---|
| `ink` | `#16201C` | Primary text, all figures (negative numbers stay Ink — no alarm-red) |
| `paper` | `#F4F1E9` | Background |
| `sage` | `#647B6B` | Affirmation only (e.g. "on track") |
| `clay` | `#C9A88C` | Accent, warmth |
| `mist` | `#DDE3DE` | Dividers, subtle surfaces |

No red. Ever. Don't add a `danger`/`error` color token — overspend states use Ink + plain language, not color.

## Type

- Primary (serif, brand voice / hero numbers): **Fraunces** — weights 400, 500 only
- Secondary (sans, UI/body/dense numbers): **Inter** — weights 400, 500 only, tabular figures (`font-variant-numeric: tabular-nums`) for money columns
- Thai companion (launch market): **IBM Plex Sans Thai** or **Anuphan**

## globals.css

```css
:root {
  --color-ink: #16201C;
  --color-paper: #F4F1E9;
  --color-sage: #647B6B;
  --color-clay: #C9A88C;
  --color-mist: #DDE3DE;

  --font-display: "Fraunces", serif;
  --font-body: "Inter", sans-serif;
  --font-thai: "IBM Plex Sans Thai", sans-serif;
}
```

## tailwind.config.ts theme.extend

```ts
colors: {
  ink: "#16201C",
  paper: "#F4F1E9",
  sage: "#647B6B",
  clay: "#C9A88C",
  mist: "#DDE3DE",
},
fontFamily: {
  display: ["Fraunces", "serif"],
  body: ["Inter", "sans-serif"],
  thai: ["IBM Plex Sans Thai", "sans-serif"],
},
fontWeight: {
  normal: "400",
  medium: "500",
  // no bold — weight discipline is the calm
},
```

## Design laws to enforce in code review

1. One primary number per screen — if a screen needs two headline figures, it's two screens.
2. No alarm-red, no red at all.
3. Signal copy describes, never warns ("a little ahead on dining", not "OVER BUDGET").
4. Two font weights only, both families.
5. Money lists: Inter + tabular-nums. Hero figures: Fraunces.
