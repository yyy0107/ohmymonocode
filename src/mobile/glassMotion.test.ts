// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyboardMotion } from "./keyboardMotion";
import { installGlassMotion } from "./glassMotion";

const native = vi.hoisted(() => ({ receive: undefined as ((motion: KeyboardMotion) => void) | undefined }));
vi.mock("./keyboardMotion", () => ({
  keyboardTracked: () => true,
  onKeyboardMotion: (receive: (motion: KeyboardMotion) => void) => {
    native.receive = receive;
    return () => { native.receive = undefined; };
  },
}));
let stop: () => void;
let scroller: HTMLElement;
const moving = () => document.documentElement.hasAttribute("data-mobile-glass-motion");
beforeEach(() => {
  vi.useFakeTimers();
  scroller = document.createElement("div");
  document.body.append(scroller);
  stop = installGlassMotion();
});
afterEach(() => {
  stop();
  scroller.remove();
  vi.useRealTimers();
});
describe("glass during motion", () => {
  it("waits for both a continuing scroll and keyboard reversal to finish", () => {
    scroller.dispatchEvent(new Event("scroll"));
    expect(moving()).toBe(true);
    vi.advanceTimersByTime(100);
    scroller.dispatchEvent(new Event("scroll"));
    native.receive!({ height: 300, previous: 0, duration: 250, easing: "linear" });
    vi.advanceTimersByTime(150);
    expect(moving()).toBe(true);
    native.receive!({ height: 0, previous: 300, duration: 200, easing: "linear" });
    vi.advanceTimersByTime(199);
    expect(moving()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(moving()).toBe(false);
  });
  it("ignores hidden pages and zero-duration motion, and cancels on disposal", () => {
    scroller.setAttribute("aria-hidden", "true");
    scroller.dispatchEvent(new Event("scroll"));
    native.receive!({ height: 300, previous: 0, duration: 0, easing: "linear" });
    expect(moving()).toBe(false);
    scroller.removeAttribute("aria-hidden");
    scroller.dispatchEvent(new Event("scroll"));
    expect(moving()).toBe(true);
    stop();
    expect(moving()).toBe(false);
    expect(native.receive).toBeUndefined();
    vi.runAllTimers();
    scroller.dispatchEvent(new Event("scroll"));
    expect(moving()).toBe(false);
  });
});
