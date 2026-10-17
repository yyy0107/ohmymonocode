// @vitest-environment happy-dom
import { act, createElement, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useListReorderMotion } from "./useListReorderMotion";

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("../motion/useMotionPreference", () => ({
  useMotionPreference: () => preference.reduced,
}));

let host: HTMLDivElement;
let root: Root;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;

function List({ order, animate }: { order: string[]; animate: boolean }) {
  const list = useRef<HTMLDivElement>(null);
  useListReorderMotion(list, order, "data-card", animate);
  return createElement("div", { ref: list }, order.map((id) =>
    createElement("div", { key: id, "data-card": id }, id),
  ));
}

function render(order: string[], animate = true) {
  act(() => root.render(createElement(List, { order, animate })));
}

// Let the real AutoAnimate MutationObserver process the React DOM commit.
const mutations = () => new Promise((resolve) => setTimeout(resolve, 10));
function nextPaint() {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(performance.now())));
}

beforeEach(() => {
  preference.reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(800);
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const index = this.parentElement ? [...this.parentElement.children].indexOf(this) : 0;
    return new DOMRect(0, index * 50, 200, 40);
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("does not replay a drag commit, then animates later programmatic sorting", async () => {
  render(["environment", "changes", "context"]);
  // AutoAnimate initializes its position cache asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 300));
  const animate = vi.spyOn(Element.prototype, "animate");
  render(["environment", "changes", "context"], false);
  render(["context", "environment", "changes"]);
  await mutations();
  expect(animate).not.toHaveBeenCalled();
  expect([...host.querySelectorAll("[data-card]")].map((node) => node.textContent))
    .toEqual(["context", "environment", "changes"]);

  nextPaint();
  render(["changes", "context", "environment"]);
  await mutations();
  expect(animate).toHaveBeenCalled();
  expect(animate.mock.calls.some(([keyframes]) =>
    Array.isArray(keyframes) && keyframes[0]?.transform === "translate(0px, 100px)",
  )).toBe(true);
});

it("keeps animation disabled when a second drag starts before the next paint", async () => {
  render(["environment", "changes"]);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const animate = vi.spyOn(Element.prototype, "animate");
  render(["environment", "changes"], false);
  render(["changes", "environment"]);
  render(["changes", "environment"], false);
  nextPaint();
  render(["environment", "changes"], false);
  await mutations();
  expect(animate).not.toHaveBeenCalled();

  render(["environment", "changes"]);
  act(() => root.render(null));
  expect(frames.size).toBe(0);
});

it("cancels pending resumption when reduced motion is enabled", async () => {
  render(["environment", "changes"]);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const animate = vi.spyOn(Element.prototype, "animate");
  render(["environment", "changes"], false);
  render(["changes", "environment"]);
  preference.reduced = true;
  render(["changes", "environment"]);
  nextPaint();
  render(["environment", "changes"]);
  await mutations();
  expect(animate).not.toHaveBeenCalled();
});
