import autoAnimate, { type AnimationController } from "@formkit/auto-animate";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { autoAnimateOptions } from "../motion/tokens";
import { useMotionPreference } from "../motion/useMotionPreference";

function destroyController(controller: AnimationController) {
  // A cancelled Web Animation rejects `finished`; consume it before disposal.
  for (const animation of controller.parent.getAnimations?.({ subtree: true }) ?? []) {
    void animation.finished.catch(() => {});
  }
  if (controller.destroy) controller.destroy();
  else controller.disable();
}

/** Animate list insertions, removals and sorting, including nested row groups. */
export function useListReorderMotion(
  root: RefObject<HTMLElement | null>,
  order: readonly string[],
  attribute: string,
  animate = true,
) {
  const controllers = useRef(new Map<HTMLElement, AnimationController>());
  const reduced = useMotionPreference();
  const key = order.join("\0");
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const parents = new Set<HTMLElement>([element]);
    for (const row of element.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
      if (row.parentElement) parents.add(row.parentElement);
    }
    for (const [parent, controller] of controllers.current) {
      if (!parents.has(parent)) {
        destroyController(controller);
        controllers.current.delete(parent);
      }
    }
    const resume: AnimationController[] = [];
    for (const parent of parents) {
      let controller = controllers.current.get(parent);
      if (!controller) {
        // AutoAnimate skips observer setup when the OS currently reduces motion.
        // Wait to create it until animation is allowed so a later policy change
        // can enable a real controller rather than a permanently inert one.
        if (reduced) continue;
        controller = autoAnimate(parent, autoAnimateOptions);
        controllers.current.set(parent, controller);
      }
      if (animate && !reduced) {
        if (!controller.isEnabled()) resume.push(controller);
      }
      else controller.disable();
    }
    // A drag can clear its active flag and commit the new DOM order together.
    // Keep AutoAnimate disabled until its MutationObserver has recorded that
    // order, otherwise it replays the move that the drag already animated.
    if (!resume.length) return;
    const frame = requestAnimationFrame(() => {
      for (const controller of resume) controller.enable();
    });
    return () => cancelAnimationFrame(frame);
  }, [root, key, attribute, animate, reduced]);
  useLayoutEffect(() => () => {
    for (const controller of controllers.current.values()) destroyController(controller);
    controllers.current.clear();
  }, []);
}
