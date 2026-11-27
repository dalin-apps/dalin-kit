import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx.js";
import { fillLevel, fillPercent, fillWord, type FillLevel } from "../helpers/fill-level.js";

export type MeterProps = {
  /** How full, as a fraction from 0 to 1. Out of range is held to the nearest end. */
  share: number;
  /** The meter's name for a screen reader: "dalin space, used". */
  label: string;
  /** What it reads as when a percent says too little: "620 MB of 1 GB". */
  valueText?: string;
  /**
   * The fill's colour while nothing is wrong, for a meter that measures one
   * source: that source's own colour. Without it the fill is the app's
   * accent. The warning colours replace it from 80%.
   */
  color?: string;
  /** False for a meter where full is no warning: a cache that is meant to fill. */
  warns?: boolean;
  /**
   * The thin meter: a 4px track, a tick where amber starts, and the percent
   * beside it in the fill's colour. It is the look picked for drive's
   * storage card. Without it the meter is the 6px bar of a settings row.
   */
  thin?: boolean;
  className?: string;
};

/** What a level of a meter that doesn't warn reads as: always fine. */
function levelOf(share: number, warns: boolean): FillLevel {
  return warns ? fillLevel(share) : "ok";
}

/**
 * How full something is, as one bar.
 *
 * The four apps each had a meter, and they had drifted: drive warned at 80%
 * and 95%, the other three went red at 90%, and drive's status bar never
 * changed colour at all. This is the one meter, on drive's thresholds
 * (`fillLevel`), with a name a screen reader can say.
 *
 * An empty place draws no fill. A place holding anything draws at least a
 * sliver, so "empty" and "nearly empty" never look the same.
 *
 * `data.css` styles it.
 */
export function Meter({ share, label, valueText, color, warns = true, thin = false, className }: MeterProps): ReactNode {
  const held = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const percent = fillPercent(held);
  const level = levelOf(held, warns);
  const style = color ? ({ "--dl-meter-c": color } as CSSProperties) : undefined;
  return (
    <span
      data-slot="meter"
      className={cx("dl-meter", thin && "dl-meter--thin", className)}
      data-level={level === "ok" ? undefined : level}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText ?? `${percent} percent`}
      aria-label={label}
      style={style}
    >
      <span className="dl-meter-track">
        {held > 0 ? <span className="dl-meter-fill" style={{ width: `${Math.max(1, held * 100)}%` }} /> : null}
        {thin && warns ? <span className="dl-meter-tick" /> : null}
      </span>
      {thin ? (
        <span className="dl-meter-pct" aria-hidden="true">
          {held > 0 && held < 0.005 ? "<1%" : `${percent}%`}
        </span>
      ) : null}
    </span>
  );
}

export type MeterWordProps = {
  /** The same fraction its meter was given. */
  share: number | null | undefined;
  className?: string;
};

/**
 * The word beside a meter: "Nearly full" from 80%, "Full" from 95%, and
 * nothing before that. It wears the level's colour, lifted far enough to
 * read as small text on a card.
 */
export function MeterWord({ share, className }: MeterWordProps): ReactNode {
  const level = fillLevel(share);
  const word = fillWord(level);
  if (!word) return null;
  return (
    <span data-slot="meter-word" className={cx("dl-meter-word", className)} data-level={level}>
      {word}
    </span>
  );
}
