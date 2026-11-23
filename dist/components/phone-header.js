"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cx } from "./cx.js";
import { FamilySwitcher } from "./family-switcher.js";
import { SearchGlyph } from "./icons.js";
import { Wordmark } from "./wordmark.js";
/** The wordmark's size on the phone's title row: the desktop sidebar's own, whose x-height meets the 28px title's. */
export const PHONE_MARK_PX = 32;
/**
 * One plain icon on the phone's title row: a 20px glyph in a 44px target,
 * muted, with no box behind it at rest or when pressed. Pass the glyph as
 * its child. The header's search icon is one of these, drawn for you.
 */
export function PhoneHeaderIcon({ label, className, type = "button", children, ...props }) {
    return (_jsx("button", { type: type, "data-slot": "phone-header-icon", className: cx("dl-phone-icon", className), "aria-label": label, ...props, children: children }));
}
/**
 * The phone's header, the same in all four apps: a title row, and under a
 * large title one muted line.
 *
 * The title is a large title or the app's wordmark. At the right of its row
 * sit at most two plain icons. Search is a magnifying glass, never a field:
 * alone it takes the far right, and beside another icon it sits to that
 * icon's left, so the icon the app already had stays where it was.
 *
 * The header is not sticky and has no fill: the screen scrolls it away with
 * the list, as mail's does. `phone.css` styles it.
 *
 *   <PhoneHeader title="Inbox" line="All mailboxes · 44 unread" onSearch={openSearch} />
 *   <PhoneHeader wordmark="notes" onSearch={openSearch}
 *     action={<PhoneHeaderIcon label="Refresh" onClick={refresh}><RefreshIcon /></PhoneHeaderIcon>} />
 */
export function PhoneHeader({ title, wordmark, switcher = false, line, onSearch, searchLabel = "Search", action, className, }) {
    const icons = onSearch || action;
    return (_jsxs("header", { "data-slot": "phone-header", className: cx("dl-phone-head", className), children: [_jsxs("div", { className: "dl-phone-head-row", children: [wordmark ? (_jsx("h1", { className: "dl-phone-mark", children: switcher ? _jsx(FamilySwitcher, { app: wordmark, size: PHONE_MARK_PX }) : _jsx(Wordmark, { app: wordmark, size: PHONE_MARK_PX }) })) : (_jsx("h1", { className: "dl-phone-title", children: title })), icons ? (_jsxs("div", { className: "dl-phone-head-icons", children: [onSearch ? (_jsx(PhoneHeaderIcon, { label: searchLabel, className: "dl-phone-search-icon", onClick: onSearch, children: _jsx(SearchGlyph, {}) })) : null, action] })) : null] }), line && !wordmark ? _jsx("p", { className: "dl-phone-line", children: line }) : null] }));
}
//# sourceMappingURL=phone-header.js.map