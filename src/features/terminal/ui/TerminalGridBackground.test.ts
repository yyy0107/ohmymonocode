// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startMotionClock, stopMotionClock, motionFrame } from "../../../../tests/helpers/sharedMotionClock";
import { TerminalGridBackground } from "./TerminalGridBackground";

const { arcades } = vi.hoisted(() => ({
  arcades: [] as Array<{
    step: ReturnType<typeof vi.fn>;
    takeControl: ReturnType<typeof vi.fn>;
  }>,
}));
vi.mock("../arcade/gridGames", () => ({
  SLIDE_HOLD_MS: 16_000,
  stepSlider: (index: number) => ({ index: 1 - index, dir: 1 }),
  GRID_GAMES: ["pacman", "snake"].map((id) => ({
    id,
    label: id,
    playLabel: id,
    idleDim: 0.5,
    lives: true,
    create: () => {
      let controlled = false;
      const arcade = {
        resize: vi.fn(),
        step: vi.fn(),
        takeControl: vi.fn(() => {
          controlled = true;
        }),
        releaseControl: () => {
          controlled = false;
        },
        controlled: () => controlled,
        setMode: vi.fn(),
        steer: vi.fn(),
        score: () => 0,
        lives: () => 3,
        stamp: (out: Float32Array) => {
          out[0] = 1;
        },
        fade: () => 1,
        logoPickup: () => null,
        sprites: () => [],
        speechBubble: () => null,
      };
      arcades.push(arcade);
      return arcade;
    },
  })),
}));

let root: Root;
let host: HTMLDivElement;
let now: number;
let intersections: Map<Element, (visible: boolean) => void>;
let mediaChanged: () => void;
let reduced: boolean;
let measure: ReturnType<typeof vi.spyOn>;
const contexts: Array<{
  clearRect: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
}> = [];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  arcades.length = 0;
  contexts.length = 0;
  now = 1000;
  reduced = false;
  intersections = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_event: string, callback: () => void) => {
      mediaChanged = callback;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(element: Element) {
        intersections.set(element, (isIntersecting) =>
          this.callback(
            [{ target: element, isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
        );
      }
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "Path2D",
    class {
      rect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
    const ctx = {
      clearRect: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      setTransform: vi.fn(),
    };
    contexts.push(ctx);
    return ctx as unknown as CanvasRenderingContext2D;
  });
  measure = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function () {
      const hidden = (this as HTMLElement).closest(
        '[data-pane-visible="false"]',
      );
      return { width: hidden ? 0 : 1000, height: hidden ? 0 : 192 } as DOMRect;
    });
  startMotionClock();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  stopMotionClock();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function tick(count = 1) {
  for (let i = 0; i < count; i++) {
    now += 33;
    act(() => motionFrame(33));
  }
}

it("keeps passive decoration still when 39 tab panes stay mounted", () => {
  act(() =>
    root.render(
      createElement(
        "div",
        {},
        ...Array.from({ length: 39 }, (_, index) =>
          createElement(
            "div",
            { key: index, "data-pane-visible": String(index === 0) },
            createElement(TerminalGridBackground, { visible: index === 0 }),
          ),
        ),
      ),
    ),
  );
  measure.mockClear();
  for (const ctx of contexts) {
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();
    ctx.strokeRect.mockClear();
  }
  tick(10);
  const paints = contexts.reduce(
    (sum, ctx) => sum + ctx.clearRect.mock.calls.length,
    0,
  );
  const cellStrokes = contexts.reduce(
    (sum, ctx) => sum + ctx.strokeRect.mock.calls.length,
    0,
  );
  expect(measure).not.toHaveBeenCalled();
  expect(paints).toBe(0);
  expect(cellStrokes).toBe(0);
  for (const arcade of arcades) expect(arcade.step).not.toHaveBeenCalled();
});

it("pauses hidden panes, scrolled-off backgrounds and hidden windows, preserving game state on return", () => {
  const render = (visible: boolean) => act(() => root.render(createElement(TerminalGridBackground, { visible })));
  render(true);
  const grid = [...intersections.keys()][0]!;
  act(() => host.querySelector<HTMLButtonElement>("button")!.click()); tick(2);
  expect(arcades[0]!.takeControl).toHaveBeenCalledOnce();
  expect(arcades[0]!.step).toHaveBeenCalled();
  render(false); let previousTicks = arcades[0]!.step.mock.calls.length; tick(5);
  expect(arcades[0]!.step).toHaveBeenCalledTimes(previousTicks);
  render(true); tick(2);
  expect(arcades).toHaveLength(2); expect(arcades[0]!.step.mock.calls.length).toBeGreaterThan(previousTicks);
  act(() => intersections.get(grid)!(false)); previousTicks = arcades[0]!.step.mock.calls.length; tick(5);
  expect(arcades[0]!.step).toHaveBeenCalledTimes(previousTicks);
  act(() => intersections.get(grid)!(true)); tick(2); expect(arcades[0]!.step.mock.calls.length).toBeGreaterThan(previousTicks);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange"))); previousTicks = arcades[0]!.step.mock.calls.length; tick(5);
  expect(arcades[0]!.step).toHaveBeenCalledTimes(previousTicks);
  hidden.mockReturnValue(false); act(() => document.dispatchEvent(new Event("visibilitychange"))); tick(2);
  expect(arcades[0]!.step.mock.calls.length).toBeGreaterThan(previousTicks);
  expect(arcades[0]!.takeControl).toHaveBeenCalledOnce();
});

it("slides to the selected board without running passive game simulations", () => {
  act(() => root.render(createElement(TerminalGridBackground)));
  act(() => host.querySelector<HTMLButtonElement>('[aria-label="snake"]')!.click());
  tick(25);
  expect(arcades[0]!.step).not.toHaveBeenCalled(); expect(arcades[1]!.step).not.toHaveBeenCalled();
  act(() => host.querySelector<HTMLButtonElement>("button")!.click()); tick(3);
  expect(arcades[0]!.step).not.toHaveBeenCalled(); expect(arcades[1]!.step).toHaveBeenCalled();
  expect(arcades[1]!.takeControl).toHaveBeenCalledOnce();
});

it("keeps reduced-motion decoration static while explicit gameplay remains interactive", () => {
  reduced = true;
  act(() => root.render(createElement(TerminalGridBackground)));
  expect(contexts[0]!.clearRect).toHaveBeenCalled();
  expect(arcades[0]!.step).not.toHaveBeenCalled();
  act(() => host.querySelector<HTMLButtonElement>("button")!.click());
  tick(3);
  expect(arcades[0]!.step).toHaveBeenCalled();
  expect(arcades[0]!.takeControl).toHaveBeenCalledOnce();
  act(() =>
    [...host.querySelectorAll<HTMLButtonElement>("button")].at(-1)!.click(),
  );
  const ticks = arcades[0]!.step.mock.calls.length;
  tick(3); expect(arcades[0]!.step).toHaveBeenCalledTimes(ticks);
  reduced = false;
  act(() => mediaChanged()); tick(3);
  expect(arcades[0]!.step).toHaveBeenCalledTimes(ticks);
});
