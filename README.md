# @dalin/kit

The parts the four dalin apps share: mail, calendar, notes and drive. Each app hand-built its own sidebar, toasts, menus and tokens, and they drifted. The kit holds what the owner has decided is the same everywhere, so a decision is made once and every app reads it.

Version 0.13 holds the tokens, the page's selection colours, the toast, the create button, the wordmark with its family switcher, frosted menus and popovers, an empty state, the command palette and the parts it is built from, the phone header with its search, the segmented control, the filter, the sheet, and the helpers each app had copied. A question that is still open has nothing here. What an app changes to take 0.13 is listed under "Moving an app from 0.12 to 0.13", "Moving an app from 0.11 to 0.12", "Moving an app from 0.10.6 to 0.11", "Moving an app from 0.10.5 to 0.10.6", "Moving an app from 0.10.4 to 0.10.5", "Moving an app from 0.10.3 to 0.10.4", "Moving an app from 0.10.2 to 0.10.3", "Moving an app from 0.10.1 to 0.10.2", "Moving an app from 0.10 to 0.10.1" and "Moving an app from 0.9 to 0.10", and the steps before it under the sections after that.

## Install

```bash
npm install github:gomezsj12/dalin-kit
```

It imports as `@dalin/kit`. The built `dist/` is committed, so an install needs no build step. React 19 and sonner 2 are peer dependencies. `@base-ui/react` 1.9.0 or later is an optional one: the components are built on it, and the toast and the helpers are not. The floor was 1.4.1 until 0.11, where the sheet needed Base UI's Drawer.

The package has two code entries. `@dalin/kit` is the toast and the helpers, and loads nothing of Base UI. `@dalin/kit/components` is everything built on Base UI: the wordmark and family switcher, menus, the palette, the empty state, the phone parts and the sheet. In 0.3 the root exported the components as well, so importing the toast loaded Base UI. An app moving to 0.4 changes those imports to `@dalin/kit/components`. `@dalin/kit/toast` and `@dalin/kit/helpers` are each half of the root alone.

The kit is tested on sonner 2.0.7, which the four apps lock, and on 2.0.8. The components are tested on Base UI 1.9.0, which all four apps ship.

## Adopt it in an app

Import the stylesheets once, in the root layout, after the app's own base sheet:

```tsx
import "./globals.css";
import "@dalin/kit/tokens.css";
import "@dalin/kit/base.css";
import "@dalin/kit/toast.css";
import "@dalin/kit/create.css";
import "@dalin/kit/motion.css";
import "@dalin/kit/wordmark.css";
import "@dalin/kit/menu.css";
import "@dalin/kit/empty.css";
import "@dalin/kit/palette.css";
import "@dalin/kit/phone.css";
import "@dalin/kit/seg.css";
import "@dalin/kit/filter.css";
import "@dalin/kit/sheet.css";
```

Each part has a stylesheet of its own, so an app adds one as it adopts that part. The family switcher, the command palette and the filter also need `menu.css`.

From 0.4 the component sheets (`menu`, `palette`, `phone`, `empty`, `wordmark`, `motion`, `base` from 0.6, and `seg`, `filter` and `sheet` since) put their rules in a cascade layer named `dalin`. State the layer order once, as the first line of the app's own sheet, before Tailwind is imported:

```css
@layer theme, base, dalin, components, utilities;
@import "tailwindcss";
```

That puts the kit after Tailwind's reset and before its utilities. A utility the app passes through `className` then wins over the kit's default, whatever the two selectors weigh: `<MenuContent className="min-w-64">`, `<MenuItem className="whitespace-normal">`. So does a rule in the app's own `components` layer, and so does any rule the app writes outside a layer.

An app's own class passed to a kit part can break that part's layout, so check the part after adding one: calendar's `.phone` class on a kit part did.

Without that line the `dalin` layer is defined when the kit's first sheet loads, after Tailwind's layers, and the kit's defaults beat utilities as they did in 0.3. An app's unlayered rules win either way, including one lighter than the kit's rule it used to lose to. Check an app's own rules on `.dl-*` classes when it takes 0.4.

Three sheets stay out of the layer. `tokens.css` needs none: its values sit in `:where(:root)` and weigh nothing. `toast.css` has to beat the stylesheet Sonner appends to the page, which is unlayered, and a layered rule can't. `create.css` goes on the app's own button beside the app's utilities, and holds the glass recipe and nothing an app should change, so in a layer a stray shadow or ring utility would replace the glass.

Set two variables on `:root`. The kit supplies everything else.

```css
:root {
  --dl-accent: oklch(0.64 0.16 50);
  --dl-font-face: var(--font-inter);
}
```

Before 0.6 a third line set `--dl-focus-ring: var(--dl-accent)`. The kit defines it now, so an app can delete that line or keep it.

The toast and the helpers import from `@dalin/kit`, and every component from `@dalin/kit/components`.

Then delete the app's own copy of whatever the kit now covers. Two copies of a toast rule fight, because both carry `!important`.

## Moving an app from 0.12 to 0.13

0.13 lands six details the owner picked on 2026-11-25, on live demos built for drive. He chose to put them in the kit, so all four apps change together. An app that moves its pin and changes nothing else gets two of them at once: a pick in a kit menu blinks, and the toaster can take a press. The other four wait for the app's own step below.

| Detail | What the kit gives | What each app does |
| --- | --- | --- |
| A list row's hover and selection change at once | `--dl-t-row`, 0ms | Points its row transitions at the token |
| The first tooltip waits about 800ms | `TIP_DELAY_MS` and `TIP_GROUP_MS` | Gives its tooltip provider the number |
| A picked menu row blinks off for 60ms before the menu fades | The blink, in `<MenuItem>` and `menu.css` | Nothing, unless it paints its own copy of a closing menu |
| A phone tab's glyph settles from 0.9 to 1 | `settleTab()` and `.dl-tab-settle` | Calls `settleTab` from the tap that opens a tab |
| The palette leads with what the selection can do | `selection` on `<CommandPalette>` and `<Palette>` | Passes the selection's verbs |
| A press on a progress toast calls the app | `pressToast(id, onPress)` | Gives the toast a press, where it wants one |

### Rows that change at once

`tokens.css` adds `--dl-t-row`, at 0ms: a row under the pointer, and the row the arrow keys land on, change in the same frame. Holding the down arrow used to leave a trail of half-lit rows behind it, because every row eased its fill over `--dl-t-hover`. The token is the one switch for the family, so a later pick changes one value.

Each app points the background transition of its own rows at it, wherever a list, a tree, a grid or a column view eases a row's fill:

```css
.row {
  transition: background var(--dl-t-row) var(--dl-ease);
}
```

A row drawn with Tailwind takes `duration-(--dl-t-row)` beside `transition-colors`. In drive these are `.fm-row`, `.file-row`, `.fm-tree-row`, `.fm-card` and `.fm-crow` in `drive.css`, which read `--t-fast` today. Mail, calendar and notes look for the same thing in their message, event and page lists and in their sidebars' long lists. `--dl-t-hover` stays 120ms, for a button and anything else that is not a row.

### The first tooltip's wait

The first tooltip waits about 800ms everywhere, the folded rail included. A pointer crossing a toolbar on its way to a file no longer sets off names nobody asked for. Once one is up, a neighbour opens at once, with no entrance: that is Base UI's delay group, which each app has already. The entrance itself stays as it is.

The tooltip is each app's own component, ported from notes, so the kit hands over the number from `@dalin/kit` (or `@dalin/kit/helpers`):

```tsx
import { TIP_DELAY_MS, TIP_GROUP_MS } from "@dalin/kit";

function TooltipProvider({ delay = TIP_DELAY_MS, timeout = TIP_GROUP_MS, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} timeout={timeout} {...props} />;
}
```

Then delete every number that overrides it. Mail, calendar and notes mount one provider in `src/app/layout.tsx` with `delay={150}`, and mail's refresh control passes `delay={300}`. Drive's sidebar passes `delay={150}`, and `TOOLBAR_TIP_DELAY` in `toolbar-tip.tsx` sets the toolbar's provider and its lone triggers. The wait is Base UI's timer, so there is no token for it: a stylesheet value can't reach it.

### The pick's blink

A menu row picked with the pointer blinks off once, for `--dl-t-pick` (60ms), and then the menu fades over `--dl-t-close` (110ms), as before. The action runs on the click and never waits for either: a star lands under the fading menu. Escape, a press outside and a pick from the keyboard close as they did, with no blink. Reduced motion has none either, the app's switch or the system's.

`<MenuItem>` and `<MenuLinkItem>` mark the row and every open menu `data-picked` as they are clicked, and `menu.css` does the rest. An app on the kit's menus changes nothing. A hand-built menu can call `markMenuPick(row)` on its own row, provided the row carries `dl-menu-item` inside a `.dl-menu`.

An app that paints its own copy of a closing menu has three steps. Drive is the one that does: `menuGhost` in `src/lib/exit-ghost.ts` clones the menu's positioner as it unmounts, and the copy fades.

1. Mark the copy `data-dl-menu-copy`. The clone already carries the marks, since they are set on the click, before the menu unmounts. The kit's blink then runs inside the copy, past drive's `[data-ghost] *` rule that stills a copy's children: the kit's declaration is important and layered, and an important declaration in a layer beats an unlayered one.
2. Hold the copy's own fade back by `--dl-t-pick` while it holds a picked menu: `[data-ghost]:has(.dl-menu[data-picked]) { animation-delay: var(--dl-t-pick) }`, in drive's terms.
3. Keep the copy on the page 60ms longer. Drive's `GHOST_MS` goes from 200 to 260.

### A phone tab's settle

When a phone tab is tapped, its glyph settles from 0.9 to 1 over `--dl-t-tab-settle` (140ms) on the family's curve as it fills. The tab's tint and colour keep their own transition, and the press is unchanged. The bar is still each app's own markup, so the motion is a class in `motion.css` and a helper that plays it:

```tsx
import { settleTab } from "@dalin/kit";

<button onClick={(event) => {
  if (!open) settleTab(event.currentTarget.querySelector("svg"));
  openTab();
}}>
```

Call it only for a tab that is not open already: pressing the open tab again plays nothing. `settleTab` starts the settle from its first frame on every call, takes the class off when it ends, so nothing runs at rest, and plays nothing from the keyboard or while motion is reduced. It returns whether it played. In drive the tabs are in `src/components/mobile/bottom-row.tsx`. An app that doesn't load `motion.css` yet adds it to the root layout.

### The palette's selection group

The palette can lead with what the selection can do, under a heading that names it. Drive's is the selected file's Star, Tags…, Move to…, Rename F2, Download, Share… and Archive Del. The verbs show their keys from the moment the palette opens, so the palette teaches the shortcuts too.

```tsx
<CommandPalette
  sources={sources}
  actions={actions}
  selection={file ? { heading: file.name, items: verbs } : null}
/>
```

A verb is an ordinary `PaletteItem` with its `keys`. The group comes before every source and is ranked against the words the way the actions are, so "ren" puts Rename first, and the group goes when no verb matches. The list starts on its first row, so Enter on a fresh palette runs the first verb: put the one that is safe to run there. A page a verb opens lists its own rows, and the group stays on the first page. `<Palette>` takes the same prop, which is how drive's palette passes it. A palette that passes its own `results` draws its own list and leaves the prop out. The phone's search takes no selection, since a phone has no selection outside selection mode.

### A press on a progress toast

On a computer, a click on a progress toast, or Enter or Space while it has focus, can call the app. Drive's upload toast uses it to swap "42%, 12 min left" and "42%, 16 MB/s", and each new upload starts on time left again. Sonner takes no handler for a toast's body, so the app names the toast by its id:

```tsx
import { pressToast } from "@dalin/kit";

toast.loading(line(), { id });
const stop = pressToast(id, () => {
  showSpeed = !showSpeed;
  toast.loading(line(), { id });
}, { description: "Click to switch time and speed" });
```

The toast is then a button to a screen reader, with the description said after its words, and it takes the family's press, one step darker. Its own action still belongs to the action. The press works only while the toast is the progress kind, so the result raised under the same id is a toast like any other. Call `stop()`, or `pressToast(id, null)`, once the work is done. On a phone a tap fans the stack, as it always has, and calls nothing.

## Moving an app from 0.11 to 0.12

0.12 takes the command palette apart into parts an app can build on, ranks the actions by cmdk's command-score, adds Ctrl N and Ctrl P and nested pages, and lets `<PhoneSearch>` take the palette's own `sources` and `actions`. The owner approved the plan on 2026-11-24, after a research page that compared the palette with cmdk: the palette stays on Base UI, the kit copies cmdk's ideas and not its package, and one search definition per app drives both the desktop palette and the phone search.

An app that keeps `<CommandPalette>` as it is changes its pin and nothing else. The markup, the classes and the keys it had in 0.11 are the same. The kit's own palette tests pass with one assertion changed, for the Tab hold under "What the app ports found". Two things move under it:

- The actions come in a new order once a word is typed. The rows that hold every word still come first, now ranked by cmdk's command-score where they kept the app's order, and after them come rows only the score finds, such as "New page" for "np". With an empty field the order is the app's, as before.
- Ctrl N and Ctrl P move the highlight down and up, the way the arrows do.

`PaletteItem.onSelect` is optional now, because a row that opens a page needs none. TypeScript passes every row that compiled in 0.11.

Mail and calendar can now move their own desktop palettes onto the kit's parts, `<Palette>`, `<PaletteField>`, `<PaletteList>`, `<PaletteNote>`, `<PaletteLine>` and `<PaletteBody>` (see "Building a palette from its parts" under "The command palette"). This is where each feature of those two palettes goes:

| What the app's palette does today | Where it goes |
| --- | --- |
| Opens on Ctrl K, but not inside the editor (mail) | `hotkey={false}`, the app's own listener, and `open`/`onOpenChange` |
| Opens on `/` and from the sidebar's glass | `appKey`, or `open` from the app |
| Turns finished operators into chips, removed by their X or by Backspace at the start (mail) | The chips in `start` on `<PaletteField>`, the words after them as the controlled `query`, and Backspace in `onKeyDown` |
| Keeps the scope chip in the field (mail) | `start` |
| Offers the rest of a name or a date as faint text that Tab or ArrowRight takes (mail) | `completion` |
| Shows a busy spinner in place of the glass (mail) | `glyph` |
| Ends the field with the filter (both) | `filter` |
| Draws the date hint and the "Showing results for" lines (mail) | `<PaletteLine>` |
| Lists people, companies, messages, files and commands under small headings, recents as one plain run (mail) | `results`, with a group that has no heading for the plain run |
| Draws an avatar, an age and a second line of its own (mail) | `rowContent` on `<PaletteList>` |
| Marks the words and not the chips (mail) | `marks` |
| Opens a row's menu on right-click or ArrowRight (mail) | `menu` on the row |
| Ends the list with "Show all", the Enter glyph only while highlighted (mail) | `tail`, or a group with no heading, and the Enter hint with `verb` |
| Dims rows left from the last answer to 60% and holds Enter on one until it is current (mail) | `dim: "waiting"` on those rows |
| Dims stored rows to 85% after a failed search, and offers Retry (mail) | `dim: true`, and `<PaletteNote tone="error" action>` |
| Says "Searching…", "No matches in stored mail." and "Searching Gmail for older mail…" (mail) | `<PaletteNote>` lines inside `<PaletteList>`, and `emptyText` |
| Stands at z 40 under compose (mail) | `zIndex={40}` |
| Hands focus on to Settings or compose as it closes (mail) | `finalFocus` |
| Groups Say it, Events, Calendars and Actions (calendar) | `sources` or `results`, in that order |
| Draws an event in its calendar's colour, its time at the right, a past event muted (calendar) | `icon`, `meta`, and `className` on the row |
| Shows or hides a calendar from its row (calendar) | `meta` saying Show or Hide, and `keepOpen` where it should stay |
| Shows each action's own key (calendar) | `keys` |
| Says "Showing 30 of 112" under the events (calendar) | `note` on the group or the source's answer |
| Replaces the list with the sentence's questions, which the keys answer (calendar) | `<PaletteBody status>` in the list's place, `readOnly` and `onKeyDown` on the field |
| Lets Escape close the filter, then the questions, then the palette (calendar) | The filter's own Escape comes first, then `onEscape`, then the kit |
| Says the questions' progress to a screen reader (calendar) | `status` on `<PaletteBody>` |
| Wraps the arrows from the last row to the first (calendar) | Base UI's Autocomplete, which loops by default |
| Keeps its own focus trap, outside-click listener, fade copy and z values (calendar) | Nothing: the kit's dialog does each of them |

Three features have a home and change as they move. Mail's per-row Enter waits for the highlighted row to stop waiting and then runs that row, as mail's does, but a whole list from an earlier query is the kit's stale list, which dims after 120ms and holds the arrows too. Calendar's Say it row keeps its Enter cap only while it is highlighted, which it is as the list appears. Calendar's actions pick up the score's finds, which the owner chose for every app.

`<PhoneSearch>` takes `sources`, `actions` and `actionsHeading`, the same types the palette takes. An app can hand both surfaces one search and delete the second copy it wrote for the phone. `sections`, `results` and `children` work as they did, and win over the sources, so an app can move one surface at a time. A row of either kind takes a long press: a `menu` opens the family's menu at the finger, and `onLongPress` is the app's own hold. Mail can drop the copy of the kit's row it drew to give People one. A second finger, or a finger that moves 10px, ends a hold, and the browser's own menu for a finger that moved is no hold.

### What the app ports found

Drive, calendar, mail and notes each moved onto 0.12 and kept their own code wherever the kit had no slot. This round, still 0.12.0, fixes the defects they found and adds those slots. Drive and notes, on `<CommandPalette>`, see the fixes and nothing else:

- An IME's Enter no longer runs the highlighted row, and its arrows no longer move the highlight.
- Tab is held on the press, so two quick Tabs stay in the palette. A Tab with no toast to reach is now cancelled on the press, and focus stays in the field as before.
- A list with other rows, such as the one a filter pick brings, starts on its first row.
- The dialog says `aria-modal="true"`, and the field says `aria-expanded="false"` over an empty list.
- Escape right after the filter's menu opens closes only the menu.

Each app can now delete the code it kept:

| Code an app kept | What replaces it |
| --- | --- |
| preventDefault on an IME's Enter and arrows in `onKeyDown` (mail) | Nothing: the field holds them back |
| Its own Tab hold, stepping aside for a toast (calendar) | Nothing: the palette holds Tab, and the toast keeps its place in the loop |
| Moving the highlight back to the first row after a filter pick (calendar) | Nothing |
| Making the filter menu take Escape first (calendar) | Nothing |
| Markers on a `display: contents` wrapper inside `<Palette>` (mail) | The same attributes on `<Palette>`, which puts them on the panel |
| Phone rows drawn as `sections` and `results` from the sources it built (drive) | `sources`, with `rowContent` for the names cut in the middle |
| `usePaletteResults` run a second time, and its own phone list (calendar) | `sources`, with `groupContent` for the day headings and the Past divider, and `rowContent` for the agenda rows |
| Its own typed rows on the phone (mail) | `dim` and `className` on the kit's rows |
| Its own People row and phone menu (mail) | `menu` on the row, or `onLongPress` with `held`; the menu's entries are 44px in 16px type |
| A ghost that measures `.dl-phone-search-input`, and blur and focus that find the field by that class (mail) | `completion` and `inputRef` |
| The keyboard padding copied onto its results list, and its class overrides on the body (mail) | `ownScroller`, and `var(--dl-phone-search-end)` as the list's bottom padding |

The phone draws `dim` at once, where mail's rows faded over 150ms. Mail's own transition in `className` keeps that fade.

## Moving an app from 0.10.6 to 0.11

0.11 adds the family's sheet: `<Sheet>` and its parts from `@dalin/kit/components`, styled by the new `sheet.css` (see "The sheet" below). No part that was already in the kit changed, so an app that moves no sheet changes its pin and one number.

The number is Base UI's. The sheet is built on Base UI's Drawer, so the kit now asks for `@base-ui/react` 1.9.0 or later, where it asked for 1.4.1. All four apps already ship 1.9.0.

`tokens.css` gains one step on the z ladder, `--dl-z-sheet` (55). It stands over the phone's search (50), which a sheet may open over, and under the toaster while that stands over a sheet (60).

No app has to move a sheet to take 0.11. To move one, import `@dalin/kit/sheet.css` after `tokens.css`, draw the surface with `<Sheet>` and `<SheetContent>`, and delete the app's own drag, focus trap, exit timer and sheet rules for it. Each app's sheets do things the kit's sheet has to keep doing, and this is where each one goes:

| What the app's sheet does today | Where it goes |
| --- | --- |
| Asks before it drops unsaved edits (calendar's `attemptClose`) | `details.cancel()` in `onOpenChange`, then the app closes the sheet itself |
| Leaves Escape to a field with text (calendar's `fieldOwnsEscape`) | `ownsEscape` |
| Slides away as a cloned copy (calendar's `use-sheet-exit.ts`) | Nothing: keep the `<Sheet>` mounted and change `open`, and the real panel slides |
| Holds a history entry of the app's own (drive's `useBackGuard`, mail's `useBackLayer`) | Stays the app's. Leave `systemBack` off |
| Navigates only once its entry has gone (drive's `afterBackGuards`) | `actionsRef.current.close(then)`, or `onOpenChangeComplete` |
| Is drawn into the search dialog (calendar) | `container` on `<SheetContent>` |
| Counts as an open overlay (notes' `useRegisterOverlay`) | Call it with the same `open` the sheet is given |
| Ticks as it opens or is dismissed (haptics) | `onOpenChange`, which names the reason |
| Registers as a toast dock, or is named in `<Toaster cover>` | Nothing: the sheet registers itself. Take its class out of the selector |
| Holds Tab on the press (calendar's `useTabCycle`, mail's and notes' traps) | Nothing: a modal sheet holds Tab itself and keeps the toast in its loop. Delete the app's trap for it |
| Sets `aria-modal` on its panel (calendar, mail) | Nothing: a modal sheet's panel carries `aria-modal="true"`. Take the app's own off |
| Becomes a small dialog on a computer (every Settings sheet) | `layout="dialog"`, from the app's own width check |
| Closes past a flat 96px, whatever its height (every Settings sheet) | `dismissDistance={SHEET_DISMISS_PX}` |
| Stands at a z-index of the app's own | `--dl-sheet-z`, on `:root` or for one sheet in `vars` on `<SheetContent>` |
| Is a solid panel (mail's Settings sheet) | `--dl-sheet-fill` and `--dl-sheet-blur: none` |
| Holds a swipe between files, or a PDF that pans (mail's attachment viewer) | `noSheetDrag("x")` on the swipe, `noSheetDrag()` on the PDF |
| Stops at a height of its own (mail's 88dvh) | `max-height` in the app's own class on `<SheetContent>` |

Four things change for a sheet as it moves, and the owner approved the first on 2026-11-24.

- It drags from anywhere on it once its body is scrolled to the top, where only the grab strip dragged. Calendar's pick sheets and every sheet in drive but the Settings ones did not drag at all, and now do.
- A pull upward gives by one curve in every app (see "The drag"). Calendar's gave 35% of the pull, mail's 25%, and the Settings sheets none.
- Every sheet opens and closes over `--dl-t-sheet`, 260ms. Mail's compose sheet takes 300ms today, and would take 260ms if it moves.
- On Android, Base UI takes Chrome's back gesture for an open sheet through the browser's CloseWatcher, with no history entry (`"close-watcher"`, or `"system-back"` on a sheet with `systemBack` on). Calendar's and notes' sheets have no entry of their own, and now close on it. Drive's and mail's hear that reason too, and their own guard takes its entry off as it does for any close from the screen.

The distance that closes a sheet and the flick that closes it are the ones the apps had. There are two distances today, and a Settings sheet has to name its own (see "The drag").

## Moving an app from 0.10.5 to 0.10.6

A pinned toast no longer draws the progress bar on the phone. The bar is there for a card tucked behind the pill, where only its top edge shows, and a pinned toast never tucks: it stands above the pill with its words in view. A send going out under the pin wore both the spinner and the sweep. An app on 0.10.5 changes only its pin.

## Moving an app from 0.10.4 to 0.10.5

0.10.5 keeps the focus return of 0.10.4 and drops its one risk. 0.10.4 sent focus to the field through a function in `finalFocus`, and Base UI skips its own check for a function there: focus came back to the field even when a dialog the pick opened had taken it. Now Base UI returns focus to the glyph as it always did, only when nothing else has taken it, and the glyph passes it on to the field while the menu is closing. An app on 0.10.4 changes only its pin.

## Moving an app from 0.10.3 to 0.10.4

0.10.4 sends focus back to the field after a pick. Base UI returned it to the glyph, so the next word typed went nowhere until the field was pressed. `<FilterMenu>` now gives focus back to whatever had it as the menu opened, the field the control ends, and to the glyph when the keyboard opened the menu. An app that passes `finalFocus` keeps its own. An app that sent the caret back itself, as calendar's palette does, can drop that.

`<PhoneSearch>` takes `narrowed`: while a filter in `fieldEnd` is on, the sheet shows `results` before a word is typed, so a pick with no words lists what it leaves. With no words and nothing found it says "No results." An app on 0.10.3 changes only its pin.

## Moving an app from 0.10.2 to 0.10.3

0.10.3 stands the filter's menu over the command palette. Menus stack at `--dl-overlay-z` (70) and the palette at `--dl-palette-z` (90), so a `<FilterMenu>` in the palette's `filter` slot opened under it. Its menu and submenus now take the higher of `--dl-overlay-z` and two over the palette. An app that raised them itself, as calendar does to clear its own palette, keeps its value.

It also gives `<FilterMenu>` two knobs an app had to build the menu from the kit's parts to get. `closes` on its `choice` makes a pick close the menu, for a choice that is the whole errand (notes' "Show"); without it a radio row keeps the menu open, Base UI's rule, which suits mail's "Search in". `finalFocus` is `<MenuContent>`'s own prop passed through, for an app that decides where focus goes as the menu closes. An app on 0.10.2 changes only its pin.

## Moving an app from 0.10.1 to 0.10.2

0.10.2 gives `<FilterMenu>` a `menuClassName`, the app's own class on its menu, so mail's 44px phone rows no longer need a selector on `.dl-filter-menu`. The phone's back row now calls `onFacetOpen(null)`, as closing the menu does, so the app stops counting a list nobody is looking at. An app on 0.10.1 changes only its pin.

## Moving an app from 0.10 to 0.10.1

0.10.1 gives the command palette a `filter` slot, a control at the end of its field (see "The command palette" below). An app with no filter in its palette changes only its pin.

A filter in the palette keeps its choices as the app's own state, and the app builds `sources` from them with a `useMemo` on those choices. A new `sources` asks every source again for the words already in the field, so a pick narrows the list at once and the words stay where they were. Clear the filters in `onOpenChange` when the palette closes, so the next opening starts from everything, as its field does.

## Moving an app from 0.9 to 0.10

0.10 adds the family's filter: `<FilterGlyph>` and `<FilterMenu>` from `@dalin/kit/components`, styled by the new `filter.css` (see "The filter" below). Nothing else changed, so an app with no filter changes only its pin.

To adopt it, import `@dalin/kit/filter.css` after `menu.css`. Replace the app's own filter glyph with `<FilterGlyph>` (notes' lucide funnel, mail's and calendar's two sliders), and a filter that opens a menu with `<FilterMenu>`. Delete the hover box behind the app's old trigger. A filter that is on now shows as a dot in a colour that means something (a mailbox's colour, Archive's red), in every app.

## Moving an app from 0.8.1 to 0.9

0.9 makes the segmented control's lift slide. Import `slideSegLift` from `@dalin/kit` and pass it as the ref of every `.dl-seg` group. A group without it still works and jumps as before. The track now sets `position: relative`, so an app rule that positions the track itself can go.

## Moving an app from 0.8 to 0.8.1

0.8.1 gives the segmented control the look of the Share switch in notes (see "The segmented control" below). An app on 0.8 changes only its pin.

## Moving an app from 0.7 to 0.8

0.8 adds `seg.css`, the segmented control (see "The segmented control" below). Nothing else changed, so an app that doesn't draw one can skip it.

To adopt it, import `@dalin/kit/seg.css` after `tokens.css`, then add `dl-seg` beside the app's own class on the group and `dl-seg-option` beside the app's own class on each button. Delete the app's rules for the track's edge and fill and for the segment's colours, hover, press, ring and transition. Keep the app's font size and any layout rules, such as a row that wraps the control under its label in a narrow window.

## Moving an app from 0.6 to 0.7

0.7 puts the owner's picks of 2026-11-23 for pressed, disabled and busy controls into the kit, and gives a phone held on its side the phone layout. Four tokens are new in `tokens.css`:

| Token | Value | What reads it |
|---|---|---|
| `--dl-press-dim` | 0.92 | A desktop press: the hover look plus `filter: brightness(var(--dl-press-dim))` |
| `--dl-press-scale` | 0.97 | A phone press shrinks the control to this |
| `--dl-press-bright` | 1.12 | A phone press brightens it by this |
| `--dl-disabled-opacity` | 0.45 | A disabled or busy control |

The kit's own parts draw these looks as soon as an app installs 0.7. On the desktop a pressed create button, menu row, palette row or toast action keeps its hover look and goes one step darker. On the phone the header's icons, Cancel, the search rows and the pill's action shrink to 0.97 and brighten. Under reduced motion they only brighten. The kit writes the shrink as `scale`, not `transform`, so a transform the app puts on the same control still holds. No box or fill appears behind a pressed icon.

The create button takes the phone's press only inside an element with the class `dl-phone`. Put that class on the app's phone layout (its shell, or `<html>` while the phone layout is on). Outside it, the button takes the desktop's press.

A disabled control (`disabled` or `aria-disabled="true"`) is 45% opaque, keeps the normal cursor, and shows no hover or press. That holds for the create button, menu and palette rows, the phone's icons, Cancel and search rows, and the toast's action. Menu rows were 0.5 before and read the token now. A busy create button carries `aria-busy="true"` and its verb ("Creating"), and looks the same. It isn't disabled, so it keeps keyboard focus.

### A phone on its side

`usePhoneLayout()`, the `<Toaster>` and `<ToastBand>` also answer phone for `(pointer: coarse) and (max-height: 500px)`, whatever the width. The query is exported as `PHONE_SIDEWAYS_QUERY`, and `phoneLayoutQuery()` returns the whole query in force, the width and the sideways part joined by a comma. The width where the phone layout begins doesn't move.

An app's own phone check joins the same query to its own width, in script and in CSS:

```ts
import { PHONE_SIDEWAYS_QUERY } from "@dalin/kit";

const phone = window.matchMedia(`(max-width: 899px), ${PHONE_SIDEWAYS_QUERY}`);
```

```css
@media (max-width: 767px), (pointer: coarse) and (max-height: 500px) {
  /* the phone layout */
}
```

CSS can't read the constant, so the stylesheet repeats the string.

## Moving an app from 0.5 to 0.6

0.6 comes from a pass over how the four apps behave. Five changes reach an app as soon as it installs 0.6. The first two need a look in the app.

- A desktop toast's title is one line. A long one ends in an ellipsis, where it used to wrap to four lines and grow the card by 58.5px. The full words stay in the page for a screen reader, and the `<Toaster>` gives a cut title a `title` attribute with the whole text, so the pointer can read it. A title that fits gets none. Write each message to fit. Notes' `toastLine` already shortened the name, and still does.
- `<ContextMenu>` stays open when the pointer leaves it. Before 0.6 it closed as soon as the pointer moved off its edge, with the reason `trigger-hover`, because Base UI doesn't count a right click as a click. It now closes on a click outside, Escape or a row, like the family's other menus.
- `color-scheme: dark` on `:root`. The family is dark only, so scrollbars, date pickers and autofill draw dark in every app. Mail, calendar and drive drew them light before. Notes can delete its own line.
- The command palette levels what is behind its glass with `--dl-overlay-level`, as the menus do, so its muted words hold over a white page. Over the family's dark panes nothing changes.
- The palette's Esc keycap and the toast's action button get the keyboard ring, the two kit buttons that had none. The action's ring sits inside its segment, which runs to the card's edge.

The rest is new tokens in `tokens.css`, there to adopt:

- `--dl-selection-bg` (the accent) and `--dl-selection-fg` (its ink), read by the one `::selection` rule in the new `base.css`. Notes and drive already draw selection this way. Mail and calendar import `base.css` and delete their own rule. `--dl-accent-fg` is that ink, `oklch(0.16 0 0)`, notes' and drive's own. On mail's violet it reads 4.56:1, the lowest of the four accents.
- `--dl-focus-ring` (the accent), `--dl-focus-w` (2px) and `--dl-focus-offset` (2px), the values all four apps drew. Every ring the kit draws reads them.
- The z ladder, at the numbers in use today: `--dl-z-bar` 30, `--dl-z-search` 50, `--dl-z-toast` 60, `--dl-z-overlay` 70, `--dl-z-dialog` 80, `--dl-z-palette` 90 and `--dl-z-tooltip` 95. The kit's sheets read it under their own variables, so an app's `--dl-overlay-z` or `--dl-bar-z` still wins. The dialog step is calendar's and notes' settings scrim at 80, with the panel one over it at 81. The tooltip step is notes' 95. Mail draws its tooltip at 100, calendar at 1000 and drive at 50, and none of them reads the ladder yet.
- `--dl-t-base`, 180ms, the value calendar, notes and drive each wrote as their own `--t-base`.
- `--dl-font-mono`, the system's monospace. `menu.css` read it before any sheet defined it.

## Moving an app from 0.4 to 0.5

0.5 comes from a polish pass over the four apps. Two things need a look in the app.

- `<FamilySwitcher>` opens just past the sidebar's right edge, the closest `<aside>` or `[data-sidebar]` around the wordmark, so its menu lands at x 250 beside a 240px sidebar in every app. A sidebar that is neither passes `boundary`.
- `<MenuLinkItem>` closes its menu on a click. A link row that should leave its menu open passes `closeOnClick={false}`.

The rest needs nothing from the app, or is there to adopt:

- `--dl-scrim` (black at 62%) dims the page under a sheet or a dialog. The command palette's dim reads it.
- `--dl-sheet-handle`, `--dl-sheet-handle-w` and `--dl-sheet-handle-h` draw a phone sheet's grab handle: a 40 by 4 pill of white at 22%.
- `--dl-sidebar-w` is the desktop sidebar's default width, 240px.
- `--dl-accent-text` raises the accent to a lightness of at least 0.80, up from 0.78, so mail's violet clears 4.5:1 on its tint over `#2f2f2f`.

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

`tokens.css` defines custom properties and one more line, `color-scheme: dark`. Every value sits in `:where(:root)`, so the order it loads in never matters.

| Token | Value | Use |
| --- | --- | --- |
| `--dl-font` | Inter, then system and emoji fallbacks | Every app's text |
| `--dl-font-wordmark` | Georgia | The `dalin.` wordmark |
| `--dl-font-mono` | the system's monospace | A keycap's symbols, and any code an app shows |
| `--dl-sidebar` | `#151515` | The desktop sidebar |
| `--dl-list` | `#181818` | A second pane: mail's list, drive's file list |
| `--dl-content` | `#1c1c1c` | The reader, the page, calendar's grid, drive's inspector |
| `--dl-raised` | `#242424` | A card or a field standing on a pane |
| `--dl-selected` | `#262626` | The selected lift: the open row, the picked item |
| `--dl-hover-sidebar`, `--dl-hover-list`, `--dl-hover-content` | `#232323`, `#202020`, `#242424` | A row under the pointer, by the pane it sits on |
| `--dl-row-h`, `--dl-row-text` | 32px, 14px | A top navigation row in the sidebar |
| `--dl-row-dense-h`, `--dl-row-dense-text` | 28px, 13px | A row in a long list under it |
| `--dl-row-icon` | 17px | A sidebar row's icon |
| `--dl-row-selected`, `--dl-row-selected-icon` | `--dl-selected`, `--dl-fg` | The open plain row, and its filled icon |
| `--dl-sidebar-w` | 240px | The desktop sidebar's default width. The family switcher's menu opens just past it |
| `--dl-bar-glass`, `--dl-bar-blur`, `--dl-bar-rim` | a grey at 45%, `blur(14px)`, white at 9% | The phone's bottom bar |
| `--dl-border`, `--dl-border-strong` | `#2f2f2f`, `#3d3d3d` | A rule between blocks; the edge of a floating surface |
| `--dl-overlay`, `--dl-overlay-blur` | `#202020` at 72%, `blur(16px) saturate(1.5)` | The overlay glass |
| `--dl-overlay-level` | `contrast(0.709) brightness(0.468)` | Levels what is behind the glass |
| `--dl-overlay-edge`, `--dl-overlay-shadow` | `--dl-border-strong`, one shadow | The glass's edge and its shadow |
| `--dl-overlay-hover`, `--dl-overlay-rule` | white at 8%, white at 9% | A highlighted row on the glass; a rule inside a menu |
| `--dl-overlay-solid` | `#1f1f1f` | The grey the frost reads as: an arrow, and the fill with transparency off |
| `--dl-dialog` | `#1f1f1f` | The settings dialog, which stays solid |
| `--dl-scrim` | black at 62% | What dims the page under a phone sheet, a dialog or the command palette |
| `--dl-sheet-handle` | white at 22% | A phone sheet's grab handle |
| `--dl-sheet-handle-w`, `--dl-sheet-handle-h` | 40px, 4px | The handle's size. Round it with half its height |
| `--dl-danger` | `oklch(0.68 0.19 25)` | A destructive act, as a fill or a ring |
| `--dl-danger-text` | `--dl-danger` at a lightness of at least 0.74 | The same red as text |
| `--dl-kbd-face`, `--dl-kbd-edge` | `#383838`, `#5c5c5c` | The keycap |
| `--dl-fg` | `#ffffff` | Text |
| `--dl-fg-muted` | `#b8b8b8` | Secondary text |
| `--dl-fg-faint` | `#8f97a0` | The dimmest text, 4.53:1 on `#2f2f2f` |
| `--dl-accent-text` | `--dl-accent` at a lightness of at least 0.80 | The accent as small text |
| `--dl-accent-fg` | `oklch(0.16 0 0)` | Ink on an accent fill |
| `--dl-selection-bg`, `--dl-selection-fg` | `--dl-accent`, `--dl-accent-fg` | Selected text (`base.css`) |
| `--dl-focus-ring`, `--dl-focus-w`, `--dl-focus-offset` | `--dl-accent`, 2px, 2px | The keyboard ring |
| `--dl-press-dim`, `--dl-press-scale`, `--dl-press-bright` | 0.92, 0.97, 1.12 | A press: darker on the desktop, smaller and brighter on the phone |
| `--dl-disabled-opacity` | 0.45 | A disabled or busy control |
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
| `--dl-t-base` | 180ms | A change that is not an open or a close |
| `--dl-t-row` | 0ms | A list row's hover and selection: at once, from 0.13 |
| `--dl-t-pick` | 60ms | A picked menu row's blink, before the menu fades |
| `--dl-t-tab-settle` | 140ms | A phone tab's glyph settling as the tab opens |
| `--dl-meaning-archive` | `oklch(0.68 0.19 25)` | Archive, red |
| `--dl-meaning-starred` | `oklch(0.75 0.15 80)` | Starred, amber |
| `--dl-meaning-spam` | `oklch(0.72 0.17 50)` | Spam, orange |
| `--dl-z-bar`, `--dl-z-search`, `--dl-z-toast` | 30, 50, 60 | The phone bar, the phone search, the toaster over a sheet |
| `--dl-z-sheet` | 55 | The family's sheet: its scrim, and the panel drawn after it at the same number. One more for each sheet over it. Over the phone search, under the toaster |
| `--dl-z-overlay`, `--dl-z-dialog` | 70, 80 | Menus and popovers; a dialog's scrim, its panel one over |
| `--dl-z-palette`, `--dl-z-tooltip` | 90, 95 | The command palette's dim, its panel one over; a tooltip |

`--dl-accent-text` is new in 0.1. The accent is a fill colour: as 14px text on a 14% tint of itself it reads 3.5 to 4.4:1 in mail, calendar and drive. The token raises its lightness to at least 0.80 and keeps its hue and chroma, which clears 4.5:1 on that tint over the panes (`#151515` to `#1c1c1c`) and over `#2f2f2f`. The floor was 0.78 until 0.5, where mail's violet read 4.46:1 on its tint over `#2f2f2f`. At 0.80 the four accents read 4.77:1 (mail), 5.48:1 (calendar), 6.13:1 (notes) and 5.95:1 (drive) there, each with its channels clipped, the weaker of the two ways a browser may draw it. Read it for text and keep `--dl-accent` for fills, rings and tints. It needs relative colour syntax.

One rule has no token. Nothing animates when the action started from the keyboard, and `watchInputModality` (below) keeps the attribute a stylesheet reads for that. The kit's own menus, popovers and palette follow it already, and from 0.4 they follow the app's own motion switch too.

Don't override a token. If a screen needs a different value, ask the owner, and the answer goes in this file.

### Surfaces, by position

The owner picked this on 2026-11-22. A pane takes its fill from where it stands, left to right, and never from what it holds: the sidebar, then a second pane, then the content. So drive's file list is the list step under an inspector on the content step, and mail's list is one step up from its sidebar.

A row under the pointer lightens about halfway from its own pane to the selected lift. It shows on every pane that way and never matches the selected lift, which is one grey everywhere. A row in the sidebar reads `--dl-hover-sidebar`, a row in a list `--dl-hover-list`, a row on the content `--dl-hover-content`.

The sidebar's hover is `#232323`, one step brighter than halfway, because the owner found `#1e1e1e` too faint on 2026-11-23. It still sits under the `#262626` selected lift.

### Sidebar rows

Top navigation (Inbox, Home, the views) is a 32px row at 14px. A long list under it (calendars, folders, pinned pages) is a 28px row at 13px, so it shows more names and cuts fewer. Icons are 17px in both.

The open plain row wears `--dl-row-selected` with its icon filled and white. A row whose place has a meaning shows its filled icon in that meaning's colour instead, on hover and while open, the same colour in every app: `--dl-meaning-archive`, `--dl-meaning-starred`, `--dl-meaning-spam`.

These are tokens with no class behind them. Each app's sidebar keeps its own markup and reads the values.

### The phone bar's glass

`--dl-bar-glass` is calendar's bar: a grey at 45% over a 14px blur, with a rim of white at 9%. The owner picked it over the other three bars on 2026-11-22. An app points its own bar at the three tokens and deletes its own recipe. The phone toast wears the same glass by default (see "Variables an app may set").

### The overlay glass

Menus, context menus, popovers, the command palette, tooltips and phone sheets are frosted: `--dl-overlay` over `--dl-overlay-blur`, with the strong edge and one shadow. The settings dialog is the exception. It stays solid, on `--dl-dialog` with the same edge.

The kit's own overlays read these tokens, the sheet among them from 0.11. An app's tooltip is still its own, and so is a phone sheet it has not moved onto `<Sheet>`. Both read the tokens from the app's rules.

`--dl-overlay-level` is the toast's fix for bright content, applied to menus and popovers. A menu can open over a white email, where the bare glass turned pale and muted words fell to 3.2:1. The filter brings white down to a mid grey before the glass goes on, and muted words then hold 6.3:1. It leaves a dark pane where it is, so nothing changes on the family's own surfaces. Set it to `contrast(1)` to turn it off.

An app with a transparency switch points `--dl-overlay` at `--dl-overlay-solid` while the switch is off. Its own rule already stops the blur.

### The destructive red

`--dl-danger` is mail's red. As 14px text it holds 5.2:1 on the glass over a dark pane, 4.2:1 on a highlighted row and 4.0:1 over a white page. So text reads `--dl-danger-text`, the same hue at a lightness of at least 0.74, which clears 4.5:1 in all three. It is the rule `--dl-accent-text` follows: one token for fills and rings, a lighter one for words.

### The focus ring

The keyboard ring is each app's accent, picked on 2026-11-22. From 0.6 `tokens.css` defines it: `--dl-focus-ring` is the accent, `--dl-focus-w` is 2px and `--dl-focus-offset` is 2px. The band, the create button, the family switcher, the phone's icons and search, the palette's Esc keycap and the toast's action all read them. The switcher keeps its 4px offset and the phone's icons their inset ring, since each sits that way in its own space.

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

`<ToastBand>` follows the same width without being told, and renders nothing above it. `usePhoneLayout()` returns the same answer for the app's own code. From 0.7 a phone on its side counts as well, at any width (see "A phone on its side").

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

`toast.loading()` raises the progress kind (`toast-progress`): the app's accent in the same recipe as the other kinds, with a spinner as its icon. On the phone its card behind the pill wears a bar along the top edge that sweeps while the work runs. A pinned one draws no bar, since it never goes behind the pill. Put `PROGRESS_DONE_TOAST` on the result to keep that bar, solid green, until it times out. A plain toast can carry `PROGRESS_TOAST` itself with `<ToastSpinner />` as its `icon`.

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

### A press on a progress toast

`pressToast(id, onPress, { description })` makes the progress toast with that id a button on a computer: a click, or Enter or Space while it has focus, calls `onPress`, and the toast takes the family's press. It works only while the toast is the progress kind, and never on a phone, where a tap fans the stack. It returns the function that takes the press off. `TOAST_PRESS_ATTR` is the attribute the pressable card carries, and `readToastPress(id)` answers for an app's tests. See "Moving an app from 0.12 to 0.13" for drive's use.

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

It goes where the sidebar's `<Wordmark>` was. Nothing shows at rest. Pointing at the wordmark for 150ms, or pressing it, opens the frosted menu to the right of the wordmark, from its top, with an arrow. That is the owner's pick on 2026-11-22: the menu stands over the top of the next column and never under the wordmark, where it covered mail's Compose and notes' search. From 0.5 it opens past the sidebar. Its left edge sits 10px beyond the sidebar's right edge, where the arrow's tip meets that edge, so the menu lands at the same x in every app (250 beside a 240px sidebar). In 0.4 it opened 10px past the end of the wordmark, at an x that changed with the app's name, over the sidebar's search glass and refresh. The sidebar is the closest `<aside>` or `[data-sidebar]` around the wordmark, measured as the menu opens, so a resized or folded one is read as it stands. With no room on the right it flips to the left, and it never drops to the other axis. The menu lists the four apps as their own wordmarks, each period in that app's accent, with a check on the app you are in.

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
| `boundary` | the closest `<aside>` or `[data-sidebar]` | The column the menu opens past. Pass an element for a sidebar that is neither, or `false` to open 10px past the wordmark as in 0.4. A menu below the wordmark ignores it. |
| `boundaryOffset` | 10 | How far past the boundary's right edge the menu's left edge sits. |
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
| `closeOnClick` | `MenuLinkItem` | Base UI's own, on by default from 0.5: a click on a link row closes its menu, as on any row. Base UI's default leaves it open. |
| `inset` | `MenuItem`, `MenuLinkItem`, `MenuLabel`, `MenuSubTrigger` | Lines the words up with rows that have an icon. |
| `keys` | `MenuShortcut`, `Kbd` | The keys, one cap each: `["Ctrl", "K"]`. A single cap may be the child instead. |
| `align`, `alignOffset`, `side`, `sideOffset`, `anchor`, `collisionPadding` | The three content parts | Passed to Base UI's positioner. The context menu takes no `anchor`. |
| `collisionAvoidance` | `MenuContent` | Base UI's own: where the menu may go when its side has no room. |

What the look comes to, from `menu.css`:

- The surface is the overlay glass with 10px corners. Rows are 32px tall and sit 4px in, with a 7px corner.
- A menu or popover anchored to a control has an arrow: drive's, a square turned 45 degrees and lined on its outer edges. A context menu has none, and neither has a submenu.
- A shortcut is a keycap at the row's right end. Keycaps are hidden on a touch screen. They are a picture, so a screen reader hears the row's own name and then the shortcut: `<MenuShortcut keys={["Ctrl", "K"]} />` writes `aria-keyshortcuts="Control+K"` on its row. Pass `aria-keyshortcuts` to say one the caps don't spell. `ariaKeyShortcuts(keys)` is the rule that names the caps, exported for a row the app draws itself.
- A destructive row is red, words and icon.
- A group's label is small and muted, in the case it was written in. Write it in sentence case. Base UI needs `MenuLabel` inside a `MenuGroup`.
- A menu fades in over 150ms and out over 110ms. It lands at once when the keyboard opened it, and under reduced motion, which is the app's own switch where it has one. A context menu always opens at once.
- A row picked with the pointer blinks off for 60ms, and then the menu fades: the pick, from 0.13 (see "Moving an app from 0.12 to 0.13"). The row's action has already run. Escape, a press outside and a pick from the keyboard close with no blink.

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

One palette for the four apps: a Base UI Dialog holding an inline Autocomplete, 600px wide and frosted, with the app dimmed behind it. It starts from calendar's palette and takes mail's search palette look. Mount it once at the app's root. It needs `palette.css` and `menu.css`. It is built from parts an app can build its own palette on (see "Building a palette from its parts" below).

Ctrl K opens and closes it (Cmd K on a Mac). The app's own key opens it too, when pressed outside a text field. The caret is in the field as it opens. The arrows move the focus, and so do Ctrl N and Ctrl P, as in cmdk, except while an IME is composing. Chrome on Windows and Linux keeps Ctrl N for a new window and never hands it to the page, so there only Ctrl P moves the highlight. Caps Lock changes neither. The focus always rests on a row, Enter runs that row, and Escape or a press outside closes the palette. While an IME is composing, its Enter and arrows are the IME's: none of them runs a row or moves the focus.

Results come in groups under sentence-case headings, and the words of the query are marked in each row's title and second line. The focused row shows an Enter keycap in the slot its own shortcut sits in. That slot is on every row, so nothing in a row moves as the focus does.

A row may name its `verb`, for a row that Enter does not open: drive's "Reveal" for a file shown in its folder. The word sits before the Enter cap on the focused row, small and muted. The hint a screen reader hears on the field says it too: "Press Enter to reveal the highlighted result", where it says "open" for a row that names none. A row with a verb holds the word's width open at its right end, focused or not.

The palette is modal (`aria-modal="true"`), so Tab stays in it, with one exception. A toast that can take Tab joins the loop: Tab in the field goes to the toast's action and Tab there comes back. A press on a toast leaves the palette open. The palette holds Tab on the press itself, as the sheet does, because Base UI's focus guards turn it back a frame late: two quick Tabs from the filter used to leave the palette.

Escape closes an open menu of the palette's own before the palette, the filter's or a row's. That holds even for an Escape pressed before focus has moved into a menu that has just opened. The next Escape closes the palette. A control counts as an open menu when it has a popup (`aria-haspopup`, and not `"false"`), says `aria-expanded="true"`, and is one of the kit's triggers or has its popup mounted outside the panel. A listbox drawn inline in the panel is always there and is no menu. A control that still says it is open after one Escape holds no second one, so the next Escape closes the palette.

Per the curator's motion rule, opening it from the keyboard does not animate, and neither does closing it after a key. Opened by a press on a search button, it fades in over 150ms.

| Prop | Default | What it does |
| --- | --- | --- |
| `sources` | none | What the palette searches, in the order the groups show. Keep the array stable between renders. |
| `actions` | none | The app's actions. The palette ranks them itself and lists them last. |
| `actionsHeading` | `"Actions"` | The heading over the actions. |
| `selection` | none | What the app has selected, `{ heading, items }`: a group that leads the list, under the selection's name, holding its verbs with their keys. Ranked against the words as the actions are. From 0.13. |
| `open`, `onOpenChange` | the palette owns it | For an app that owns the open state, such as one with a search button. |
| `hotkey` | `true` | Whether Ctrl K opens and closes it. An editor that uses Ctrl K for links turns it off there. |
| `appKey` | none | The app's own key for search, or several: `"/"`. |
| `placeholder` | `"Search"` | The field's placeholder, which is also its accessible name. |
| `label` | `"Command palette"` | The dialog's accessible name. |
| `emptyText` | `No results for “query”.` | A function of the query, for the app's own words. |
| `filter` | none | A control at the end of the field, before the Esc cap: a `<FilterMenu>` (see "The filter"). |
| `className` | none | The app's own, beside `dl-palette`. |

A source is `{ id, heading, search }`. `search(query, signal)` returns rows, or a promise of them, and the signal aborts when the query changes or the palette closes. It is called with `""` as the palette opens, for whatever the app shows before a word is typed.

The list on screen always answers one query. Sources that answer at once are in the first frame. Where one answers later, the last list stays as it was until every source has answered the query in the field, and then the whole list changes together, the actions with it. Until then the old list is stale (`data-stale` on the list): its rows run nothing, the arrows move nothing, and it dims if the answer takes longer than 120ms. Enter is held and runs the first row of the answer when it arrives. Typing again lets the held Enter go. An Enter or an arrow that the app's `onKeyDownCapture` prevented is the app's, and the stale list holds none of them.

A source slower than 400ms (`SOURCE_WAIT_MS`) no longer holds the list back. The rest is shown, and the slow source's group joins at the end, under the actions, when it answers. No row already on screen moves, so the highlight stays on the row it was on. Answer at once where the rows are in memory, and the groups keep the order the sources were given.

A list with other rows starts on its first row: a filter pick that changes the sources moves the highlight to the top, and it never lands on whatever row took the old one's place. The same rows coming back, as new objects or not, keep it where it was. The field says `aria-expanded="true"` only while the list holds a row.

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
| `onSelect` | Required, unless the row opens a `page`. The palette has closed by the time it runs, unless `keepOpen`. |
| `page` | A page the row opens in the same field (see "Pages"). |
| `menu` | What else the row can do, as a menu (see "A row's menu"). |

The actions are ranked as well as filtered. A row that holds every word of the query, in any order, in its title or keywords comes first, as in 0.11, and these rows are ordered by cmdk's command-score: "arch" puts "Archive" above "Show the archive". After them come the rows that do not hold every word but score 0.1 or more (`SCORE_FLOOR`), so "np" finds "New page", "swm" finds "Switch to Month view" and "todo" finds "New to-do list". Rows that score the same keep the app's order, and the matching ignores case and accents. A source keeps its own ranking. `rankActions`, `scoreQuery` and `commandScore` are exported for one that wants the palette's, beside `matchesQuery`, `matchParts`, `queryTerms` and `fold`.

A row the score found marks letters, since it may hold none of the words. The marks are the letters command-score itself took for its best score, so every row it finds in its title draws them. "todo" marks "to" and "do" in "New to-do list", "np" the N and the P of "New page", "ol" the O of "Copy" and the L of "link" in "Copy link - open", and the transposed "pgae" the whole of "Page". A letter outside the basic plane, an emoji, counts as one letter. When the letters matched the keywords and not the title, nothing is marked. `scoreParts` is that rule, and the phone's search marks the same letters.

command-score is copied from cmdk 1.1.1 into `src/components/command-score.ts`, under its MIT notice (Paco Coursey, from Superhuman's command-score). The kit adds types and one non-null assertion, and changes nothing else.

`--dl-palette-z` is the dim's z-index (90, over the menus), and `--dl-palette-dim` is its fill, `--dl-scrim` unless set. `zIndex` on `<Palette>` sets the first for one palette.

### Pages

A row can open a page in the same field, as cmdk's nested pages do: "Move to…", then the folders. Give the row a `page`, `{ id, crumb, placeholder, sources, actions, actionsHeading, emptyText }`. Choosing the row opens the page with an empty field, its own placeholder and its own list, and the page's name sits before the words as a crumb. Backspace in an empty field goes back one page with the words the parent had, and so does Escape. Pressing a crumb goes back to it. Escape on the first page closes the palette.

The stale list and the held Enter work the same on every page: a list from the page before is stale until the new page's sources answer. A palette that passes its own `results` still lists a page's own sources and actions once the page opens.

### A row's menu

`menu` on a row is what else it can do, as entries `{ label, onSelect, destructive, keepOpen }` with `"separator"` between groups. A right click on the row opens it at the pointer, and ArrowRight with the caret at the end of the field opens it under the highlighted row. The row stays lit while its menu is open. An entry closes the palette as a row does, unless it says `keepOpen`. The menu stands over the palette, as the filter's does.

### Building a palette from its parts

`<CommandPalette>` is `<Palette>` with `<PaletteField>` and `<PaletteList>` in it. An app whose palette needs more builds on those parts and keeps the dialog, the keys, the motion rule, the toast's place in Tab and the stale-list machinery.

```tsx
import { Palette, PaletteField, PaletteLine, PaletteList, PaletteNote, usePalette } from "@dalin/kit/components";

<Palette query={words} onQueryChange={setWords} results={results} zIndex={40} finalFocus={handBack}>
  <PaletteField
    glyph={busy ? <Spinner /> : undefined}
    start={<Chips chips={chips} />}
    completion={offer ? { suffix: offer.suffix, onAccept: accept } : null}
    onKeyDown={removeLastChipOnBackspace}
    filter={<SearchFilterMenu />}
  />
  {hint ? <PaletteLine>{hint}</PaletteLine> : null}
  <PaletteList rowContent={(row) => <MailRow row={row} />}>
    {failed ? <PaletteNote tone="error" action={{ label: "Retry", onClick: retry }}>Search could not finish.</PaletteNote> : null}
  </PaletteList>
</Palette>
```

`<Palette>` takes every prop `<CommandPalette>` takes except `filter`, which belongs to the field. It adds these:

| Prop | What it does |
| --- | --- |
| `query`, `onQueryChange` | For an app that owns the words. The palette clears its own words as it closes; an app that owns them decides what an opening starts from. |
| `results` | The app's own list, `{ groups, query, busy }`, in place of `sources` and `actions` on the first page. While `query` differs from the words in the field, the list is stale and Enter is held. A page that opens lists its own sources and actions. |
| `tail` | Rows that end the list under no heading, after any late group: mail's "Show all". A function of the words the list answers. |
| `marks` | The words to mark, from the words the list answers. |
| `onEscape` | Asked first on Escape. Return true when the key was the app's own, and the palette stays. |
| `finalFocus` | Base UI's, for an app that hands focus on as the palette closes. |
| `zIndex` | Written as `--dl-palette-z` on the dim and the panel, for an app that stands the palette under a window of its own. |
| any other attribute | Goes to the panel: a `data-*` marker, an `id`. The kit's `data-slot`, `role`, `aria-label`, `aria-labelledby`, `aria-modal`, `tabIndex` and `hidden` win over one of the same name, and `style` sits under the z-index. |

`<PaletteField>` is the field row. `glyph` replaces the magnifying glass. `start` and `end` sit inside the row before and after the words, `filter` before the Esc cap. `completion` is `{ suffix, onAccept }`, faint text after the words that Tab or ArrowRight at the end takes. While one shows in a field that isn't read only, a toast waits for the next forward Tab. Shift+Tab still reaches the toast. Pass null while there is nothing to offer, and leave it out in a palette that never offers one, since the field wraps the input for it. `onKeyDown` hears every key before the palette does, and `preventDefault()` keeps a key from the palette and from Base UI. `readOnly` and `busy` go to the input.

`<PaletteList>` is the list, with `emptyText`, which shows only once words have been answered: a palette with chips and no words, as mail's can be, draws its own empty line as a `<PaletteNote>` child. An `emptyText` that answers null draws no line, for a list whose own notes already say why it is empty.

`<PaletteList>` also takes `rowContent` for a row whose insides the kit's anatomy does not fit (the keys and the Enter hint still end it), and children drawn under the rows. `<PaletteNote>` is a line there, `tone="error"` for the red alert and `action` for its button. `<PaletteLine>` is a line under the field row. `<PaletteBody status>` takes the list's place, for calendar's questions about a sentence: draw it instead of `<PaletteList>`, answer its keys in the field's `onKeyDown`, and the status region says `status`. `usePalette()` reads the words, the list, the failed sources and `retry` from inside the palette.

A group, whether a source's or the app's, may carry a `note`, a line under its rows ("Showing 30 of 112"). A source can answer `{ items, note }` for that. A group with no heading draws none. A row may carry `dim` (`true` for 85%, `"waiting"` for 60% after 120ms, with Enter on it held until it is current), `className`, and `data`, which the kit never reads. A held Enter is for the place the highlight was: moving the highlight by a key or the pointer, new words, a page, a close, or an answer with nothing in it lets it go. So does a row that steps back where it would have become current, as a failed answer leaves it at 85%: the Enter runs nothing.

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
| `sources`, `actions`, `actionsHeading` | none | The palette's own search, for both surfaces (see "One search for the phone and the desktop"). |
| `children` | none | The app's own results for a query, in place of `results`. |
| `beforeQuery` | none | The app's own content before a query, under the sections. |
| `covered` | `false` | Hides the sheet under something the app draws over it, without closing search. |
| `emptyText` | `No results for “query”.` | A function of the query. |
| `query`, `onQueryChange` | the sheet owns the words | For an app that owns them, or wants to hear them change. |
| `onSubmit` | none | Called when the keyboard's Search key is pressed. |
| `fieldStart`, `fieldEnd` | none | The app's own pieces inside the field, such as calendar's calendar picker. |
| `completion` | none | The palette's ghost completion, `{ suffix, onAccept }`: faint words after the typed ones. |
| `inputRef` | none | The field's input, for an app that focuses, blurs or measures it. |
| `ownScroller` | `false` | The app's results scroll themselves, and the body holds still. |
| `rowContent`, `groupContent` | none | A source row's own insides, and a source group laid out by the app (see "One search for the phone and the desktop"). |
| `narrowed` | `false` | Whether a filter in `fieldEnd` is on. The sheet then shows `results` before a word is typed. |
| `className` | none | The app's own, beside `dl-phone-search`. |

The field is a plain box around the input, never a `<label>`, since a label hands every tap to its first control. A tap on a control the app put in `fieldStart` or `fieldEnd` belongs to that control. A tap anywhere else on the field puts the caret in the input.

A section is `{ heading, rows }`, or `{ heading, children }` for rows the kit has no shape for, such as calendar's agenda lines. A row is `{ id, title, subtitle, leading, meta, keepOpen, onSelect }`. `leading` is a 20px glyph or a `<PhoneSearchAvatar initials color>`, a 28px circle. `meta` ends the row at the right, small and faint: a file's size, "7 items". A section with no rows is not drawn. A row may also carry `dim`, at the palette's steps (`true` for 85%, `"waiting"` for 60%), drawn at once since nothing on the sheet fades. It takes `className` too, and `held`, which keeps a row lit while the menu of the app's own hold is up.

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

`ownScroller` is for results that hold their own scroller, such as mail's message list. While the app's results show, the body stops scrolling, gives its height to its last child and drops its bottom padding. A status line may stand before the scroller and keeps its own height; the scroller must come last. Before a query the kit draws the action row, the sections and `beforeQuery`, and the body scrolls them as usual. That padding (the safe area, 32px and the keyboard) is written on the body as `--dl-phone-search-end`. The app's scroller ends on `var(--dl-phone-search-end)`, and the keyboard is counted once.

`completion` lays faint words after the typed ones, as the palette's does. A tap on them takes it and leaves the caret, and the keyboard, where they were. On a keyboard, Tab and ArrowRight at the end take it, except a key that confirms an IME's candidate (Safari sends it after the composition has ended, with keyCode 229). Pass null while there is nothing to offer, and leave it out where search never offers one, since the field wraps the input for it. `inputRef` hands the app the input, so no app has to find `.dl-phone-search-input` by its class. A ref swapped while search is open gets the input, and the one it replaced is cleared.

### One search for the phone and the desktop

`<PhoneSearch>` takes the palette's own `sources`, `actions` and `actionsHeading`, with the same types, so one definition drives both surfaces:

```tsx
const sources = useMemo(() => searchSources(filter), [filter]);

<CommandPalette sources={sources} actions={actions} />
<PhoneSearch open={searching} onOpenChange={setSearching} sources={sources} actions={actions} action={newPage} />
```

Before a word is typed, each source's answer to `""` is a section, under the action row and before `sections`. The actions are not listed then, since the action row leads. With a query, the sources' groups and the ranked actions are the sections, and the query's words are marked in their rows. The list changes only once every source has answered, as the palette's does. Until then the old rows stay and a tap on one runs nothing, and a source slower than `SOURCE_WAIT_MS` joins at the end. The sheet does not dim a stale list, since nothing on it fades. `emptyText` says when nothing was found.

`results` and `children` win over the sources, and `sections` is still drawn after them, so an app moves over one surface at a time. A row with a `page` runs only its `onSelect` on the phone, which has no pages.

A source's row takes the app's own insides from `rowContent(item, { marks, byScore, held })`, as the palette's list does. Drive draws its names cut in the middle there. Return undefined to keep the kit's row; the tap, the long press, `dim` and `className` stay the kit's either way. `groupContent(group, row)` lays out a group's rows under its heading, so calendar can put its day headings and its Past divider between them. `row(item)` draws one of the kit's rows keyed by the item's id, and the app keys its own lines. Return undefined for the kit's plain run.

A row takes a long press: 450ms of a still finger, or a right click. A `menu`, on a source's row or on a `PhoneSearchRow`, opens the family's menu at the finger, and the row stays lit while it is up. The click the lifting finger makes is swallowed, so the row does not also open. `onLongPress` on a `PhoneSearchRow` is a hold of the app's own, for a row whose hold is no menu. While a finger holds a row it is lit (`data-pressing`), as it is while its menu is up, and it goes out when the hold fires or the finger lifts or moves. The menu's entries are 44px tall in 16px type: the family's phone target, at the rows' size.

`phone.css` reads three variables: `--dl-phone-inset` (16px), `--dl-phone-fill` (the sheet's fill, `#151515`) and `--dl-phone-search-z` (50, over the bottom bar).

## The segmented control

A short choice shown as segments side by side: List, Columns, Grid. The track is sunken: the content fill (#1c1c1c) inside the family's rule (#2f2f2f). The picked segment is a #3d3d3d lift with a #5c5c5c line just inside its edge, white words and a small shadow, and the others have muted words that turn white under the pointer. That was the look of the Share switch in notes. The owner made it the family's on 2026-11-23.

```tsx
import { slideSegLift } from "@dalin/kit";

<span className="dl-seg" role="radiogroup" aria-labelledby={labelId} ref={slideSegLift}>
  {options.map((o) => (
    <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="dl-seg-option" onClick={() => pick(o.value)}>
      {o.label}
    </button>
  ))}
</span>
```

The kit has no component for it: each app's settings rows build their own markup, so the kit gives the classes and one helper. `slideSegLift`, passed as the group's ref, makes the lift slide from one pick to the next over `--dl-t-base`, as the Share switch did. The segments are as wide as their words, so it measures the picked one and writes its box on the group (`--dl-seg-x`, `--dl-seg-y`, `--dl-seg-w`, `--dl-seg-h`), and the track's `::before` draws the lift there. It measures again on a new pick and when the group resizes. Its first placement lands at once, and a pick made from the keyboard or under reduced motion lands at once too. Without the helper, or before it runs, the picked segment draws its own lift in the same place, so the server's markup looks right and nothing moves when the helper takes over. It is a React 19 ref callback that returns its cleanup; `placeSegLift(group)` is the measuring half alone. A press looks like every other kit control's: one step darker on the desktop, and inside `.dl-phone` it shrinks and brightens, with each segment reaching 44px up and down for a thumb.

The font size is the app's, since the four apps' settings rows use different sizes (12px to 14px). Set it on `.dl-seg-option` in the app's own sheet. The kit's rules sit in the `dalin` layer, so that rule wins. Room around the words works the same way, through padding.

An app must not override the edge, the track's fill, the picked lift with its line and shadow, or the muted words of the others.

## The filter

The owner picked one filter glyph for the four apps on 2026-11-24: three lines that shorten as they go down, the list getting smaller. Lines have no inside to fill, so its filled form draws them heavier. It stands alone, with no box behind it. A filter that is on puts a dot at the glyph's top right, in the colour of what it narrows to, in all four apps.

`<FilterGlyph>` is the glyph alone, for an app that draws its own control. Pass `filled` for hover, an open menu and a filter that is on.

`<FilterMenu>` is mail's search filter made general: the glyph as a menu trigger, ending a search field or a palette's input, and the menu it opens. The app keeps the query; each row runs its own `onSelect`, so the kit holds no filter state.

```tsx
import { FilterMenu, filterCount } from "@dalin/kit/components";

<FilterMenu
  label={scoped ? `Filters: only ${scoped.short}` : "Filters"}
  dot={scoped ? scoped.colour : null}
  choice={{ label: "Search in", value: scoped?.id ?? "", options: [{ value: here.id, label: here.short }, { value: "", label: "All mail" }], onChange: pickMailbox }}
  facets={[{ key: "from", label: "From", options: senders, empty: "No senders" }]}
  onFacetOpen={setCounting}
  groups={[
    [{ key: "unread", label: "Unread", count: filterCount(unread, capped), onSelect: () => add("is:unread") }],
    [{ key: "people", label: "Only people", checked: scope === "people", onSelect: togglePeople }],
  ]}
  variant={phone ? "phone" : "desktop"}
  tooltip={(trigger, label) => <Tip label={label}>{trigger}</Tip>}
/>
```

The menu holds, in order, an optional `choice` (a radio group under its label), the `facets`, then the `groups` of plain rows. A facet is a submenu on a computer. On a phone it is a page swapped into the same menu, with a back row at its top, since a submenu has nowhere to open on a narrow screen. A facet's `options` may be undefined while they load: `onFacetOpen` gets the facet's key when its list opens, and null when the list or the menu closes, so the app fetches counts only for what is on screen. A row's `count` sits at its right end; `filterCount(n, capped)` formats one, with a plus past a cap. A `checked` row shows a tick in place of a count.

A press on the glyph keeps focus where it was, so the caret stays in the field. A pick of the `choice` keeps the menu open unless the choice says `closes`, and as the menu closes it hands focus back to what had it when it opened (the field, or the glyph when the keyboard opened it), unless something else has taken it since, such as a dialog the pick opened, or `finalFocus` says otherwise (it is `<MenuContent>`'s prop, passed through). The kit has no tooltip of its own, so `tooltip` wraps the trigger in the app's. The control is 28px with a 16px glyph on a computer, and 44px with a 20px glyph on a phone. Its menu stands two steps over the command palette, so it opens over the palette from its `filter` slot.

An app must not override the glyph, its filled form, the absence of a box, or the dot's size and place.

## The sheet

```tsx
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetTitle } from "@dalin/kit/components";

<Sheet open={open} onOpenChange={(next) => setOpen(next)}>
  <SheetContent>
    <SheetBody>
      <SheetTitle>Move to</SheetTitle>
      {folders}
    </SheetBody>
    <SheetFooter>
      <SheetClose>Cancel</SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

One bottom sheet for the four apps, on Base UI's Drawer. Each app had built its own by hand, three of them in calendar alone, and each copy had its own drag, focus trap and exit. It needs `sheet.css`.

The panel is the overlay glass with 14px top corners and the 40 by 4 handle at its top. It rises from the foot of the screen over `--dl-t-sheet` (260ms) on `--dl-ease` and sinks the same way, with the page dimmed by `--dl-scrim` behind it. Nothing behind it moves or shrinks: the owner picked the dim alone on 2026-11-24. Opened or closed from the keyboard, or under reduced motion, it lands at once.

| Part | What it is |
| --- | --- |
| `Sheet` | The root. It owns the open state, or takes the app's. |
| `SheetTrigger` | A button that opens it, for a sheet that owns its state. |
| `SheetContent` | The scrim, the box that places the panel, and the panel with its handle. |
| `SheetHandle` | The grab strip. `SheetContent` draws one, so an app draws its own only to give it a tap of its own. |
| `SheetHeader`, `SheetFooter` | A row above the body and one below it. Neither scrolls. |
| `SheetTitle`, `SheetDescription` | The heading, which names the sheet for a screen reader, and a muted line. |
| `SheetBody` | The part that scrolls. |
| `SheetClose` | A button that closes it. |

`<Sheet>` takes:

| Prop | Default | What it does |
| --- | --- | --- |
| `open`, `defaultOpen` | the sheet owns it | For an app that owns the open state, or one that only says how it starts. |
| `onOpenChange` | none | Called before every open and close with `(open, details)`. `details.reason` says why and `details.cancel()` refuses it. |
| `onOpenChangeComplete` | none | Called with `open` once the slide has ended. |
| `layout` | `"sheet"` | `"dialog"` draws the same parts as a small centred dialog. |
| `modal` | `true` | `false` leaves the page in use. `"trap-focus"` holds Tab and nothing else. |
| `swipe` | `true` | Whether a drag closes it. |
| `dismissDistance` | 96px or 40% of the height | How far down a release closes it: a number of px, or a function of the sheet's height. The Settings sheets pass `SHEET_DISMISS_PX`. |
| `dismissOnOutsidePress` | `true` | Whether a press on the scrim closes it. |
| `systemBack` | `false` | Whether the sheet holds a history entry while it is open. |
| `ownsEscape` | none | `(target, event) => boolean`. True leaves this Escape to something inside the sheet. |
| `virtualKeyboard` | `false` | Turns on Base UI's own keyboard handling. |
| `actionsRef` | none | A ref that receives `close(then)`. |

`<SheetContent>` takes the panel's own props (`className`, `style`, `data-*`, a `ref`) and these:

| Prop | Default | What it does |
| --- | --- | --- |
| `label` | none | The accessible name of a sheet with no `<SheetTitle>`. |
| `container` | `<body>` | The element the sheet is drawn into. |
| `initialFocus`, `finalFocus` | the panel, the opener | Base UI's own: where focus goes as it opens and as it closes. |
| `scrim` | `true` | Whether the page is dimmed behind it. |
| `handle` | `true` | Whether the grab handle is drawn. |
| `closeLabel` | `"Close"` | The name of the dialog layout's X. |
| `toastCover` | `true` | Whether the sheet tells the toaster it covers the bottom bar. |
| `keepMounted` | `false` | Keeps the sheet in the document while it is closed. |
| `scrimClassName`, `viewportClassName` | none | The app's own classes on the scrim and on the box around the panel. |
| `vars` | none | The sheet's own variables for this sheet alone, such as `{ "--dl-sheet-z": 72 }`. See "Variables an app may set". |

### The drag

A finger drags the sheet from anywhere on it, the body and its buttons included, once the body is scrolled to its top. While the body is scrolled down, a downward drag scrolls it. The owner approved that on 2026-11-24. Before it, only the grab strip dragged. A mouse drags by the handle, the header and the footer, and selects text in the body.

A press starts no drag in four cases, which are vaul's rules and which Base UI lacks:

- in the sheet's first 500ms, while the tap that opened it is still ending;
- for 100ms after anything inside it scrolled;
- on a `<select>`;
- while text inside it is selected.

These hold back a drag and nothing else. A tap on a button or an option in the first 500ms still lands.

Chromium on a phone sends no touchmove until the finger has gone some 15px from the press, and Base UI's Drawer takes the origin of a drag from the first touchmove. The browser does send pointer moves inside that distance.

So where Base UI holds the panel from the press (the handle, or a body with nothing to scroll), the kit moves the panel by them, and it follows the finger from the first pixel. A body that scrolls can't tell a drag from a scroll before that first touchmove, so its panel waits for it and then meets the finger. Either way the kit draws back whatever travel Base UI dropped, with `translate` beside Base UI's transform, and judges a release by how far the finger has gone since the press.

Measured in headless Chromium at 390 by 844 before the fix, a drag from the handle stayed put for 16px and then trailed the finger by 16px, so a slow close needed 112px of finger. It now follows from 2px and closes past 96px.

The dim follows the same travel. The scrim lifts by 1 - travel / height x `--dl-sheet-lift`, counting the kit's part of the travel as well as Base UI's, from the handle and from the body. Before, it read Base UI's part alone and trailed the panel by the 16px the kit draws: on a 300px sheet dragged 60px it read 0.919 where the rule gives 0.890. A release that settles takes the dim back to full.

A sheet follows one finger. A second finger on the glass neither starts a drag of its own nor ends this one.

A region with gestures of its own opts out with `noSheetDrag()`, which writes the kit's `data-dl-no-drag` and Base UI's `data-base-ui-swipe-ignore`:

```tsx
import { noSheetDrag } from "@dalin/kit/components";

<div {...noSheetDrag()}>{scrubber}</div>
<div {...noSheetDrag("x")}>{files}</div>
```

With no argument, no drag that starts in the region moves the sheet: a media scrubber, a PDF being panned. With `"x"` a sideways drag belongs to the region and a downward one still moves the sheet, which is what mail's swipe between attachments needs. `"y"` is the other axis. Spread it, so React owns both marks: a region that stops spreading it (mail's PDF once zoomed back out) drags the sheet again, and a change of axis counts from the next press. Writing `data-dl-no-drag` by hand no longer opts out.

A release closes the sheet once it has travelled far enough, or on a flick. The apps have two rules for how far, and the kit keeps both.

| Rule | Where it is today | Closes past |
| --- | --- | --- |
| The app sheets', the default | Calendar's `sheetRelease`, mail's `sheetShouldDismiss` | 96px or 40% of the sheet's height, whichever is less |
| The Settings sheets' | `SettingsSheet` in all four apps | A flat 96px |

The two agree on a sheet 240px tall or more, where 40% of the height is 96px or past it. Under 240px they differ: a 200px sheet closes past 80px by the first rule and past 96px by the second. So the distance is the sheet's own, in `dismissDistance`, and a Settings sheet that moves onto the kit passes the flat one:

```tsx
import { SHEET_DISMISS_PX, Sheet } from "@dalin/kit/components";

<Sheet dismissDistance={SHEET_DISMISS_PX} layout={phone ? "sheet" : "dialog"} open={open} onOpenChange={change}>
```

A function of the height works too: `dismissDistance={(height) => height / 3}`.

The flick is one rule for every sheet: faster than 0.5px a millisecond, once the sheet has travelled 16px. Anything less settles it back. The kit reads the speed from its own samples of the finger, as distance over time across the last three moves inside 100ms (`sheetReleaseVelocity`). A phone under load can hand a move over 60ms late, or only with the lift, and one slow sample no longer turns a real flick into a settle. A finger still for 80ms before it lifts is no flick. `sheetShouldDismiss` is the whole rule as a function. The apps' copies disagree on the edge itself: calendar closes at exactly the distance and mail and the Settings sheets only past it. The kit closes past the distance, and counts a flick from 16px on.

Base UI's Drawer has a rule of its own: past half the height, or the same flick with no least travel, averaged over the whole drag. Whichever distance the sheet has, the kit's rule wins, and this is how. The kit listens on both sides of Base UI's own handlers. Before Base UI hears a release, the kit reads how far the finger has travelled, with the lift's own place counted, and how fast it was moving. Then it decides.

If Base UI then asks to close and the kit's answer was no, the kit refuses that close with Base UI's `eventDetails.cancel()` and the sheet settles. If the kit's answer was yes and Base UI asked for nothing, the kit closes the sheet itself, in the same task as the release. The panel slides out from where the finger let go: traced frame by frame in headless Chromium, it holds there and then goes straight down over 260ms, never back up. Where both say yes, Base UI runs the close, in less than the sheet time after a fast flick. `onOpenChange` hears `"swipe"` in every case.

A release that something inside the sheet stops on its way up to the window is still finished, in the next frame. One that Base UI never heard, stopped before Base UI's own handler, is left to Base UI, and no later move closes the sheet on it.

A pull upward meets one resistance in every app, Base UI's own curve: the panel rises by the square root of the pull, so 100px of finger lifts it 10px. Calendar's sheets rose 35px for that pull, mail's 25px, and the Settings sheets not at all. The curve sits between them. It is also what the Drawer draws by itself, and a factor of the kit's own would have to overwrite the Drawer's transform on every frame of a drag.

The scrim lifts as the panel goes down, by 55% of the dim over a full drag (`--dl-sheet-lift`), the rate calendar's and notes' sheets used.

### Nothing fixed is trapped in it

The panel has no transform at rest, no filter, no backdrop filter and no `will-change`. Any of those would make it the containing block for a `position: fixed` child, and drive's and notes' sheets hold such children. So the frost is a layer behind the panel's content, and a transform (with the kit's `translate`, under a finger) is on the panel only while it opens, closes or is under a finger. A fixed child does move with the panel during those moments.

### Refusing a close

Every way out asks `onOpenChange` first: the scrim, Escape, a swipe, a `<SheetClose>`, the system's back and `close()`. The app refuses with `details.cancel()`, and a refused swipe settles back where it was. An editor with unsaved words refuses, asks its question, and closes the sheet itself on the answer:

```tsx
<Sheet
  open={open}
  onOpenChange={(next, details) => {
    if (!next && dirty) {
      details.cancel();
      askToDiscard();
      return;
    }
    setOpen(next);
  }}
>
```

A close the app makes by setting `open` to `false` asks nobody. `details.reason` is Base UI's word for the cause (`"outside-press"`, `"escape-key"`, `"swipe"`, `"close-press"`, `"trigger-press"`, `"imperative-action"`, `"focus-out"`, `"close-watcher"`) or the kit's `"system-back"`. With `systemBack` on, Android's back is `"system-back"` whether the history entry or the browser's CloseWatcher took it.

Keep the `<Sheet>` mounted and change `open`. A sheet the app unmounts to close it is gone in one frame, with no slide.

### Escape, focus and a sheet over a sheet

Escape closes the sheet. `ownsEscape` lets something inside it take the key first: while it answers true the sheet stays open and the key travels on to the field, which drops its text. Calendar passes its `fieldOwnsEscape`.

Focus lands on the panel as the sheet opens, and not on its first control, since a focused field would raise the phone's keyboard over the sheet. `initialFocus` names another target. Focus goes back to what opened it. `modal={false}` gives the page back, as mail's compose does while it peeks.

A modal sheet holds Tab itself, on the press: Tab off the last stop comes round to the first, and Shift+Tab off the first (or off the panel) goes to the last. Base UI's own guards turn Tab back a frame late, so two quick presses used to leave the sheet. With sheets stacked, only the top one holds Tab. Its panel carries `aria-modal="true"`, which is true of `"trap-focus"` as well: Base UI hides the page from a screen reader behind both. A sheet with `modal={false}` carries none.

A sheet over a sheet is a `<Sheet>` drawn inside the first one's content: drive's place peek over the file sheet, calendar's picks over the event sheet. Escape, a press outside and a swipe then close the top one alone. It dims the one behind with a scrim of its own and stands one step higher on the z ladder, so five sheets deep still stand under the toaster. The one behind stays where it is, and carries `data-nested-drawer-open` for an app that wants to style it.

### The toaster

An open sheet registers itself as a toast cover, so a toast raised over it announces above its top edge. An app's `<Toaster cover>` selector need not name it. A closing sheet covers nothing: it leaves the dock as its close begins, and its panel and scrim carry `data-dl-leaving` until they are gone.

A toast over a modal sheet keeps its action in reach of Tab, as over the phone's search and the palette: Tab on the sheet's last stop goes to the toast, and Tab on the toast's last stop comes back. With sheets stacked, or the palette over a sheet, it comes back to the one on top.

### The dialog layout

Every Settings sheet becomes a small dialog in the middle of the window on a computer. `layout="dialog"` draws that: no handle, an X in the corner with no box behind it, no drag, and the family's 150ms open and close. The width where the phone layout ends is the app's (calendar's begins under 900px, the others under 768px), so the app passes the answer:

```tsx
<Sheet layout={usePhoneLayout() ? "sheet" : "dialog"} open={open} onOpenChange={change}>
```

It stands two over `--dl-z-dialog`, so it opens over the Settings dialog.

### The system's back

`systemBack` gives the sheet one history entry while it is open, the way the phone's search has one: the back button or the back swipe closes the sheet, and a close from the screen takes the entry off. A refused back keeps an entry under the sheet, so the next back asks again. A sheet the app unmounts on the back gets no new entry. It is off by default. Drive and mail already give their layers entries of their own, and a second one would stack. Calendar's and notes' sheets have none today, so turning it on there is a change to decide.

On Android, Chrome hands the back gesture to an open sheet through its CloseWatcher before history sees it, and `onOpenChange` hears `"system-back"` for that too. Chrome lets a page refuse one back without a fresh tap, and closes the sheet on the next one whatever the app says.

A row that closes the sheet and then navigates calls `close(then)`. `then` runs once the slide has ended and the entry has gone, which is the first moment a navigation is safe. It never runs for a close that was refused, or for one an app that owns `open` let pass and then kept the sheet open:

```tsx
const actions = useRef<SheetActions>(null);

<Sheet actionsRef={actions} systemBack>
  ...
  <button onClick={() => actions.current?.close(() => openFolder(id))}>Open</button>
</Sheet>
```

### The keyboard

The panel stands on the on-screen keyboard and stops short of the safe area at the top. It reads how much the keyboard covers from the app's own `--kb-inset`, the variable mail, calendar and notes already publish, and an app that measures it another way sets `--dl-sheet-kb`. Drive publishes neither, so its sheets stay where they are when the keyboard rises, as they do today.

Base UI's own keyboard handling is off. Notes and mail set `navigator.virtualKeyboard.overlaysContent` and follow the caret themselves, and a second scroller would fight them. `virtualKeyboard` turns it on for a sheet in an app that does neither.

### Variables an app may set

| Variable | Default | Meaning |
| --- | --- | --- |
| `--dl-sheet-z` | 55, or 82 in the dialog layout | The z-index of the scrim and of the box around the panel. The box is drawn after the scrim, so it stands over it at the same number. A sheet over a sheet is one higher. |
| `--dl-sheet-scrim` | `--dl-scrim` | The fill over the page. |
| `--dl-sheet-lift` | 0.55 | How much of the dim a full drag takes away. |
| `--dl-sheet-fill`, `--dl-sheet-blur` | the overlay glass | The panel's fill and what it does to the page behind. `none` for the blur makes it solid. |
| `--dl-sheet-w` | 100% | The widest the panel grows. |
| `--dl-sheet-top` | 28px | The least room left above the panel, under the safe area. |
| `--dl-sheet-kb` | `--kb-inset` | What the on-screen keyboard covers. |
| `--dl-sheet-inset` | 16px | The body's side padding. |
| `--dl-sheet-dialog-w`, `--dl-sheet-dialog-t` | 28rem, `--dl-t-open` | The dialog layout's width, and its open and close. |

Set one on `:root` for every sheet. For one sheet, pass it in `vars` on `<SheetContent>`. It is written on the scrim and on the box around the panel, and the panel inherits it from the box:

```tsx
<SheetContent vars={{ "--dl-sheet-z": 72, "--dl-sheet-scrim": "rgb(0 0 0 / 0.4)" }}>
```

A variable in the panel's `className` or `style` reaches the panel alone. That's enough for the panel's own (`--dl-sheet-fill`, `--dl-sheet-blur`, `--dl-sheet-w`, `--dl-sheet-top`, `--dl-sheet-inset`, `--dl-sheet-dialog-w`). The scrim and the box never see it, so `--dl-sheet-z`, `--dl-sheet-scrim`, `--dl-sheet-lift`, `--dl-sheet-kb` and the dialog's `--dl-sheet-dialog-t` go in `vars`.

Every part carries a class (`dl-sheet`, `dl-sheet-scrim`, `dl-sheet-viewport`, `dl-sheet-handle`, `dl-sheet-body` and so on), a `data-slot`, and on the panel, the scrim and the viewport `data-layout`. The panel and the scrim also carry Base UI's state: `data-open`, `data-starting-style`, `data-ending-style` and `data-swiping`. The rules sit in the `dalin` layer, so the app's own class wins.

An app must not override the handle's pill, the corners, the sheet time and its curve, or the rule that the panel rests with no transform.

### What is not a sheet

Five surfaces look like one and should stay as they are.

- The phone's search. It opens at once, with the caret placed as the field mounts, which is what lets iOS raise the keyboard. A slide would delay that focus.
- Notes' format bar and its More grid. They must never take focus, or the caret and the keyboard leave the page. A sheet takes focus as it opens.
- Menus. A menu opens under its control, and mail's and notes' phone menus are menus by decision.
- Mail's reader. It is a page that slides in from the side and goes back on an edge swipe, with the inbox moving behind it.
- Notes' icon picker. It waits for the keyboard before it shows and docks to the keyboard's top edge, and it has to focus its search field to raise that keyboard.

## Helpers

Three things each app had copied, the motion reader described under "One place for the motion switch", and from 0.13 the tooltip's wait and the tab's settle. They export from `@dalin/kit` and from `@dalin/kit/helpers`.

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

### The tooltip's wait

`TIP_DELAY_MS` is 800, the first tooltip's wait in every app, and `TIP_GROUP_MS` is 400, how long a group stays warm after its tooltip closes. Each app hands them to its own tooltip provider (see "Moving an app from 0.12 to 0.13").

### The tab's settle

`settleTab(glyph)` settles the glyph of the phone tab being opened, from 0.9 to 1 over 140ms, with the class `TAB_SETTLE_CLASS` and the rule in `motion.css`. It plays nothing from the keyboard or under reduced motion, and leaves nothing running at rest.

## Not in version 0.13

These are still open, so the kit has no value for them: type sizes, shadows beyond the overlay's, and a sidebar component (the rows are tokens, and each app keeps its own markup).

These are decided and not built yet. The phone's bottom bar is glass tokens here and still each app's own component. The tooltip is frosted by the tokens and stays each app's own. The sheet is built, and no app has moved a surface onto it yet. The palette's parts are built, and mail and calendar still draw their own desktop palettes. It has no snap points, since no app's sheet rests at more than one height.

Five requests from the wave 1 reviews are also waiting: holding a toast until a pill is expected, a hook for the bar's measured footprint, a desktop dock for mail's compose chip, a prop that forces the toast's layout, and a per-part fade in `motion.css`.

## Working on the kit

```bash
npm install
npm run typecheck
npm test
npm run build
```

Commit `dist/` with the source change that produced it. Apps install from GitHub and never build, so a stale `dist/` ships the old code. `npm run check:dist` rebuilds and fails if the result differs from what is committed.

The component tests run the real Base UI parts in jsdom, on the pinned 1.9.0. That is the floor of the peer range and the version every app ships, so there is no second Base UI to run against, and the `base-ui-next` install and its script went in 0.11. When an app moves past 1.9.0, install the newer one as `base-ui-next` (`npm i -D base-ui-next@npm:@base-ui/react@<version>`) and run `BASE_UI=next npx vitest run src/components`: `vitest.config.ts` still holds the alias. `test/dom.tsx` mounts a tree and sends it clicks and keys, and `withToast()` there puts a toaster on the page as Sonner draws one. `test/color.ts` is the colour math behind every contrast claim. `test/layers.test.ts` pins which sheets sit in the `dalin` layer, and `src/helpers/exports.test.ts` walks the imports of each entry, so the root can't start loading Base UI again unnoticed.

The toast tests run the real `<Toaster>` in jsdom. jsdom has no cascade to trust for `:where()` and `:has()`, so a test that needs to know which of two rules wins weighs their selectors with `test/css.ts`. A test about the docked phone stack that mounts no bar calls `withPill()` from `test/pill.ts`, since the toaster docks only beside a pill.

The dev dependency is pinned to sonner 2.0.7, the version the apps ship. 2.0.8 is installed beside it as `sonner-next`, and `default-kind-next.test.ts` runs the default kind's suite on it. `sheet.test.tsx` drives the sheet's drag with touch events it builds itself. jsdom has no layout, so the test gives the panel a height, answers `elementFromPoint` with the element the finger is on, and writes each event's time. `toaster.test.ts` pins one rule that is easy to break: the toaster re-sends sonner a `pointerup` to clear a stuck flag, and that event must never go out while a pointer is down, or it ends any drag in progress.

## Releasing

The apps install the kit as `github:gomezsj12/dalin-kit#<sha>`, so an app PR can pin a commit that sits on an unmerged kit PR branch. Ship a stack of kit PRs by fast-forwarding, top of the stack first. Push the top PR's head SHA to each base branch in turn, then to `main`:

```bash
git push origin <sha>:refs/heads/<base>
```

GitHub marks every kit PR merged, and kit `main` becomes the exact SHA the apps pin. A merge or squash leaves the pinned SHA off `main`, so every app would need a re-pin and a re-test.

Then collapse each app's PR stack from the top down with `gh pr merge <n> --merge`: the fix PR into its base, the next one down, and the bottom PR into the default branch last. Only the last merge reaches the default branch, so each app builds one production deploy. Bases named `no-preview/` build none.

Production builds queue one at a time, so the last app waits for the others. If the Vercel MCP's `list_deployments` refuses, `vercel list <project> --scope <teamId> --environment production` from the app's checkout works.
