# @dalin/kit

The parts the four dalin apps share: mail, calendar, notes and drive. Each app hand-built its own sidebar, toasts, menus and tokens, and they drifted. The kit holds what the owner has decided is the same everywhere, so a decision is made once and every app reads it.

Version 0 has three things: the tokens, the toast, and the create button. A question that is still open has nothing here.

## Install

```bash
npm install github:gomezsj12/dalin-kit
```

It imports as `@dalin/kit`. The built `dist/` is committed, so an install needs no build step. React 19 and sonner 2 are peer dependencies; `@base-ui/react` is an optional peer, and nothing in version 0 imports it yet.

## Adopt it in an app

Import the stylesheets once, in the root layout, after the app's own base sheet:

```tsx
import "./globals.css";
import "@dalin/kit/tokens.css";
import "@dalin/kit/toast.css";
import "@dalin/kit/create.css";
```

Set two variables on `:root`. The kit supplies everything else.

```css
:root {
  --dl-accent: oklch(0.64 0.16 50);
  --dl-font-face: var(--font-inter);
}
```

Then delete the app's own copy of whatever the kit now covers. Two copies of a toast rule fight, because both carry `!important`.

## Tokens

`tokens.css` defines custom properties and no rules. Every value sits in `:where(:root)`, so the order it loads in never matters.

| Token | Value | Use |
| --- | --- | --- |
| `--dl-font` | Inter, then system and emoji fallbacks | Every app's text |
| `--dl-font-wordmark` | Georgia | The `dalin.` wordmark |
| `--dl-sidebar` | `#151515` | The desktop sidebar's fill |
| `--dl-fg` | `#ffffff` | Text |
| `--dl-fg-muted` | `#b8b8b8` | Secondary text |
| `--dl-fg-faint` | `#8f97a0` | The dimmest text, 4.53:1 on `#2f2f2f` |
| `--dl-r-control` | 7px | Controls and tooltips |
| `--dl-r-card` | 10px | Cards and menus |
| `--dl-r-sheet` | 14px | Dialogs and phone sheets |
| `--dl-r-create` | 8px | The create button |
| `--dl-create-h` | 44px | The create button's height |
| `--dl-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Every transition |
| `--dl-t-hover` | 120ms | Hover |
| `--dl-t-open` | 150ms | A menu or dialog opening |
| `--dl-t-close` | 110ms | The same closing |
| `--dl-t-sheet` | 260ms | A phone sheet |
| `--dl-meaning-archive` | `oklch(0.68 0.19 25)` | Archive, red |
| `--dl-meaning-starred` | `oklch(0.75 0.15 80)` | Starred, amber |
| `--dl-meaning-spam` | `oklch(0.72 0.17 50)` | Spam, orange |

Two rules have no token. Nothing animates when the action started from the keyboard, so the app skips the transition there. A sidebar row or icon whose place has a meaning shows its filled icon in the meaning colour on hover and while open; how a plain row looks when selected is not decided.

Don't override a token. If a screen needs a different value, ask the owner, and the answer goes in this file.

## The toast

This is notes' toast, moved here unchanged. On a desktop the stack hangs off the window's right edge: a toast slides out, holds in the corner, then tucks until only a glass tab with its icon shows, and pointing at a tab pulls the column out. On a phone a toast announces above the bottom bar, then docks behind the nav pill, which reads as the front card of the stack.

```tsx
// app/layout.tsx
import { Toaster } from "@dalin/kit";

<body>
  {children}
  <Toaster />
</body>
```

```tsx
// wherever the phone's bottom bar renders
import { ToastBand, useStackSwipe } from "@dalin/kit";

const swipe = useStackSwipe({ zone: "pill", onTick: tick });

<nav data-dl-pill {...swipe}>...</nav>
<ToastBand onTick={tick} />
```

Raise toasts with sonner's own `toast.success`, `toast.error`, `toast.warning`, `toast.info` and `toast.message`. Each kind gets its tint from the kit. For an Undo toast, `toastLine("Gate code", "archived")` puts the item's name first and lets it shorten, so the verb and the button always show whole.

### What the app's bottom bar owes the toast

The phone toast takes the nav pill's place, so it needs the pill's facts. The bar writes its measured size to `--dl-bar-w` and `--dl-bar-h` on the root element, and removes them when it unmounts. The pill carries `data-dl-pill` (or the app passes its own selector as `pill`), spreads the handlers from `useStackSwipe`, and sets `touch-action: none`.

While a finger pulls, the hook writes `data-pull="on"` on the pill, with `--pull` (0 to 1), `--pull-x` and `--pull-lift`. Once the stack moves it writes `data-pull="swell"` for 460ms. The app's own stylesheet draws those; the kit only writes them.

`<Toaster gateOpen={false} />` hides the stack while the bar is off screen, such as on a phone with a page open. Holding back toasts raised in that time is the app's job. Notes does it in `src/lib/notify.ts`.

### Variables an app may set

| Variable | Default | Meaning |
| --- | --- | --- |
| `--dl-toast-glass`, `--dl-toast-blur`, `--dl-toast-rim` | notes' bar glass | The bottom bar's glass, so pill and toast are one material |
| `--dl-bar-w`, `--dl-bar-h` | 320px, 58px | The nav pill's measured size |
| `--dl-bar-inset` | 16px | The bar's gap above the bottom safe area |
| `--dl-bar-z` | 30 | The bar's z-index; the band sits one under, the toaster two |
| `--dl-toast-floor` | 20px | How high the desktop column stands, to clear a floating button |
| `--dl-toast-room` | 24px | The gap beside a pulled out desktop toast |
| `--dl-toast-level` | `contrast(0.709) brightness(0.468)` | Levels what is behind a desktop toast, so white words hold 4.5:1 over a white page |

### What an app must not override

The tints, the white words, the Undo segment, the shapes and the timings. Don't restyle anything keyed on a `.toast-*` class or a `[data-sonner-*]` attribute. The toaster inherits the app's font, so no font rule is needed. The phone layout switches at 767px in both the stylesheet and the component, and the two change together or not at all.

Reduced motion is the app's rule to apply. Notes stops every animation from one attribute on `<html>`, and that rule reaches the toast like the rest of the screen.

## The create button

`create.css` is the accent-glass button for the one create action per app: Compose, New event, Upload. Put `dl-create` on the app's own `<button>`:

```tsx
<button className="dl-create">
  <PlusIcon /> New event
</button>
```

The class sets the height (44px), the corners (8px) and the glass. The glass is calendar's original recipe with every colour written relative to `--dl-accent`, so each app gets the same brightness in its own hue. It uses both pseudo-elements, so the button can't draw its own `::before` or `::after`. Width, padding, icon and label stay with the app.

`dl-create-shape` sets the height and corners alone. It is for notes, which keeps its own colouring and glass.

The recipe needs relative colour syntax: Chrome 119, Safari 16.4 or Firefox 128.

## Not in version 0

These are still open, so the kit has no value for them: the surface ladder beyond the sidebar, the sidebar's anatomy and its selected row, overlay glass for menus and sheets, type sizes, focus and disabled states, the phone header and bottom bar, and the command palette.

## Working on the kit

```bash
npm install
npm run typecheck
npm test
npm run build
```

Commit `dist/` with the source change that produced it. Apps install from GitHub and never build, so a stale `dist/` ships the old code. `npm run check:dist` rebuilds and fails if the result differs from what is committed.

The toast tests run the real `<Toaster>` in jsdom. `toaster.test.ts` pins one rule that is easy to break: the toaster re-sends sonner a `pointerup` to clear a stuck flag, and that event must never go out while a pointer is down, or it ends any drag in progress.
