export { INPUT_ATTR, inputForKey, startedFromKeyboard, watchInputModality } from "./input-modality.js";
export {
  LEAVING_ATTR,
  endFades,
  leaveInPlace,
  shouldLeave,
  watchLeaving,
  type LeavingOptions,
} from "./leaving.js";
export { isMacPlatform, shortcutLabel, shortcutLabelFor, tipText } from "./shortcut-label.js";
export { TipKey } from "./tip-key.js";
export { MOTION_ATTR, reducesMotion, setMotionAttr, setMotionReader, systemReducesMotion, type MotionChoice } from "./motion.js";
export { SEG_SLIDE_ATTR, placeSegLift, slideSegLift } from "./seg-slide.js";
export { TIP_DELAY_MS, TIP_GROUP_MS } from "./tip-delay.js";
export { TAB_SETTLE_CLASS, settleTab } from "./tab-settle.js";
export {
  PRESSED_ATTR,
  PRESS_CLASS,
  PRESS_WATCH_ATTR,
  RELEASED_ATTR,
  pressTarget,
  watchPress,
  type PressOptions,
} from "./press.js";
export { FILL_FULL, FILL_HIGH, fillLevel, fillPercent, fillWord, type FillLevel } from "./fill-level.js";
