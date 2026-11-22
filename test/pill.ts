/**
 * A pill on the page, for a test file that mounts the <Toaster> alone.
 *
 * The <Toaster> docks phone toasts only while a bottom bar has said its pill
 * is there (its swipe, its band or its dock: toast-dock.ts). An app mounts
 * one of those with the bar; a test that is about the docked stack and has
 * no bar calls this at the top of the file.
 */
import { afterEach, beforeEach } from "vitest";
import { registerToastPill } from "../src/toast/toast-dock.js";

export function withPill(): void {
  let leave: (() => void) | undefined;
  beforeEach(() => {
    leave = registerToastPill();
  });
  afterEach(() => {
    leave?.();
    leave = undefined;
  });
}
