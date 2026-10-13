// @vitest-environment happy-dom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSurfaceVisibility } from "../../shared/ui/SurfaceVisibility";
import { applyReducedMotion } from "../../shared/lib/reducedMotion";
import { WorkspaceToolsDock } from "./WorkspaceToolsDock";
import type { SidebarProps } from "./Sidebar.types";

const lifecycle = vi.hoisted(() => ({ mounts: 0, unmounts: 0 }));
vi.mock("./ProjectToolsPanel", () => ({
  ProjectToolsPanel: function Tools({ tab }: { tab: "files" | "changes" }) {
    const visible = useSurfaceVisibility();
    useEffect(() => {
      lifecycle.mounts++;
      return () => {
        lifecycle.unmounts++;
      };
    }, []);
    return createElement("input", {
      "data-tools-visible": visible,
      "data-tools-tab": tab,
      defaultValue: "Retained search",
    });
  },
}));
vi.mock("./SidebarTabs", () => ({
  SidebarTabs: () => createElement("span", null, "Files / Changes"),
}));
let root: Root;
let container: HTMLDivElement;
const noop = () => {};
beforeEach(() => {
  lifecycle.mounts = 0;
  lifecycle.unmounts = 0;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  act(() => applyReducedMotion("system"));
  vi.unstubAllGlobals();
});
function render(tab: SidebarProps["tab"], visible = true) {
  const sidebar = {
    cwd: "/repo",
    open: true,
    tab,
    sessions: [],
    busySessionIds: new Set<string>(),
    approvalSessionIds: new Set<string>(),
    status: "idle",
    pending: false,
    onSelectSession: noop,
    onOpenFile: noop,
    onTabChange: noop,
    filesSearchOpen: false,
    onFilesSearchOpenChange: noop,
  } satisfies SidebarProps;
  act(() =>
    root.render(
      createElement(WorkspaceToolsDock, {
        sidebar,
        visible,
        children: createElement("textarea", {
          "aria-label": "Workspace draft",
          defaultValue: "Keep my draft",
        }),
      }),
    ),
  );
}
function finish() {
  const event = new Event("transitionend", { bubbles: true });
  Object.defineProperty(event, "propertyName", {
    value: "grid-template-columns",
  });
  act(() =>
    container.querySelector(".desktop-tools-layout")!.dispatchEvent(event),
  );
}

it("loads tools on demand, retains workspace and search through closing and reversal", () => {
  render("sessions");
  expect(lifecycle.mounts).toBe(0);
  const workspace = container.querySelector("textarea");
  render("files");
  finish();
  const search = container.querySelector<HTMLInputElement>("input")!;
  search.value = "draft query";
  expect(lifecycle.mounts).toBe(1);
  render("sessions");
  const panel = container.querySelector<HTMLElement>("aside")!;
  expect(panel.inert).toBe(true);
  expect(search.dataset.toolsVisible).toBe("false");
  expect(
    container
      .querySelector(".desktop-tools-layout")
      ?.getAttribute("data-fold-state"),
  ).toBe("closing");
  render("files");
  finish();
  expect(search.value).toBe("draft query");
  expect(panel.inert).toBe(false);
  render("sessions");
  finish();
  expect(panel.hidden).toBe(true);
  expect(lifecycle.unmounts).toBe(0);
  expect(container.querySelector("textarea")).toBe(workspace);
});

it("settles immediately when reduced motion changes during closing", () => {
  render("files");
  render("sessions");
  act(() => applyReducedMotion("on"));
  expect(
    container
      .querySelector(".desktop-tools-layout")
      ?.getAttribute("data-fold-state"),
  ).toBe("closed");
  expect(container.querySelector<HTMLElement>("aside")?.hidden).toBe(true);
  expect(container.querySelector("textarea")?.value).toBe("Keep my draft");
});

it("supports keyboard sizing and disables hidden tools while another page is active", () => {
  render("files");
  finish();
  const separator = container.querySelector('[role="separator"]')!;
  act(() =>
    separator.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowLeft",
        shiftKey: true,
      }),
    ),
  );
  expect(
    container.querySelector(".desktop-tools-layout")?.getAttribute("style"),
  ).toContain("336px");
  render("files", false);
  expect(container.querySelector<HTMLElement>("aside")?.inert).toBe(true);
  expect(
    container.querySelector<HTMLInputElement>("input")?.dataset.toolsVisible,
  ).toBe("false");
});

it("retains Changes through its exit and keeps both visited tool states", () => {
  render("changes");
  finish();
  const changes = container.querySelector<HTMLInputElement>(
    '[data-tools-tab="changes"]',
  )!;
  changes.value = "commit draft";
  render("sessions");
  expect(container.querySelector('[data-tools-tab="files"]')).toBeNull();
  expect(container.querySelector('[data-tools-tab="changes"]')).toBe(changes);
  finish();
  render("files");
  finish();
  expect(lifecycle.unmounts).toBe(0);
  render("changes");
  finish();
  expect(changes.value).toBe("commit draft");
  expect(changes.dataset.toolsVisible).toBe("true");
  expect(
    container.querySelector<HTMLInputElement>('[data-tools-tab="files"]')
      ?.dataset.toolsVisible,
  ).toBe("false");
});
