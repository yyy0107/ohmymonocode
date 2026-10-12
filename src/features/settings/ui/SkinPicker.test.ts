// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SkinPicker } from "./SkinPicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it("offers Automatic, the nine skins and Classic, with roving focus", () => {
  const onChange = vi.fn();
  act(() => root.render(createElement(SkinPicker, { value: "auto", onChange })));
  const radios = [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  expect(radios.map((radio) => radio.dataset.skinChoice)).toEqual([
    "auto", "midnight", "atelier", "foundry", "lagoon", "graphite", "linen", "dusk", "daylight", "meadow", "classic",
  ]);
  expect(radios.filter((radio) => radio.tabIndex === 0)).toHaveLength(1);
  // Each named preview opens its own skin scope.
  expect(radios[4]!.querySelector('[data-skin="lagoon"]')).not.toBeNull();
  act(() => {
    radios[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  });
  expect(onChange).toHaveBeenLastCalledWith("classic");
  act(() => radios[7]!.click());
  expect(onChange).toHaveBeenLastCalledWith("dusk");
});
