import { keyboardTracked, onKeyboardMotion } from "./keyboardMotion";

const MOTION_ATTRIBUTE = "data-mobile-glass-motion";
const SCROLL_SETTLE_MS = 120;

/** Keep ordinary blur while the backdrop is moving under a glass surface. */
export function installGlassMotion(root = document.documentElement) {
  let scrolling = false;
  let keyboard = false;
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  let keyboardTimer: ReturnType<typeof setTimeout> | undefined;
  const update = () => {
    const moving = scrolling || keyboard;
    if (root.hasAttribute(MOTION_ATTRIBUTE) !== moving)
      root.toggleAttribute(MOTION_ATTRIBUTE, moving);
  };
  const scroll = (event: Event) => {
    if (document.hidden || (event.target instanceof Element &&
      event.target.closest('[hidden], [aria-hidden="true"]'))) return;
    scrolling = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrolling = false; update(); }, SCROLL_SETTLE_MS);
    update();
  };
  const unsubscribe = onKeyboardMotion((motion) => {
    clearTimeout(keyboardTimer);
    keyboard = !document.hidden && motion.duration > 0 && motion.height !== motion.previous;
    if (keyboard)
      keyboardTimer = setTimeout(() => { keyboard = false; update(); }, motion.duration);
    update();
  });
  // iOS resizes the visual viewport instead of using the Android IME bridge.
  const resize = (event: Event) => { if (!keyboardTracked()) scroll(event); };
  const reset = () => {
    if (!document.hidden) return;
    clearTimeout(scrollTimer);
    clearTimeout(keyboardTimer);
    scrolling = keyboard = false;
    update();
  };
  root.addEventListener("scroll", scroll, { capture: true, passive: true });
  window.visualViewport?.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", reset);
  return () => {
    clearTimeout(scrollTimer);
    clearTimeout(keyboardTimer);
    unsubscribe();
    root.removeEventListener("scroll", scroll, true);
    window.visualViewport?.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", reset);
    root.removeAttribute(MOTION_ATTRIBUTE);
  };
}
