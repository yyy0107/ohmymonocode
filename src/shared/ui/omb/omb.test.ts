// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";

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

function key(target: Element, name: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });
}

it("moves segmented selection with arrows, skipping disabled options", () => {
  const onChange = vi.fn();
  act(() =>
    root.render(
      createElement(SegmentedControl<"a" | "b" | "c">, {
        label: "Mode",
        value: "a",
        onChange,
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true },
          { value: "c", label: "C" },
        ],
      }),
    ),
  );
  const radios = host.querySelectorAll('[role="radio"]');
  expect(radios[0]?.getAttribute("tabindex")).toBe("0");
  expect(radios[2]?.getAttribute("tabindex")).toBe("-1");
  key(radios[0]!, "ArrowRight");
  expect(onChange).toHaveBeenLastCalledWith("c");
  key(radios[0]!, "ArrowLeft");
  expect(onChange).toHaveBeenLastCalledWith("c");
});

it("wraps tab selection and supports Home/End", () => {
  const onSelect = vi.fn();
  act(() =>
    root.render(
      createElement(Tabs, {
        label: "Views",
        selected: "one",
        onSelect,
        items: [
          { id: "one", label: "One" },
          { id: "two", label: "Two" },
          { id: "three", label: "Three" },
        ],
      }),
    ),
  );
  const list = host.querySelector('[role="tablist"]')!;
  key(list, "ArrowLeft");
  expect(onSelect).toHaveBeenLastCalledWith("three");
  key(list, "End");
  expect(onSelect).toHaveBeenLastCalledWith("three");
  key(list, "ArrowRight");
  expect(onSelect).toHaveBeenLastCalledWith("two");
  expect(host.querySelector('[aria-selected="true"]')?.textContent).toBe("One");
});
