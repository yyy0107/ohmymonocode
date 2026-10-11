import { advanceFollowMotion, FOLLOW_MOTION_FREQUENCY } from "../../../shared/lib/dampedMotion";

// A send reads as one smooth scroll: the new message enters from below
// together with everything above it, then settles from a pending tint to full
// strength. Nothing flies out of the composer or changes shape.

const SLIDE_EASING = "linear";
const PENDING_OPACITY = 0.5;
const SETTLE_MS = 420;
const CONFIRM_MS = 140;

/** Sample the scroll curve for compositor playback, also smooth at 120Hz. */
function slideMotion(distance: number): { frames: Keyframe[]; duration: number } {
  const positions = [distance];
  const seconds = 1 / 120;
  let state = { position: distance, velocity: 0, acceleration: 0, frequency: FOLLOW_MOTION_FREQUENCY };
  do {
    state = advanceFollowMotion(state, 0, seconds);
    positions.push(Math.max(0, state.position));
  } while (Math.abs(state.position) >= 0.5 || Math.abs(state.velocity) >= 5);
  positions[positions.length - 1] = 0;
  return {
    frames: positions.map(position => ({ transform: `translateY(${position.toFixed(2)}px)` })),
    duration: (positions.length - 1) * seconds * 1000,
  };
}

export type PromptSlide = {
  /** The message's slide first; companion animations share its clock. */
  animations: Animation[];
  duration: number;
  easing: string;
  /** Resolves when the message lands or its motion is cancelled. */
  finished: Promise<void>;
  /** Cancels all motion; safe to call repeatedly. */
  release: () => void;
  /**
   * Moves replacement elements (the Host's recorded copy of a sending
   * message) on the running slide's clock. False once the slide is over.
   */
  follow: (parts: HTMLElement[]) => boolean;
};

/** A recorded message replaces its sending copy: lift it to full strength. */
export function confirmPrompt(parts: (HTMLElement | null | undefined)[]) {
  for (const part of parts) {
    if (!part || typeof part.animate !== "function") continue;
    part.animate([{ opacity: PENDING_OPACITY }, { opacity: 1 }], {
      duration: CONFIRM_MS,
      easing: "ease-out",
    });
  }
}

/**
 * Slides the sent message (its bubble and any attachments) and the content
 * above it up by `distance` on one clock. Unless it is still sending (and
 * keeps its pending tint until recorded), the message also fades from that
 * tint to full opacity.
 */
export function slidePromptIn(
  message: (HTMLElement | null | undefined)[],
  distance: number,
  earlier: HTMLElement[] = [],
  { settle = true }: { settle?: boolean } = {},
): PromptSlide | undefined {
  const parts = message.filter((part): part is HTMLElement => !!part);
  if (!parts.length) return undefined;
  const dy = distance > 1 ? distance : 0;
  const { frames: slide, duration } = slideMotion(dy);
  const startTime = document.timeline?.currentTime;
  const animations: Animation[] = [];
  const animate = (element: HTMLElement, frames: Keyframe[], ms: number, easing: string) => {
    const animation = element.animate(frames, { duration: ms, easing });
    if (typeof startTime === "number") animation.startTime = startTime;
    animations.push(animation);
    return animation;
  };
  const moved = dy ? [...parts, ...earlier] : [];
  for (const element of moved) animate(element, slide, duration, SLIDE_EASING);
  if (settle) for (const part of parts) {
    animate(part, [
      { opacity: PENDING_OPACITY },
      { opacity: PENDING_OPACITY, offset: 0.6 },
      { opacity: 1 },
    ], SETTLE_MS, "ease-out");
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    for (const animation of animations) animation.cancel();
  };
  if (!animations.length) return undefined;
  const lead = animations[0];
  let landed = false;
  // The animations hold no fill, so landing needs no cleanup.
  const finished = lead.finished.then(() => {}, () => {}).then(() => {
    landed = true;
  });
  const follow = (next: HTMLElement[]) => {
    if (released || landed || !dy) return false;
    for (const element of next) {
      const animation = element.animate(slide, { duration, easing: SLIDE_EASING });
      if (lead.startTime !== null) animation.startTime = lead.startTime;
      animations.push(animation);
    }
    return true;
  };
  return { animations, duration, easing: SLIDE_EASING, finished, release, follow };
}
