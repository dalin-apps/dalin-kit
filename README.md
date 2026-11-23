# @dalin/kit

The parts the four dalin apps share: mail, calendar, notes and drive. Each app hand-built its own sidebar, toasts, menus and tokens, and they drifted. The kit holds what the owner has decided is the same everywhere, so a decision is made once and every app reads it.

Version 0.2 has four things: the tokens, the toast, the create button, and three helpers each app had copied. A question that is still open has nothing here. What 0.2 changed is listed under "What changed in 0.2".

## Install

```bash
npm install github:gomezsj12/dalin-kit
```

It imports as `@dalin/kit`. The built `dist/` is committed, so an install needs no build step. React 19 and sonner 2 are peer dependencies; `@base-ui/react` is an optional peer, and nothing in the kit imports it yet. The kit is tested on sonner 2.0.7, which the four apps lock, and on 2.0.8.

## Adopt it in an app

Import the stylesheets once, in the root layout, after the app's own base sheet:

```tsx
import "./globals.css";
import "@dalin/kit/tokens.css";
import "@dalin/kit/toast.css";
import "@dalin/kit/create.css";
import "@dalin/kit/motion.css";
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
| `--dl-accent-text` | `--dl-accent` at a lightness of at least 0.78 | The accent as small text |
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

`--dl-accent-text` is new in 0.1. The accent is a fill colour: as 14px text on a 14% tint of itself it reads 3.5 to 4.4:1 in mail, calendar and drive. The token raises its lightness to at least 0.78 and keeps its hue and chroma, which clears 4.5:1 on that tint over the panes (`#151515` to `#1c1c1c`). Read it for text and keep `--dl-accent` for fills, rings and tints. It needs relative colour syntax.

Two rules have no token. Nothing animates when the action started from the keyboard, and `watchInputModality` (below) keeps the attribute an app's stylesheet reads for that. A sidebar row or icon whose place has a meaning shows its filled icon in the meaning colour on hover and while open; how a plain row looks when selected is not decided.

Don't override a token. If a screen needs a different value, ask the owner, and the answer goes in this file.

## The toast

This is notes' toast, and with no props set it behaves as it did in version 0, with the exceptions listed under "What changed by default" and "What changed in 0.2". On a desktop the stack hangs off the window's right edge: a toast slides out, holds in the corner, then tucks until only a glass tab with its icon shows, and pointing at a tab pulls the column out. On a phone a toast announces above the bottom bar, then docks behind the nav pill, which reads as the front card of the stack.

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

Raise toasts with sonner's own `toast.success`, `toast.error`, `toast.warning`, `toast.info`, `toast.loading` and `toast.message`. Each kind gets its tint from the kit. For an Undo toast, `toastLine("Gate code", "archived")` puts the item's name first and lets it shorten, so the verb and the button always show whole.

### `<Toaster>` props

| Prop | Default | What it does |
| --- | --- | --- |
| `gateOpen` | `true` | `false` hides the stack while the bar is off screen, such as on a phone with a page open. Holding back toasts raised in that time is the app's job. Notes does it in `src/lib/notify.ts`. |
| `phoneMaxWidth` | 767 | The widest viewport, in px, that gets the phone layout. Calendar's phone shell runs to 899. |
| `className` | none | Extra classes for Sonner's list, beside the kit's own. |
| `cover` | none | A selector for the surfaces that cover the phone's bottom bar: sheets, dialogs, viewers. It is watched the whole time, not only as a toast arrives. |
| `scrim` | `false` | `true` lays a clear layer under a fanned phone stack, and a tap on it tucks the stack. |
| `onScrimTuck` | none | Called when that tap tucks the stack, for the app's haptic tick. |
| `defaultKind` | none | The kind a bare `toast("...")` takes: `"info"`, `"success"`, `"warning"` or `"error"`. |
| `reducedMotionSelector` | none | The selector that is true while the app's own reduced-motion switch is on. |
| `fullMotionSelector` | none | The selector that is true while the app's own switch says Full motion. While it matches, the system's reduced-motion setting is not followed. |
| `reducedTransparencySelector` | none | The selector that is true while the app has transparency turned off. |

### Where the phone layout starts

`toast.css` has no width media query. The `<Toaster>` reads the width and writes `toast-phone` or `toast-tuck` on the list, so the stylesheet and the component can't disagree. The width is `phoneMaxWidth`, then `--dl-phone-max` on `:root` (a length in px, for an app that would rather say it in CSS), then 767.

`<ToastBand>` follows the same width without being told, and renders nothing above it. `usePhoneLayout()` returns the same answer for the app's own code.

### A dock other than the nav pill

The pill is where a phone toast docks unless a surface says otherwise. Each surface that owns the bottom of the phone screen registers itself, and the highest rank wins:

```tsx
import { useToastDock } from "@dalin/kit";

useToastDock(barRef, { kind: "pill", rank: 10 });
useToastDock(chipRef, { kind: "line", rank: 35 });
useToastDock(sheetRef, { kind: "cover", rank: 50 });
```

| Kind | What it is | What the toast does |
| --- | --- | --- |
| `"pill"` | The bottom bar in any of its faces | Announces above it and tucks behind it. Also the behaviour with nothing registered, on a page that has a bar. |
| `"line"` | Another surface's edge is the floor, such as a parked chip | Announces 12px above the line and dives behind it. The waiting cards peek above the line, a sliver each, and the band lies on the slivers. A fanned stack stays out. |
| `"cover"` | A sheet or dialog hides the bar | Announces above its edge, dives behind it, and waits out of sight until the pill is the dock again. A fanned stack is tucked first. |

`useToastDock(ref, options)` takes `kind` (default `"line"`), `rank` (default 0, ties go to the newest), `edge` (`"top"` or `"bottom"` of the element, default top), `line` (a fixed number of px from the viewport's bottom, in place of measuring) and `active`. `registerToastDock(el, options)` is the same outside React and returns the function that removes it. The line is measured on resize, when a transition on the element ends, and again as each toast arrives.

Where the strip above a dock is too short for a toast, the toast holds where the pill would be and dives off the bottom of the screen. No sliver shows there, and the band stands down. An announce finishes over the line it began on, even if the sheet closes meanwhile.

Over a `"line"` with room above it, the list also carries `toast-over-line`. `<ToastBand>` leaves the bar's dead space, which the other surface now owns, and takes the pill's width over the slivers. A tap there fans the stack. While the stack is out the band keeps only the 12px under the first card, so set `scrim` in an app that registers a line: a tap anywhere else then tucks the stack. The band stands down under a pinned toast, whose button sits over the slivers.

`<Toaster cover=".sheet, .dialog">` is the short form of `"cover"`. The kit looks for a matching surface as each toast arrives and announces above the highest one. The mark on the list lasts for that toast's announce and dive, then the stack waits behind the pill the cover hides. Name every full-screen overlay in the selector, or its toasts announce under its scrim.

The selector is watched between toasts too. While a cover is up, a fanned stack is tucked and `<ToastBand>` is inert and out of the tab order. The same holds under a dock registered as `"cover"`. `useToastCovered()` returns that answer for the app's own code.

`useToastDockKind()` returns the kind in force, for an app that shows something only while the pill is the dock. `useToastDockState()`, `readToastDock()`, `readToastCovered()`, `refreshToastDock()`, `measureToastCover(selector)` and `dockLine()` are the pieces underneath.

### A phone page with no bar

A sign-in page or a guest page has no bottom bar, so it has no pill to dock behind. There the toast is a plain one: Sonner's own stack on the bottom edge, in the family's glass, with no announce and Sonner's four seconds. The list carries `toast-plain` in place of `toast-phone`.

The kit knows a pill is on the page while a bar says so. Mounting the pill's swipe (`useStackSwipe` with `zone: "pill"`), a `<ToastBand>`, or a dock of kind `"pill"` each counts, so an app that follows "What the app's bottom bar owes the toast" needs nothing more. `useToastPill()` returns the answer, and `registerToastPill()` counts one outside React.

Two cases keep the phone layout with no pill mounted. A dock another surface registered still places the toast on its line, which is how calendar docks a barless page on the bottom edge. And a closed gate keeps the stack waiting, hidden, with its thirty seconds.

### Classes on the list

The kit writes these on Sonner's list, and `<Toaster className>` adds the app's own beside them. An app rule can key on both, so no app needs a copy of the kit's hold times to know when a toast is announcing.

| Class | On while |
| --- | --- |
| `toast-phone`, `toast-tuck` | The phone layout, or the desktop column |
| `toast-plain` | A phone page with no pill: a plain toast on the bottom edge |
| `toast-announcing` | A toast is popped out and holding |
| `toast-slotting` | That toast is diving into the stack (720ms) |
| `toast-again` | The announce is about a toast updated in place; its card carries `data-again` |
| `toast-calm` | The announce is a pinned toast's result, which holds with no pop |
| `toast-stack-open` | The phone stack is fanned out |
| `toast-over`, `toast-over-edge` | The dock is not the pill; the line is in `--dl-dock-line` |
| `toast-over-line` | That dock is a line with room above it, so the stack peeks over it |
| `toast-still` | Motion is reduced |
| `toast-motion` | The app's Full motion choice is on |
| `toast-solid` | Transparency is off |
| `toast-gate-closed` | `gateOpen` is `false` |

### Pinned toasts

```tsx
import { PINNED_TOAST } from "@dalin/kit";

toast("Sending in 5s", {
  id,
  className: PINNED_TOAST,
  duration: Infinity,
  action: { label: "Undo", onClick: undo },
});
```

A pinned toast (the class `toast-pinned`) stays in view until it is dismissed or loses the class. On the desktop it never tucks. On the phone it holds 14px above the pill with its content showing and its button pressable, and a toast that arrives meanwhile announces one card higher. It is for a toast whose button is the point of it, such as a send counting down.

A pinned toast's arrival is not an announce. It is in view already, so nothing pops and the cards behind it are not hidden for a hold. When it is released to its result under the same id, the result holds where the pinned toast stood and then tucks:

```tsx
toast.success("Sent", { id, className: undefined, duration: 4000, action: undefined });
```

The list carries `toast-calm` for that hold and dive.

### Updating a toast in place

Raise a toast under an id that is already up and Sonner updates it. The kit announces it again when the update changes its kind or its words, from whichever card it sits on. So work and its result can be one toast:

```tsx
toast.loading("Uploading 3 files", { id });
toast.success("Uploaded 3 files", { id });
```

A toast that arrives while the phone's stack is fanned out is not announced. It joins the fan. A toast updated from beyond the cards Sonner shows (five on the desktop, three on the phone) is shown for its announce.

A tick is not announced: progress that is still progress, a pinned countdown, or the same toast raised again unchanged. Sonner keeps every field an update doesn't name, so set `className: undefined` or `action: undefined` to drop one. `announcesUpdate`, `faceOf` and `textOf` are the rule itself, exported for an app's tests.

### The progress kind and the default kind

`toast.loading()` raises the progress kind (`toast-progress`): the app's accent in the same recipe as the other kinds, with a spinner as its icon. On the phone its card behind the pill wears a bar along the top edge that sweeps while the work runs. Put `PROGRESS_DONE_TOAST` on the result to keep that bar, solid green, until it times out. A plain toast can carry `PROGRESS_TOAST` itself with `<ToastSpinner />` as its `icon`.

A bare `toast("...")` has no kind, so it wears the plain glass and its tucked desktop tab is a blank strip. `<Toaster defaultKind="info">` gives every bare toast that kind's tint and icon. It is off by default, which keeps notes' plain toast as it is.

A bare toast under a default kind carries `toast-bare` and `toast-bare-info`, never `toast-info`. Sonner 2.0.7 puts the default class on every toast, typed ones included, so each rule reads those two classes only on a card with no `data-type`. A typed toast keeps its own tint on both Sonner versions.

### What the app's bottom bar owes the toast

The phone toast takes the nav pill's place, so it needs the pill's facts. The bar writes its measured size to `--dl-bar-w` and `--dl-bar-h` on the root element, and removes them when it unmounts. The pill carries `data-dl-pill` (or the app passes its own selector as `pill`), spreads the handlers from `useStackSwipe`, and sets `touch-action: none`.

While a finger pulls, the hook writes `data-pull="on"` on the pill, with `--pull` (0 to 1), `--pull-x` and `--pull-lift`. Once the stack moves it writes `data-pull="swell"` for 460ms. The app's own stylesheet draws those; the kit only writes them.

`useStackSwipe` and `<ToastBand>` take the same options:

| Option | What it does |
| --- | --- |
| `pill` | A selector for the nav pill. Defaults to `[data-dl-pill]`. |
| `onTick` | Called once each time the stack fans out or tucks, for the app's haptic tick. |
| `onFan`, `onTuck` | The two ticks apart. Each falls back to `onTick`. |
| `liftTarget` | A selector for a second element that gets `--pull-lift` with the pill, such as a button beside it that rises too. |
| `pullOn` | A selector the matched pill must also match to draw the pull. While it doesn't, the swipe still works, nothing is written on the pill, and the peeking cards don't lift. |
| `reducedMotion` | A reader for the app's own motion switch. Left out, the part follows the switch the `<Toaster>` was told about (see "One place for the motion switch"). |

`<ToastBand>` also takes `label`, its accessible name, which defaults to "Show notifications".

### Keyboard and screen readers

While the phone's stack is tucked, its toasts and their buttons are out of the tab order, because a card behind the pill is out of sight. Sonner's live region stays in the accessibility tree, so an arriving toast is still announced. A pinned toast, an announcing toast and a fanned stack keep their tab stops, and the desktop's tabs are never held. During an announce only the announcing toast keeps them: the cards it hides stay out of the tab order.

The band is the way in. It is a button named "Show notifications" with `aria-expanded`, reachable by Tab, and Enter fans the stack. Its focus ring is drawn around the pill's footprint, since the band itself is as wide as the screen. Under a cover the band is inert and takes no Tab.

### Reduced motion and reduced transparency

Each app has its own switch for these, on its own attribute. Name the selector and the kit applies its own rules, so the app restates none. This is calendar's, the one app with all three:

```tsx
<Toaster
  reducedMotionSelector='html[data-motion="reduced"]'
  fullMotionSelector='html[data-motion="full"]'
  reducedTransparencySelector='html[data-glass="off"]'
/>
```

The value is each app's own word. Calendar writes `data-motion="reduced"`. Mail and drive write `data-motion="reduce"` and have no Full choice, so they pass that one selector. Notes writes one attribute with no value, shown further down. Copy the selector from the app's stylesheet: a selector that never matches fails silently, and the toast then follows the system's setting alone.

While the first matches, or the system asks for reduced motion, the phases still happen and the travel between them doesn't. The progress bar stops mid sweep and the spinner slows to 2.4s. While the third matches, each toast is drawn solid: `--dl-toast-solid` under the kind's tint, with no blur. Without that prop a toast is always glass.

`fullMotionSelector` is for an app whose switch can say Full motion on a machine that asks for less. While it matches, the system's setting is not followed. The app's reduce switch still wins where both match. An app whose one attribute is the whole answer names its absence:

```tsx
<Toaster
  reducedMotionSelector=":root[data-reduced-motion]"
  fullMotionSelector=":root:not([data-reduced-motion])"
/>
```

Sonner has its own rule for the system's setting, in the stylesheet it appends to the page, and it stops every toast's transitions and animations with `!important`. For an app that names a full-motion selector, the kit scopes that rule once to toasters without `toast-motion`, and writes the class on its list while the choice is on. Any other toaster on the page is ruled as before.

Pass `reducedMotionSelector` even where the app has a blanket rule of its own, the kind that cuts every element's animation to one run of next to no time. The kit's rules outweigh that blanket rule, so the spinner keeps turning slowly and the progress bar holds mid sweep, but they apply only while `toast-still` is on. Without the prop the app's rule stops the spinner after one turn.

### One place for the motion switch

The toast is told about the switch with selectors because a stylesheet needs a class to key on. The band, the pill's swipe and the close fade are script, and in 0.2 each took a reader of its own. An app that forgot one got the system's setting for that part.

From 0.3 the two selectors on the `<Toaster>` are the one place. While a `<Toaster>` that names them is mounted, `<ToastBand>`, `useStackSwipe`, `watchLeaving` and `leaveInPlace` follow the same answer, so the app passes them no `reducedMotion`. With no selector named they follow the system's setting, as before.

An app whose switch is not a selector names its reader once instead:

```tsx
import { setMotionReader } from "@dalin/kit";

useEffect(() => setMotionReader(() => settings.motion === "reduced"), []);
```

That reader wins over the toaster's selectors, and a `reducedMotion` option passed to one part still wins for that part. `reducesMotion()` returns the answer in force for the app's own code, and `systemReducesMotion()` is the system's setting alone.

### Variables an app may set

| Variable | Default | Meaning |
| --- | --- | --- |
| `--dl-toast-glass`, `--dl-toast-blur`, `--dl-toast-rim` | notes' bar glass | The material under every kind's tint |
| `--dl-toast-solid` | `#282828` | The fill in place of the glass while transparency is off |
| `--dl-bar-w`, `--dl-bar-h` | 320px, 58px | The nav pill's measured size |
| `--dl-bar-inset` | 16px | The bar's gap above the bottom safe area |
| `--dl-bar-z` | 30 | The bar's z-index; the band sits one under, the toaster two |
| `--dl-toast-over-z` | 60 | The toaster's z-index while the dock is not the pill: over sheets and dialogs, under menus |
| `--dl-phone-max` | 767px | Where the phone layout starts, in place of `phoneMaxWidth` |
| `--dl-toast-floor` | 20px | How high the desktop column stands, to clear a floating button |
| `--dl-toast-room` | 24px | The gap beside a pulled out desktop toast |
| `--dl-toast-level` | `contrast(0.709) brightness(0.468)` | Levels what is behind a desktop toast, so white words hold 4.5:1 over a white page |
| `--dl-toast-scrim` | `transparent` | The fill of the layer under a fanned phone stack, with `<Toaster scrim>` |
| `--dl-focus-ring` | the text colour | The keyboard ring on the band and the create button |

The three glass variables need a note. On the phone the toast stands in for the nav pill, so the two read best as one material, and an app may point the three at its own bar's glass. The owner's pick on 2026-11-22 is notes' toast styling in every app, and the defaults are that styling. So leave them alone unless the owner asks for an app's toast to match its own bar. How strong the phone toast's glass should be is still his to decide.

The family has not picked a focus colour. `--dl-focus-ring` falls back to the text colour until it does, and an app points it at its own ring colour meanwhile.

### What an app must not override

The tints, the white words, the Undo segment, the shapes and the timings. Don't restyle anything keyed on a `.toast-*` class or a `[data-sonner-*]` attribute. The toaster inherits the app's font, so no font rule is needed.

### What changed by default

Four things differ from version 0 with no props set. Every phone toast is now held to one line, where only a toast with a button was. The tucked phone stack's buttons leave the tab order and the band takes Tab. A toast updated in place announces again when its kind or words change. And `toast.loading()` wears the progress kind, where it wore the plain glass with Sonner's own spinner; notes raises none today.

### What changed in 0.2

Nine things differ from 0.1 with no props set.

- A toast that arrives in a fanned phone stack joins it, where it used to fold the stack for the announce. Fanning the stack out during an announce ends the announce at once.
- A pinned toast's arrival no longer runs the announce, and its release to a result holds with no pop.
- During an announce the cards it hides are out of the tab order.
- A desktop toast swipes away in all four directions, where only down and right worked.
- A toast announced again from beyond the visible cards is shown.
- A phone page with no bar mounted shows a plain toast.
- Over a `"line"` dock the stack peeks above the line and the band stays, where both used to go.
- Under a cover the band is inert, between toasts as well, and a cover that opens over a fanned stack tucks it.
- The spinner and the progress bar hold under an app's blanket reduced-motion rule.

A bare toast under `defaultKind` carries `toast-bare-info` in place of `toast-info`, which fixes typed toasts taking the default tint on Sonner 2.0.7. `scrim`, `onScrimTuck` and `fullMotionSelector` are new and off by default.

## The create button

`create.css` is the accent-glass button for the one create action per app: Compose, New event, Upload. Put `dl-create` on the app's own `<button>`:

```tsx
<button className="dl-create">
  <PlusIcon /> New event
</button>
```

| Class | What it sets | For |
| --- | --- | --- |
| `dl-create` | The height (44px), the corners (8px) and the glass | The sidebar's create button |
| `dl-create-glass` | The glass alone | A shape the app owns, such as the phone's 56px circle |
| `dl-create-shape` | The height and corners alone | An app that keeps a glass of its own |

The glass is calendar's original recipe with every colour written relative to `--dl-accent`, so each app gets the same brightness in its own hue. It uses both pseudo-elements, so the element can't draw its own `::before` or `::after`. Where it must, put `dl-create-glass` on a `<span>` inside it. Width, padding, icon and label stay with the app.

With `dl-create-glass` the app sets the size and the corners, and the glass's two layers inherit the radius. Its `position` and `transition` sit in `:where()`, so one class of the app's own wins for both. Mail's and drive's circles no longer need to override anything.

Notes uses none of the three today. It keeps its circle, with its own colouring and glass.

Both glass classes ship a `:focus-visible` outline. The stylesheet is not in a cascade layer, so the glass's box-shadow beats a ring an app draws as a shadow from inside one, which is how Tailwind's ring utilities work. An outline can't be covered that way. A glass `<span>` inside a focused button wears the ring for it.

Where the button draws a ring of its own, that makes two. Add `dl-create-no-ring` to the `<span>` and it draws none:

```tsx
<button className="upload">
  <span className="dl-create-glass dl-create-no-ring" />
  <UploadIcon /> Upload
</button>
```

The recipe needs relative colour syntax: Chrome 119, Safari 16.4 or Firefox 128.

## Helpers

Three things each app had copied. They export from `@dalin/kit` and from `@dalin/kit/helpers`.

### The close fade

A menu or dialog an app builds by hand unmounts the moment it closes, so it vanishes in one frame. `watchLeaving` leaves an inert copy where it stood, and `motion.css` fades the copy over the family's 110ms.

```tsx
import { watchLeaving } from "@dalin/kit";

useEffect(() => watchLeaving({ selectors: [".event-menu", ".settings-scrim"], reducedMotion }), []);
```

Name each overlay that should fade. A scrim that wraps its card is named alone, since its copy carries the card. No copy is left for a close that started from the keyboard, under reduced motion, for an overlay removed with its container, or for one replaced by another of its kind. `reducedMotion` is a reader for the app's own switch. Left out, the fade follows the switch the `<Toaster>` was told about.

An overlay that stays mounted and hides by a class calls `leaveInPlace(node)` before it hides, and `endFades(selector)` as it opens again. The copy carries `data-dl-leaving` (`LEAVING_ATTR`). `shouldLeave` is the rule for one node, exported for tests. This replaces calendar's and notes' `src/lib/leaving.ts` and their `[data-leaving]` rules.

### The input-modality watcher

```tsx
import { watchInputModality } from "@dalin/kit";

useEffect(() => watchInputModality(), []);
```

It writes `data-input="keyboard"` or `data-input="pointer"` on `<html>`. A bare modifier is not a keystroke, and moving the pointer hands the turn back to it. The app's stylesheet lands its own overlays at once with it:

```css
html[data-input="keyboard"] :is(.event-menu, .settings-modal) {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}
```

`startedFromKeyboard()` answers the same question for script, and `inputForKey(key)` is the rule for one key. `INPUT_ATTR` is the attribute's name.

### The tooltip key

```tsx
import { TipKey, shortcutLabel } from "@dalin/kit";

<TooltipContent>
  Undo
  <TipKey keys={shortcutLabel("Mod", "Z")} />
</TooltipContent>
```

That reads "Undo · Ctrl+Z" on a PC and "Undo · ⌘Z" on a Mac. `shortcutLabel` takes `Mod`, `Shift` and `Alt` for the platform's keys and writes every other key as given. `<TipKey>` draws the dot and the key in the muted grey, or in the app's own `className`, and renders nothing without a key. `tipText("Archive", "E")` is the same line as a string. `shortcutLabelFor(mac, keys)` and `isMacPlatform(platform)` are the pure halves. The tooltip itself stays each app's own.

## Not in version 0.2

These are still open, so the kit has no value for them: the surface ladder beyond the sidebar, the sidebar's anatomy and its selected row, overlay glass for menus and sheets, type sizes, the focus colour and disabled states, the phone header and bottom bar, the strength of the phone toast's glass, and the command palette.

## Working on the kit

```bash
npm install
npm run typecheck
npm test
npm run build
```

Commit `dist/` with the source change that produced it. Apps install from GitHub and never build, so a stale `dist/` ships the old code. `npm run check:dist` rebuilds and fails if the result differs from what is committed.

The toast tests run the real `<Toaster>` in jsdom. jsdom has no cascade to trust for `:where()` and `:has()`, so a test that needs to know which of two rules wins weighs their selectors with `test/css.ts`. A test about the docked phone stack that mounts no bar calls `withPill()` from `test/pill.ts`, since the toaster docks only beside a pill.

The dev dependency is pinned to sonner 2.0.7, the version the apps ship. 2.0.8 is installed beside it as `sonner-next`, and `default-kind-next.test.ts` runs the default kind's suite on it. `toaster.test.ts` pins one rule that is easy to break: the toaster re-sends sonner a `pointerup` to clear a stuck flag, and that event must never go out while a pointer is down, or it ends any drag in progress.
