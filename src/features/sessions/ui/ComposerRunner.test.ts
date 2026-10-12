// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ComposerRunner } from "./ComposerRunner";
import { startMotionClock, stopMotionClock, finishMotion } from "../../../../tests/helpers/sharedMotionClock";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); stopMotionClock(); });
function runnerFixture(reduced = false) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn()}));
  startMotionClock();
  const box = document.createElement("div"), host = document.createElement("div");
  const measure = vi.spyOn(box, "getBoundingClientRect").mockReturnValue({left: 20, top: 400, width: 300, height: 80} as DOMRect);
  document.body.append(box, host); const root = createRoot(host); const boxRef = {current: box}; const onExited = vi.fn();
  const render = (enabled = true, busy = true) => act(() => root.render(createElement(ComposerRunner, {boxRef, cwd: "/work/project", busy, enabled, onExited})));
  return {render, measure, onExited, dispose: () => { act(() => root.unmount()); box.remove(); host.remove(); }};
}
it("keeps the decorative mascot static without measuring each streamed chunk", () => {
  const runner = runnerFixture();
  try { runner.render(); runner.render(); runner.render(); expect(runner.measure).toHaveBeenCalledOnce(); expect(document.querySelector("[data-composer-runner]")).not.toBeNull(); }
  finally { runner.dispose(); }
});
it("finishes a hidden completed turn once", () => {
  const runner = runnerFixture();
  try { runner.render(); runner.render(false, false); expect(runner.onExited).toHaveBeenCalledOnce(); runner.render(false, false); expect(runner.onExited).toHaveBeenCalledOnce(); }
  finally { runner.dispose(); }
});
it("completes its Motion exit once", async () => {
  const runner = runnerFixture();
  try { runner.render(); runner.render(true, false); await act(async () => { await finishMotion(); }); expect(runner.onExited).toHaveBeenCalledOnce(); }
  finally { runner.dispose(); }
});
it("shows a static reduced-motion mascot and completes immediately", () => {
  const runner = runnerFixture(true);
  try { runner.render(); expect(document.querySelector("[data-composer-runner]")).not.toBeNull(); runner.render(true, false); expect(runner.onExited).toHaveBeenCalledOnce(); }
  finally { runner.dispose(); }
});
