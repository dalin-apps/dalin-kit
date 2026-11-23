# @dalin/kit

The parts the four dalin apps share: mail, calendar, notes and drive. Each app hand-built its own sidebar, toasts, menus and tokens, and they drifted. The kit holds what the owner has decided is the same everywhere, so a decision is made once and every app reads it.

Version 0.4 holds the tokens, the toast, the create button, the wordmark with its family switcher, frosted menus and popovers, an empty state, the command palette, the phone header with its search, and the helpers each app had copied. A question that is still open has nothing here. What an app changes to take 0.4 is listed under "Moving an app from 0.3 to 0.4".

## Install

```bash
npm install github:gomezsj12/dalin-kit
```

It imports as `@dalin/kit`. The built `dist/` is committed, so an install needs no build step. React 19 and sonner 2 are peer dependencies. `@base-ui/react` 1.4.1 or later is an optional one: the components are built on it, and the toast and the helpers are not.

The package has two code entries. `@dalin/kit` is the toast and the helpers, and loads nothing of Base UI. `@dalin/kit/components` is everything built on Base UI: the wordmark and family switcher, menus, the palette, the empty state and the phone parts. In 0.3 the root exported the components as well, so importing the toast loaded Base UI. An app moving to 0.4 changes those imports to `@dalin/kit/components`. `@dalin/kit/toast` and `@dalin/kit/helpers` are each half of the root alone.

The kit is tested on sonner 2.0.7, which the four apps lock, and on 2.0.8. The components are tested on Base UI 1.4.1 and 1.9.0, the oldest and the newest the apps ship.

## Adopt it in an app

Import the stylesheets once, in the root layout, after the app's own base sheet:

```tsx
import "./globals.css";
import "@dalin/kit/tokens.css";
import "@dalin/kit/toast.css";
import "@dalin/kit/create.css";
import "@dalin/kit/motion.css";
import "@dalin/kit/wordmark.css";
import "@dalin/kit/menu.css";
import "@dalin/kit/empty.css";
import "@dalin/kit/palette.css";
import "@dalin/kit/phone.css";
```

The last five are new in 0.3, one to a part, so an app adds a sheet as it adopts that part. The family switcher and the command palette also need `menu.css`.

From 0.4 the component sheets (`menu`, `palette`, `phone`, `empty`, `wordmark`, `motion`) put their rules in a cascade layer named `dalin`. State the layer order once, as the first line of the app's own sheet, before Tailwind is imported:

```css
@layer theme, base, dalin, components, utilities;
@import "tailwindcss";
```

That puts the kit after Tailwind's reset and before its utilities. A utility the app passes through `className` then wins over the kit's default, whatever the two selectors weigh: `<MenuContent className="min-w-64">`, `<MenuItem className="whitespace-normal">`. So does a rule in the app's own `components` layer, and so does any rule the app writes outside a layer.

Without that line the `dalin` layer is defined when the kit's first sheet loads, after Tailwind's layers, and the kit's defaults beat utilities as they did in 0.3. An app's unlayered rules win either way, including one lighter than the kit's rule it used to lose to. Check an app's own rules on `.dl-*` classes when it takes 0.4.

Three sheets stay out of the layer. `tokens.css` needs none: its values sit in `:where(:root)` and weigh nothing. `toast.css` has to beat the stylesheet Sonner appends to the page, which is unlayered, and a layered rule can't. `create.css` goes on the app's own button beside the app's utilities, and holds the glass recipe and nothing an app should change, so in a layer a stray shadow or ring utility would replace the glass.

Set three variables on `:root`. The kit supplies everything else.

```css
:root {
  --dl-accent: oklch(0.64 0.16 50);
  --dl-font-face: var(--font-inter);
  --dl-focus-ring: var(--dl-accent);
}
```

The toast and the helpers import from `@dalin/kit`, and every component from `@dalin/kit/components`.

Then delete the app's own copy of whatever the kit now covers. Two copies of a toast rule fight, because both carry `!important`.

## Moving an app from 0.3 to 0.4

0.4 fixes what a three-stage review of the four apps found in 0.3. Six things need a change in the app, or a look.

- Components import from `@dalin/kit/components`. The root exports the toast and the helpers and no longer loads Base UI.
- The component sheets sit in the `dalin` cascade layer. Add the `@layer` line from "Adopt it in an app", then check the app's own rules on `.dl-*` classes: an unlayered rule now beats the kit's whatever it weighs.
- `<PhoneSearch>` pushes a history entry of its own. An app that already gives search one passes `systemBack={false}` or drops its own. A row that closes search now runs a moment after the tap, once the entry has gone.
- `<ContextMenu>` is not modal. An app that passed `modal={false}`, which Base UI ignored, can delete it.
- `<FamilySwitcher>` opens to the right of the wordmark. A sidebar that set `side` or `align` to move the menu off its own controls can drop them.
- The command palette shows a query's list whole. A source that answers at once is unchanged. One that answers later no longer shows its rows group by group.

Everything else is additive: `covered`, `beforeQuery` and a row's `meta` on `<PhoneSearch>`, a row's `verb` in the palette, `finalFocus` and `collisionAvoidance` on `<MenuContent>`, `setMotionAttr`, and the keyboard inset, the toaster's tab stop and `aria-keyshortcuts`, which need nothing from the app.

## Tokens

`tokens.css` defines custom properties and no rules. Every value sits in `:where(:root)`, so the order it loads in never matters.

| Token | Value | Use |
| --- | --- | --- |
| `--dl-font` | Inter, then system and emoji fallbacks | Every app's text |
| `--dl-font-wordmark` | Georgia | The `dalin.` wordmark |
| `--dl-sidebar` | `#151515` | The desktop sidebar |
| `--dl-list` | `#181818` | A second pane: mail's list, drive's file list |
| `--dl-content` | `#1c1c1c` | The reader, the page, calendar's grid, drive's inspector |
| `--dl-raised` | `#242424` | A card or a field standing on a pane |
| `--dl-selected` | `#262626` | The selected lift: the open row, the picked item |
| `--dl-hover-sidebar`, `--dl-hover-list`, `--dl-hover-content` | `#1e1e1e`, `#202020`, `#242424` | A row under the pointer, by the pane it sits on |
| `--dl-row-h`, `--dl-row-text` | 32px, 14px | A top navigation row in the sidebar |
| `--dl-row-dense-h`, `--dl-row-dense-text` | 28px, 13px | A row in a long list under it |
| `--dl-row-icon` | 17px | A sidebar row's icon |
| `--dl-row-selected`, `--dl-row-selected-icon` | `--dl-selected`, `--dl-fg` | The open plain row, and its filled icon |
| `--dl-bar-glass`, `--dl-bar-blur`, `--dl-bar-rim` | a grey at 45%, `blur(14px)`, white at 9% | The phone's bottom bar |
| `--dl-border`, `--dl-border-strong` | `#2f2f2f`, `#3d3d3d` | A rule between blocks; the edge of a floating surface |
| `--dl-overlay`, `--dl-overlay-blur` | `#202020` at 72%, `blur(16px) saturate(1.5)` | The overlay glass |
| `--dl-overlay-level` | `contrast(0.709) brightness(0.468)` | Levels what is behind the glass |
| `--dl-overlay-edge`, `--dl-overlay-shadow` | `--dl-border-strong`, one shadow | The glass's edge and its shadow |
| `--dl-overlay-hover`, `--dl-overlay-rule` | white at 8%, white at 9% | A highlighted row on the glass; a rule inside a menu |
| `--dl-overlay-solid` | `#1f1f1f` | The grey the frost reads as: an arrow, and the fill with transparency off |
| `--dl-dialog` | `#1f1f1f` | The settings dialog, which stays solid |
| `--dl-danger` | `oklch(0.68 0.19 25)` | A destructive act, as a fill or a ring |
| `--dl-danger-text` | `--dl-danger` at a lightness of at least 0.74 | The same red as text |
| `--dl-kbd-face`, `--dl-kbd-edge` | `#383838`, `#5c5c5c` | The keycap |
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

One rule has no token. Nothing animates when the action started from the keyboard, and `watchInputModality` (below) keeps the attribute a stylesheet reads for that. The kit's own menus, popovers and palette follow it already, and from 0.4 they follow the app's own motion switch too.

Don't override a token. If a screen needs a different value, ask the owner, and the answer goes in this file.

### Surfaces, by position

The owner picked this on 2026-11-22. A pane takes its fill from where it stands, left to right, and never from what it holds: the sidebar, then a second pane, then the content. So drive's file list is the list step under an inspector on the content step, and mail's list is one step up from its sidebar.

A row under the pointer lightens about halfway from its own pane to the selected lift. It shows on every pane that way and never matches the selected lift, which is one grey everywhere. A row in the sidebar reads `--dl-hover-sidebar`, a row in a list `--dl-hover-list`, a row on the content `--dl-hover-content`.

The sidebar's hover is the ladder's smallest step, `#151515` to `#181818`. If it reads too faint in the real screen, that is a question for the owner, not a value to override.

### Sidebar rows

Top navigation (Inbox, Home, the views) is a 32px row at 14px. A long list under it (calendars, folders, pinned pages) is a 28px row at 13px, so it shows more names and cuts fewer. Icons are 17px in both.

The open plain row wears `--dl-row-selected` with its icon filled and white. A row whose place has a meaning shows its filled icon in that meaning's colour instead, on hover and while open, the same colour in every app: `--dl-meaning-archive`, `--dl-meaning-starred`, `--dl-meaning-spam`.

These are tokens with no class behind them. Each app's sidebar keeps its own markup and reads the values.

### The phone bar's glass

`--dl-bar-glass` is calendar's bar: a grey at 45% over a 14px blur, with a rim of white at 9%. The owner picked it over the other three bars on 2026-11-22. An app points its own bar at the three tokens and deletes its own recipe. The phone toast wears the same glass by default (see "Variables an app may set").

### The overlay glass

Menus, context menus, popovers, the command palette, tooltips and phone sheets are frosted: `--dl-overlay` over `--dl-overlay-blur`, with the strong edge and one shadow. The settings dialog is the exception. It stays solid, on `--dl-dialog` with the same edge.

The kit's own overlays read these tokens. An app's tooltip and its phone sheets are still its own, and read them from the app's rules.

`--dl-overlay-level` is the toast's fix for bright content, applied to menus and popovers. A menu can open over a white email, where the bare glass turned pale and muted words fell to 3.2:1. The filter brings white down to a mid grey before the glass goes on, and muted words then hold 6.3:1. It leaves a dark pane where it is, so nothing changes on the family's own surfaces. Set it to `contrast(1)` to turn it off.

An app with a transparency switch points `--dl-overlay` at `--dl-overlay-solid` while the switch is off. Its own rule already stops the blur.

### The destructive red

`--dl-danger` is mail's red. As 14px text it holds 5.2:1 on the glass over a dark pane, 4.2:1 on a highlighted row and 4.0:1 over a white page. So text reads `--dl-danger-text`, the same hue at a lightness of at least 0.74, which clears 4.5:1 in all three. It is the rule `--dl-accent-text` follows: one token for fills and rings, a lighter one for words.

### The focus ring

The keyboard ring is each app's accent, picked on 2026-11-22. `--dl-focus-ring` still falls back to the text colour where nothing sets it, so set it to `var(--dl-accent)` on `:root`, as the adoption block above does. The band, the create button, the family switcher and the phone's icons all read it.

## The toast

This is notes' toast, and with no props set it behaves as it did in version 0, with the exceptions listed under "What changed by default", "What changed in 0.2" and "What changed in 0.3". On a desktop the stack hangs off the window's right edge: a toast slides out, holds in the corner, then tucks until only a glass tab with its icon shows, and pointing at a tab pulls the column out. On a phone a toast announces above the bottom bar, then docks behind the nav pill, which reads as the front card of the stack.

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
| `coverSkip` | none | A selector for the app's own exit copies, which cover nothing, such as drive's `[data-ghost]`. |
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

A cover that closes may leave a copy of itself to fade out, and the copy still matches the selector. The kit skips its own copies (`data-dl-leaving`, from `watchLeaving`). An app that leaves copies under an attribute of its own names it in `coverSkip`:

```tsx
<Toaster cover=".dialog-overlay, .sheet" coverSkip="[data-ghost]" />
```

A surface that matches `coverSkip`, or sits inside one that does, is not a cover. `measureToastCover(selector, skip)` takes the same second argument.

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

Two variables set how strong the accent is in that glass: `--dl-toast-progress-tint` (22%) and `--dl-toast-progress-rim` (36%). An app whose accent is strong lowers them on `:root`. Mail's violet sat at 12% with a 28% rim:

```css
:root {
  --dl-toast-progress-tint: 12%;
  --dl-toast-progress-rim: 28%;
}
```

A countdown is its own kind (`toast-countdown`, the class `COUNTDOWN_TOAST` names): a toast that counts seconds down to something that can still be undone.

```tsx
import { COUNTDOWN_TOAST, PINNED_TOAST } from "@dalin/kit";

toast("Sending in 5s", {
  id,
  className: `${PINNED_TOAST} ${COUNTDOWN_TOAST}`,
  duration: Infinity,
  action: { label: "Undo", onClick: undo },
});
```

It wears the progress kind's glass and reads the same two variables. It draws no spinner, and on the phone no sweep bar, since the seconds in its words are the progress. The bar stays off even on a countdown that also carries a progress class. Its ticks are not announced.

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

From 0.4 the kit's other stylesheets follow the same switch. A `<Toaster>` that names the selectors writes the choice on `<html>` as `data-dl-motion="reduce"` or `data-dl-motion="full"` (`MOTION_ATTR`), and takes it off while neither matches. `menu.css`, `palette.css` and `wordmark.css` read it. The app's Reduce stills menus, popovers, the palette and the wordmark's roll. The app's Full keeps them moving on a machine that asks for less, and with no choice written they follow the system's setting, as in 0.3. The phone's search sheet has no motion to still.

An app whose switch is not a selector writes the attribute itself, beside its reader:

```tsx
import { setMotionAttr } from "@dalin/kit";

useEffect(() => setMotionAttr(settings.motion === "reduced" ? "reduce" : null), [settings.motion]);
```

### Variables an app may set

| Variable | Default | Meaning |
| --- | --- | --- |
| `--dl-toast-glass`, `--dl-toast-blur`, `--dl-toast-rim` | notes' bar glass | The material under every kind's tint on the desktop, and under a plain phone toast |
| `--dl-toast-phone-glass`, `--dl-toast-phone-blur`, `--dl-toast-phone-rim` | `--dl-bar-glass`, `--dl-bar-blur`, `--dl-bar-rim` | The same three for the phone toast that docks behind the pill |
| `--dl-toast-progress-tint`, `--dl-toast-progress-rim` | 22%, 36% | How strong the accent is in the progress and countdown kinds |
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
| `--dl-toast-scrim-over` | `--dl-toast-scrim` | The same fill while the dock is not the pill |
| `--dl-toast-scrim-fade` | 200ms | How long the scrim's fill takes to fade in |
| `--dl-focus-ring` | the text colour | The keyboard ring: set it to the app's accent |

The docked phone toast stands in for the nav pill, so it wears the bar's glass. That is the owner's pick on 2026-11-22: "same frost as the bar". The three `--dl-toast-phone-*` variables default to the bar's tokens, and an app leaves them alone. The desktop toast and the plain phone toast keep notes' glass, in the three `--dl-toast-*` variables.

An app that pointed `--dl-toast-glass` at its own bar in 0.2, as notes did, can delete those lines. They no longer reach the docked phone toast.

The scrim's fill may differ while the dock is not the pill. Mail is the case: it dims the page over its parked draft chip, leaves it clear over the pill, and so sets `--dl-toast-scrim-over` alone, where 0.2 needed a rule keyed on the kit's own class. The fill fades in over 200ms. Under reduced motion it lands at once.

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

### What changed in 0.3

Four things differ from 0.2 with no props set.

- The docked phone toast wears the bottom bar's glass (45% over a 14px blur, a 9% rim), where it wore notes'. The desktop toast is as it was.
- The scrim's fill fades in over 200ms.
- `<ToastBand>`, `useStackSwipe` and `watchLeaving` follow the motion switch the `<Toaster>` was told about, where each fell back to the system's setting.
- The progress kind reads its strength from two variables. Their defaults are the old values.

`coverSkip`, `COUNTDOWN_TOAST`, `--dl-toast-scrim-over` and `setMotionReader` are new and change nothing until used.

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

Both glass classes ship a `:focus-visible` outline. The stylesheet is not in a cascade layer, on purpose (see "Adopt it in an app"), so the glass's box-shadow beats a ring an app draws as a shadow from inside one, which is how Tailwind's ring utilities work. An outline can't be covered that way. A glass `<span>` inside a focused button wears the ring for it.

Where the button draws a ring of its own, that makes two. Add `dl-create-no-ring` to the `<span>` and it draws none:

```tsx
<button className="upload">
  <span className="dl-create-glass dl-create-no-ring" />
  <UploadIcon /> Upload
</button>
```

The recipe needs relative colour syntax: Chrome 119, Safari 16.4 or Firefox 128.

## The wordmark

```tsx
import { Wordmark } from "@dalin/kit/components";

<Wordmark app="mail" size={32} />
```

That is "dalin" in Georgia, the period in the app's accent and the app's name in muted italic, as each sidebar drew it by hand. A screen reader hears one image, named "dalin. mail". It sets no height, padding or margin, so the sidebar's header and the phone's title row place it. `wordmark.css` styles it.

| Prop | Default | What it does |
| --- | --- | --- |
| `app` | required | `"mail"`, `"calendar"`, `"notes"` or `"drive"`. |
| `size` | the font size around it | A number of px, or a CSS length. The sidebar and the phone's home title use 32. |
| `accent` | the host app's `--dl-accent` | The period's colour. `"own"` is the named app's accent, whatever app draws it. Any other value is used as the colour. |
| `folded` | `false` | Shows "d." alone, for a folded sidebar. |
| `rollOut` | `false` | Rolls "alin" and the name out from behind "d." on mount: mail's sidebar animation, 1.1s and then 0.95s. |
| `className`, `style` | none | The app's own, beside `dl-wordmark`. |

Give the wordmark a `key` that changes to play the roll again, as an app does each time its sidebar unfolds. Nothing rolls under reduced motion. That is the app's own switch where the `<Toaster>` was told of it (see "One place for the motion switch"), and the system's setting otherwise, so an app no longer turns `rollOut` off by hand.

`DALIN_APPS` is the four apps in order, each with its name, its accent and its address. `dalinApp(id)` is one of them.

## The family switcher

```tsx
import { FamilySwitcher } from "@dalin/kit/components";

<FamilySwitcher app="mail" size={32} folded={folded} />
```

It goes where the sidebar's `<Wordmark>` was. Nothing shows at rest. Pointing at the wordmark for 150ms, or pressing it, opens the frosted menu to the right of the wordmark, from its top, with an arrow. That is the owner's pick on 2026-11-22: the menu stands over the top of the next column and never under the wordmark, where it covered mail's Compose and notes' search. With no room on the right it flips to the left, and it never drops to the other axis. The menu lists the four apps as their own wordmarks, each period in that app's accent, with a check on the app you are in.

Every row is a link: `https://mail.dalin.pro`, `https://calendar.dalin.pro`, `https://notes.dalin.pro` and `https://drive.dalin.pro`. A middle click or a long press does what it does on any link.

The wordmark is a button, so a keyboard reaches it. Enter or Space opens the menu, the arrows move through it, Enter follows a row, and Escape closes it and gives focus back. The menu is not modal: one that a resting pointer opened must not lock the page's scroll.

A menu the resting pointer opened is shown and not yet in use. It takes no focus, so the app's single-key shortcuts keep working under it, and Escape closes it with focus left where it was. In 0.3 it took focus as it opened, and a key pressed with the pointer resting on the wordmark went to the menu. It is in use once the pointer moves into it or the wordmark is pressed, and then it has the keys as any menu does.

| Prop | Default | What it does |
| --- | --- | --- |
| `app` | required | The app this is drawn in. Its wordmark is the trigger and its row is the checked one. |
| `size`, `folded`, `rollOut` | as `<Wordmark>` | Passed to the trigger's wordmark. |
| `label` | `"Switch app"` | What the control does. Its accessible name reads "dalin. mail. Switch app". |
| `hrefs` | none | Another address for an app, for a build that is not on dalin.pro: `{ mail: "http://localhost:3000" }`. |
| `side`, `align` | `"right"`, `"start"` | Where the menu opens against the wordmark. The phone's header passes `"bottom"`, since a phone has no column beside its title. |
| `className` | none | The app's own class on the trigger, beside `dl-switcher-trigger`. |

It needs `wordmark.css` and `menu.css`.

## Menus, context menus and popovers

These are shadcn's Base UI files (`dropdown-menu`, `context-menu`, `popover`), restyled once and shared. The parts and their props are Base UI's. An app that has those files swaps the import and deletes its copy; `menu.css` replaces the utility classes.

```tsx
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuShortcut, MenuTrigger } from "@dalin/kit/components";

<Menu>
  <MenuTrigger>More</MenuTrigger>
  <MenuContent>
    <MenuItem onClick={reply}><ReplyIcon /> Reply</MenuItem>
    <MenuItem onClick={star}><StarIcon /> Star <MenuShortcut keys={["S"]} /></MenuItem>
    <MenuSeparator />
    <MenuItem variant="destructive" onClick={archive}>
      <ArchiveIcon /> Archive <MenuShortcut keys={["E"]} />
    </MenuItem>
  </MenuContent>
</Menu>
```

A context menu is the same menu opened at the pointer, and it takes the same rows:

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@dalin/kit/components";

<ContextMenu>
  <ContextMenuTrigger render={<li className="row" />}>...</ContextMenuTrigger>
  <ContextMenuContent>
    <MenuItem onClick={reply}><ReplyIcon /> Reply</MenuItem>
  </ContextMenuContent>
</ContextMenu>
```

A context menu is not modal, from 0.4. Base UI's context menu always is: it lays a layer over the page, so a second right click or a click on another row only closed the menu, and the page could not scroll under it. Base UI takes no `modal` prop for it. So the kit's `<ContextMenu>` is Base UI's Menu opened at the point of the click, with the same parts, keys and submenus. A right click on another row opens that row's menu, the page scrolls, and Escape gives focus back to whatever had it. `<ContextMenu modal>` is Base UI's own, as in 0.3. `<Menu>` is unchanged and stays modal unless told otherwise.

Focus goes back to the trigger as a menu closes, which is Base UI's rule. A menu the app opens itself, anchored to a control of its own through `anchor`, has a trigger nothing draws: Base UI needs one to place a submenu, so drive passes a hidden `<span>`. Focus sent there was lost. Where the trigger doesn't show, the kit now gives focus back to whatever had it before the menu opened, such as the kebab that was pressed. A `finalFocus` the app passes wins.

The context menu's trigger still renders a `<div>`, or the element passed as `render`, and carries `data-popup-open` while its menu is open. Nothing else is added to the app's markup: the menu's hidden anchor and its focus guards are drawn in `<body>`.

| Component | What it is |
| --- | --- |
| `Menu`, `MenuTrigger`, `MenuContent` | The root, the control and the frosted surface. |
| `MenuItem`, `MenuLinkItem` | A row, and a row that is a link. |
| `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem` | Rows that hold a choice. The chosen one ends in a check. |
| `MenuGroup`, `MenuLabel`, `MenuSeparator` | A group, its heading, and a rule between groups. |
| `MenuShortcut` | A row's shortcut, as keycaps at its right end. The caps are hidden from a screen reader and the row carries the shortcut as `aria-keyshortcuts`. |
| `MenuSub`, `MenuSubTrigger`, `MenuSubContent` | A submenu. Its row ends in a chevron. |
| `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent` | The menu at the pointer, on a right click or a long press. Not modal. |
| `Popover`, `PopoverTrigger`, `PopoverContent` | The same surface for anything else, 12px in. The width is the app's. |
| `PopoverTitle`, `PopoverDescription`, `PopoverClose` | A popover's heading, its muted line, and a control that closes it. |
| `Kbd` | A keycap: drive's and notes', one cap to a key. |

The kit adds these props to Base UI's own:

| Prop | On | What it does |
| --- | --- | --- |
| `arrow` | `MenuContent`, `PopoverContent` | Whether the surface points at its control. On by default. |
| `modal` | `ContextMenu` | `true` is Base UI's own modal context menu. Off by default. |
| `finalFocus` | The two menu content parts | Base UI's own: where focus goes as the menu closes. The kit supplies a default, below. |
| `variant` | `MenuItem`, `MenuLinkItem` | `"destructive"` is the red row. |
| `inset` | `MenuItem`, `MenuLinkItem`, `MenuLabel`, `MenuSubTrigger` | Lines the words up with rows that have an icon. |
| `keys` | `MenuShortcut`, `Kbd` | The keys, one cap each: `["Ctrl", "K"]`. A single cap may be the child instead. |
| `align`, `alignOffset`, `side`, `sideOffset`, `anchor`, `collisionPadding` | The three content parts | Passed to Base UI's positioner. The context menu takes no `anchor`. |
| `collisionAvoidance` | `MenuContent` | Base UI's own: where the menu may go when its side has no room. |

What the look comes to, from `menu.css`:

- The surface is the overlay glass with 10px corners. Rows are 32px tall and sit 4px in, with a 7px corner.
- A menu or popover anchored to a control has an arrow: drive's, a square turned 45 degrees and lined on its outer edges. A context menu has none, and neither has a submenu.
- A shortcut is a keycap at the row's right end. Keycaps are hidden on a touch screen. They are a picture, so a screen reader hears the row's own name and then the shortcut: `<MenuShortcut keys={["Ctrl", "K"]} />` writes `aria-keyshortcuts="Control+K"` on its row. Pass `aria-keyshortcuts` to say one the caps don't spell.
- A destructive row is red, words and icon.
- A group's label is small and muted, in the case it was written in. Write it in sentence case. Base UI needs `MenuLabel` inside a `MenuGroup`.
- A menu fades in over 150ms and out over 110ms. It lands at once when the keyboard opened it, and under reduced motion, which is the app's own switch where it has one. A context menu always opens at once.

`--dl-overlay-z` is the z-index of every menu and popover. It is 70, over the toaster while that stands over a sheet. The settings dialog is not one of these surfaces and stays solid.

## The empty state

```tsx
import { EmptyState } from "@dalin/kit/components";

<EmptyState icon={<DriveIcon />} title="Nothing here yet" />
```

A 40px icon over a 16px title in weight 600, centred in its pane. These are drive's values from 2026-11-17, which the owner picked for all four apps on 2026-11-22: "just get rid of the subtitles, but leave the large text and icon".

| Prop | Default | What it does |
| --- | --- | --- |
| `title` | required | One line that says what is empty. |
| `icon` | none | The place's icon, from the app's own set. Drawn at 40px in the faint grey. |
| `action` | none | One control under the title, for a place whose empty state is where you fill it. |
| `className` | none | The app's own, beside `dl-empty`. |

It has no subtitle prop, on purpose. In a flex pane it grows into the free space, and in a block pane with a height it takes that height. `empty.css` styles it.

## The command palette

```tsx
import { CommandPalette } from "@dalin/kit/components";

<CommandPalette
  appKey="/"
  placeholder="Search pages and to-dos"
  sources={sources}
  actions={[{ id: "new", title: "New page", keys: ["N"], onSelect: newPage }]}
/>
```

One palette for the four apps: a Base UI Dialog holding an inline Autocomplete, 600px wide and frosted, with the app dimmed behind it. It starts from calendar's palette and takes mail's search palette look. Mount it once at the app's root. It needs `palette.css` and `menu.css`.

Ctrl K opens and closes it (Cmd K on a Mac). The app's own key opens it too, when pressed outside a text field. The caret is in the field as it opens. The arrows move the focus, which always rests on a row, Enter runs that row, and Escape or a press outside closes the palette.

Results come in groups under sentence-case headings, and the words of the query are marked in each row's title and second line. The focused row shows an Enter keycap in the slot its own shortcut sits in. That slot is on every row, so nothing in a row moves as the focus does.

A row may name its `verb`, for a row that Enter does not open: drive's "Reveal" for a file shown in its folder. The word sits before the Enter cap on the focused row, small and muted. The hint a screen reader hears on the field says it too: "Press Enter to reveal the highlighted result", where it says "open" for a row that names none. A row with a verb holds the word's width open at its right end, focused or not.

The palette is modal, so Tab stays in it, with one exception. A toast that can take Tab joins the loop: Tab in the field goes to the toast's action and Tab there comes back. A press on a toast leaves the palette open.

Per the curator's motion rule, opening it from the keyboard does not animate, and neither does closing it after a key. Opened by a press on a search button, it fades in over 150ms.

| Prop | Default | What it does |
| --- | --- | --- |
| `sources` | none | What the palette searches, in the order the groups show. Keep the array stable between renders. |
| `actions` | none | The app's actions. The palette filters them itself and lists them last. |
| `actionsHeading` | `"Actions"` | The heading over the actions. |
| `open`, `onOpenChange` | the palette owns it | For an app that owns the open state, such as one with a search button. |
| `hotkey` | `true` | Whether Ctrl K opens and closes it. An editor that uses Ctrl K for links turns it off there. |
| `appKey` | none | The app's own key for search, or several: `"/"`. |
| `placeholder` | `"Search"` | The field's placeholder, which is also its accessible name. |
| `label` | `"Command palette"` | The dialog's accessible name. |
| `emptyText` | `No results for “query”.` | A function of the query, for the app's own words. |
| `className` | none | The app's own, beside `dl-palette`. |

A source is `{ id, heading, search }`. `search(query, signal)` returns rows, or a promise of them, and the signal aborts when the query changes or the palette closes. It is called with `""` as the palette opens, for whatever the app shows before a word is typed.

The list on screen always answers one query. Sources that answer at once are in the first frame. Where one answers later, the last list stays as it was until every source has answered the query in the field, and then the whole list changes together, the actions with it. Until then the old list is stale (`data-stale` on the list): its rows run nothing, the arrows move nothing, and it dims if the answer takes longer than 120ms. Enter is held and runs the first row of the answer when it arrives. Typing again lets the held Enter go.

A source slower than 400ms (`SOURCE_WAIT_MS`) no longer holds the list back. The rest is shown, and the slow source's group joins at the end, under the actions, when it answers. No row already on screen moves, so the highlight stays on the row it was on. Answer at once where the rows are in memory, and the groups keep the order the sources were given.

A row, whether a result or an action, is a `PaletteItem`:

| Field | What it is |
| --- | --- |
| `id`, `title` | Required. The id is unique within its group. |
| `subtitle` | A muted second line: where the result lives, or the line that matched. |
| `icon` | From the app's own set, drawn at 16px. |
| `meta` | What ends the first line at the right: a date, a count. |
| `verb` | What Enter does to the row, in one word, where "open" is not it: "Reveal". |
| `keys` | An action's own shortcut, as keycaps. |
| `keywords` | More words the action filter may match, beside the title. |
| `done` | Draws the title struck through and muted. |
| `keepOpen` | Leaves the palette open after the row runs. |
| `onSelect` | Required. The palette has closed by the time it runs, unless `keepOpen`. |

The action filter needs every word of the query, in any order, in the title or the keywords, and ignores case and accents. `matchesQuery`, `matchParts`, `queryTerms` and `fold` are that rule, exported for a source that wants to match and mark the same way.

`--dl-palette-z` is the dim's z-index (90, over the menus), and `--dl-palette-dim` is its fill.

## The phone header and search

```tsx
import { PhoneHeader, PhoneHeaderIcon, PhoneSearch } from "@dalin/kit/components";

<PhoneHeader title="Inbox" line="All mailboxes · 44 unread" onSearch={() => setSearching(true)} />

<PhoneHeader
  wordmark="notes"
  onSearch={() => setSearching(true)}
  action={<PhoneHeaderIcon label="Refresh" onClick={refresh}><RefreshIcon /></PhoneHeaderIcon>}
/>
```

One phone layout for the four apps, on mail's numbers. The header is a 48px title row, 6px under the safe area and 16px in. Its title is a large one (28px, weight 700) or the app's wordmark at 32px, which drive's Home and notes' main list use. Under a large title sits one muted line.

At the right are at most two plain icons, each a 20px glyph in a 44px target with no box behind it. Search is one of them and never a field, the owner's pick on 2026-11-22. Alone it takes the far right. Beside an icon the row already has, it sits to that icon's left, so the existing icon stays where it was.

| Prop | Default | What it does |
| --- | --- | --- |
| `title` | none | A large title. A string, or the app's own node for a title that does something, such as mail's folder button. |
| `wordmark` | none | The app's wordmark in place of a title. |
| `switcher` | `false` | Makes that wordmark the family switcher. Its menu opens under the title. |
| `line` | none | One muted line under a large title. A wordmark takes none, since it reads as a tagline there. |
| `onSearch` | none | Opens the app's search. With it, the header draws the magnifying glass. |
| `searchLabel` | `"Search"` | The search icon's accessible name. |
| `action` | none | The one other icon, a `<PhoneHeaderIcon>`. It keeps the far right. |
| `className` | none | The app's own, beside `dl-phone-head`. |

`<PhoneHeaderIcon label>` is a button that takes its glyph as a child. `label` is required, since a glyph has no words.

Search is a sheet over the whole screen:

```tsx
<PhoneSearch
  open={searching}
  onOpenChange={setSearching}
  placeholder="Search mail and people"
  action={{ label: "Compose", icon: <PenIcon />, onSelect: compose }}
  sections={[{ heading: "Recent", rows: recent }, { heading: "People", rows: people }]}
  results={results}
  onQueryChange={search}
/>
```

It opens with the caret already in the field: the field focuses as it mounts, before any timer or frame, which is what lets a phone raise its keyboard. Cancel sits at the field's right, and the sheet covers the bottom bar. It opens and closes at once, with no slide.

Before a word is typed it shows what calendar's search shows. First comes the app's create action, as a row in the accent. Then come the app's sections: what is recent or coming up, then people or places. Once there is a query it shows `results`, or the app's own body as children.

| Prop | Default | What it does |
| --- | --- | --- |
| `open`, `onOpenChange` | required | The app owns this. The header's search icon opens it; Cancel, Escape, a row and the system's back close it. |
| `systemBack` | `true` | Whether the sheet owns the system's back while it is open. `false` leaves history alone. |
| `placeholder` | `"Search"` | The field's placeholder, and the sheet's accessible name. |
| `cancelLabel` | `"Cancel"` | The word on the button that closes search. |
| `action` | none | `{ label, icon, onSelect }`: the row in the accent. |
| `sections` | none | Shown before any query. |
| `results` | none | Shown for a query. An empty array says nothing was found. |
| `children` | none | The app's own results for a query, in place of `results`. |
| `beforeQuery` | none | The app's own content before a query, under the sections. |
| `covered` | `false` | Hides the sheet under something the app draws over it, without closing search. |
| `emptyText` | `No results for “query”.` | A function of the query. |
| `query`, `onQueryChange` | the sheet owns the words | For an app that owns them, or wants to hear them change. |
| `onSubmit` | none | Called when the keyboard's Search key is pressed. |
| `fieldStart`, `fieldEnd` | none | The app's own pieces inside the field, such as calendar's calendar picker. |
| `className` | none | The app's own, beside `dl-phone-search`. |

The field is a plain box around the input, never a `<label>`, since a label hands every tap to its first control. A tap on a control the app put in `fieldStart` or `fieldEnd` belongs to that control. A tap anywhere else on the field puts the caret in the input.

A section is `{ heading, rows }`, or `{ heading, children }` for rows the kit has no shape for, such as calendar's agenda lines. A row is `{ id, title, subtitle, leading, meta, keepOpen, onSelect }`. `leading` is a 20px glyph or a `<PhoneSearchAvatar initials color>`, a 28px circle. `meta` ends the row at the right, small and faint: a file's size, "7 items". A section with no rows is not drawn.

`beforeQuery` is the app's own content before a word is typed, drawn under the sections. Calendar's line that says what search finds goes there, in the kit's note class:

```tsx
<PhoneSearch
  beforeQuery={<p className="dl-phone-search-note">Finds events by title, place, notes, guests or calendar.</p>}
/>
```

`covered` is for a result that opens over search, such as mail's reader. Closing search to show the reader unmounted the sheet, and the way back lost the results and their scroll. With `covered` the sheet stays open and mounted, out of sight and inert. It gives the page back while covered: no focus trap, no scroll lock, nothing hidden from a screen reader, and it is no longer a toast cover. Escape and presses belong to what covers it, and search hears none of them. Its history entry stays under the reader's. Take `covered` off and the list is where it was, with no caret put back in the field.

The sheet owns the system's back while it is open. Opening pushes one history entry over the state that was there, so a router's own markers stay on it. Android's back button or the iOS back swipe then closes search and never leaves the app. Closing by Cancel, Escape or a row takes the entry off again. An app that closes search by unmounting the sheet, as calendar does, gets the same.

A row that closes search runs once that entry has gone, a moment after the tap. Run first, a row that opens a page would push the page's entry, and the step back would take that one. An app that closes search from a row of its own and then pushes a route has the same race to mind. An app that already gives search a history entry passes `systemBack={false}`, or the two stack. Rows then run inside the tap, as in 0.3.

The sheet registers itself as a toast cover, so a toast raised while it is open is drawn over it and not under. An app's `<Toaster cover>` selector need not name it.

A toast over the sheet stays usable. A press on it leaves search open, and its action is in the sheet's tab order: Tab on the sheet's last stop goes to the toast, and Tab on the toast's last stop comes back to the field. Shift+Tab runs the same loop the other way. A toast the toaster holds out of the tab order, such as a tucked one, is skipped. The command palette does the same.

The results follow the on-screen keyboard. A phone lays its keyboard over the page without resizing it, so the sheet measures what the keyboard covers from `visualViewport` and writes it on itself as `--dl-phone-kb`. `phone.css` pads the list by that much, and the last result scrolls clear of the keys. Where the sheet has measured nothing, the list reads the app's own `--kb-inset`, the name mail, calendar and notes already use. An app that padded the results itself can delete that rule.

`phone.css` reads three variables: `--dl-phone-inset` (16px), `--dl-phone-fill` (the sheet's fill, `#151515`) and `--dl-phone-search-z` (50, over the bottom bar).

## Helpers

Three things each app had copied, and the motion reader described under "One place for the motion switch". They export from `@dalin/kit` and from `@dalin/kit/helpers`.

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

## Not in version 0.4

These are still open, so the kit has no value for them: type sizes, disabled states, shadows beyond the overlay's, and a sidebar component (the rows are tokens, and each app keeps its own markup).

These are decided and not built yet. The phone's bottom bar is glass tokens here and still each app's own component. The tooltip and the phone sheets are frosted by the tokens and stay each app's own. The family sheet on Base UI's Drawer is not started.

Five requests from the wave 1 reviews are also waiting: holding a toast until a pill is expected, a hook for the bar's measured footprint, a desktop dock for mail's compose chip, a prop that forces the toast's layout, and a per-part fade in `motion.css`.

## Working on the kit

```bash
npm install
npm run typecheck
npm test
npm run build
```

Commit `dist/` with the source change that produced it. Apps install from GitHub and never build, so a stale `dist/` ships the old code. `npm run check:dist` rebuilds and fails if the result differs from what is committed.

The component tests run the real Base UI parts in jsdom, on the pinned 1.4.1. `npm run test:base-ui-next` runs them again on 1.9.0, installed beside it as `base-ui-next`. `test/dom.tsx` mounts a tree and sends it clicks and keys, and `withToast()` there puts a toaster on the page as Sonner draws one. `test/color.ts` is the colour math behind every contrast claim. `test/layers.test.ts` pins which sheets sit in the `dalin` layer, and `src/helpers/exports.test.ts` walks the imports of each entry, so the root can't start loading Base UI again unnoticed.

The toast tests run the real `<Toaster>` in jsdom. jsdom has no cascade to trust for `:where()` and `:has()`, so a test that needs to know which of two rules wins weighs their selectors with `test/css.ts`. A test about the docked phone stack that mounts no bar calls `withPill()` from `test/pill.ts`, since the toaster docks only beside a pill.

The dev dependency is pinned to sonner 2.0.7, the version the apps ship. 2.0.8 is installed beside it as `sonner-next`, and `default-kind-next.test.ts` runs the default kind's suite on it. `toaster.test.ts` pins one rule that is easy to break: the toaster re-sends sonner a `pointerup` to clear a stuck flag, and that event must never go out while a pointer is down, or it ends any drag in progress.
