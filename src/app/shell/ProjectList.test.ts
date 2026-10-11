// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectList } from "./ProjectList";
import {
  configureSharedHost,
  rememberRemoteProject,
  remoteProjectFor,
  sessionUsesHost,
} from "../../features/connections/model/remoteProjects";
import {
  useRemoteMachineOnline,
  useRemoteMachines,
} from "../../features/connections/model/connections";
import { useProjectDiffStats } from "../../features/source-control/hooks/useProjectDiffStats";
import {
  saveProjectGroups,
  setProjectGroupAssignment,
} from "../../features/projects/model/projectGroups";
import {
  loadPinnedProjects,
  loadProjectRailOrder,
  savePinnedProjects,
  saveProjectRailOrder,
} from "../../features/projects/model/recents";
import { useAnimatedReorder } from "../../shared/hooks/useAnimatedReorder";
import { SurfaceVisibilityContext } from "../../shared/ui/SurfaceVisibility";

const { reorderPointerDown, reorderState } = vi.hoisted(() => ({
  reorderPointerDown: vi.fn(),
  reorderState: { draggingId: null as string | null },
}));
vi.mock("../../shared/hooks/useAnimatedReorder", () => ({
  useAnimatedReorder: vi.fn((ids: string[]) => ({
    draggingId: ids.includes(reorderState.draggingId ?? "")
      ? reorderState.draggingId
      : null,
    setItemRef: vi.fn(),
    onItemPointerDown: reorderPointerDown,
    consumeClick: () => false,
  })),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => null),
  convertFileSrc: (path: string) => path,
}));
vi.mock("../../features/source-control/hooks/useProjectDiffStats", () => ({
  useProjectDiffStats: vi.fn(() => null),
}));
vi.mock(
  "../../features/connections/model/connections",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../features/connections/model/connections")
    >()),
    useRemoteMachines: vi.fn(),
    useRemoteMachineOnline: vi.fn(),
  }),
);

const machine = {
  id: "computer",
  environmentId: "environment",
  name: "wy-ubuntu",
  endpoint: "http://127.0.0.1:3774",
};
const project = { id: "project", cwd: "/home/me/repo", name: "repo" };
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  configureSharedHost(undefined, []);
  reorderPointerDown.mockClear();
  vi.mocked(useAnimatedReorder).mockClear();
  reorderState.draggingId = null;
  vi.mocked(useProjectDiffStats).mockClear();
  vi.mocked(useRemoteMachines)
    .mockReset()
    .mockReturnValue({ machines: [machine], loaded: true });
  vi.mocked(useRemoteMachineOnline).mockReset().mockReturnValue(true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  configureSharedHost(undefined, []);
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function renderRail(path: string) {
  await act(async () =>
    root.render(
      createElement(ProjectList, {
        cwd: path,
        recents: [{ path, openedAt: 1 }],
        onSelectProject: vi.fn(),
        onOpenProject: vi.fn(),
      }),
    ),
  );
}

it.each([true, false])(
  "shows a local folder without remote decoration (registered: %s)",
  async (registered) => {
    configureSharedHost(
      machine.environmentId,
      registered ? [project] : [],
      machine.id,
    );
    await renderRail(project.cwd);

    const card = container.querySelector<HTMLButtonElement>(
      'button[aria-current="true"]',
    )!;
    expect(card).not.toBeNull();
    expect(card.textContent).toBe("repo");
    expect(card.hasAttribute("title")).toBe(false);
    expect(card.getAttribute("aria-description")).toContain(project.cwd);
    expect(card.querySelector('[role="img"]')).toBeNull();
    expect(useRemoteMachines).toHaveBeenCalledWith(false);
    expect(useRemoteMachineOnline).toHaveBeenCalledWith(undefined);
    expect(remoteProjectFor(project.cwd)).toMatchObject({ local: true });
    expect(sessionUsesHost({ cwd: project.cwd })).toBe(true);
  },
);

it("keeps the machine label and connection badge for a remote path", async () => {
  const remote = rememberRemoteProject(machine.environmentId, project);
  await renderRail(remote.key);

  const card = container.querySelector<HTMLButtonElement>(
    'button[aria-current="true"]',
  )!;
  expect(card.textContent).toBe("repowy-ubuntu");
  expect(card.hasAttribute("title")).toBe(false);
  expect(card.getAttribute("aria-description")).toContain(`${project.cwd}`);
  expect(
    card.querySelector('[role="img"][aria-label="Connected"]'),
  ).not.toBeNull();
  expect(useRemoteMachines).toHaveBeenCalledWith(true);
  expect(useRemoteMachineOnline).toHaveBeenCalledWith(machine.id);
});

it("keeps the connection badge for a remote path whose machine is unavailable", async () => {
  vi.mocked(useRemoteMachines).mockReturnValue({ machines: [], loaded: true });
  const remote = rememberRemoteProject(machine.environmentId, project);
  await renderRail(remote.key);

  expect(
    container.querySelector(
      '[role="img"][aria-label="Machine not connected on this computer"]',
    ),
  ).not.toBeNull();
});

async function renderTree(
  overrides: Partial<ComponentProps<typeof ProjectList>> = {},
) {
  const props: ComponentProps<typeof ProjectList> = {
    cwd: "/work/alpha",
    recents: [
      { path: "/work/alpha", openedAt: 3 },
      { path: "/work/beta", openedAt: 2 },
      { path: "/work/gamma", openedAt: 1 },
    ],
    expandedPaths: new Set(["/work/alpha", "/work/beta"]),
    onSelectProject: vi.fn(),
    onToggleProject: vi.fn(),
    onNewInProject: vi.fn(),
    onOpenProject: vi.fn(),
    renderProjectChildren: (path) =>
      createElement("button", { "data-session": path }, `Session in ${path}`),
    ...overrides,
  };
  await act(async () => root.render(createElement(ProjectList, props)));
  return props;
}

it("shows names for every project and independent children for multiple expanded projects", async () => {
  await renderTree({
    needsApprovalPaths: ["/work/beta/"],
    busyPaths: ["/work/alpha"],
  });
  expect(container.querySelector('[data-project-list="tree"]')).not.toBeNull();
  expect(container.querySelectorAll("[data-project-header]")).toHaveLength(3);
  expect(container.querySelectorAll("[data-project-children]")).toHaveLength(2);
  expect(
    container.querySelector('[data-project-children="/work/gamma"]'),
  ).toBeNull();
  expect(
    container.querySelectorAll(
      '[aria-expanded="true"][title="Collapse project"]',
    ),
  ).toHaveLength(2);
  expect(
    container.querySelector(
      '[data-project-path="/work/beta"] [aria-label="Needs approval"]',
    ),
  ).not.toBeNull();
  expect(
    container.querySelector('[data-project-path="/work/alpha"] button[title]')
      ?.title,
  ).toBe("Collapse project");
  expect(useProjectDiffStats).toHaveBeenCalledWith("/work/alpha", true);
  expect(useProjectDiffStats).toHaveBeenCalledWith("/work/beta", false);
  expect(useProjectDiffStats).toHaveBeenCalledWith("/work/gamma", false);
});

it("keeps expand, select, new session and child actions independent", async () => {
  const childClick = vi.fn();
  const props = await renderTree({
    renderProjectChildren: (path) =>
      createElement(
        "button",
        { "data-session": path, onClick: childClick },
        "A session",
      ),
  });
  const beta = container.querySelector('[data-project-path="/work/beta"]')!;
  act(() => {
    beta
      .querySelector<HTMLButtonElement>('button[title="Collapse project"]')!
      .click();
    beta
      .querySelector<HTMLButtonElement>(
        'button[data-project-select="/work/beta"]',
      )!
      .click();
    beta
      .querySelector<HTMLButtonElement>('button[title="New session in beta"]')!
      .click();
    const child = beta.querySelector<HTMLButtonElement>("[data-session]")!;
    child.click();
    child.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    child.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
  });
  expect(props.onToggleProject).toHaveBeenCalledExactlyOnceWith("/work/beta");
  expect(props.onSelectProject).toHaveBeenCalledExactlyOnceWith("/work/beta");
  expect(props.onNewInProject).toHaveBeenCalledExactlyOnceWith("/work/beta");
  expect(childClick).toHaveBeenCalledOnce();
  expect(reorderPointerDown).not.toHaveBeenCalled();
  expect(
    document.querySelector('[role="menu"][aria-label="Project options"]'),
  ).toBeNull();
  act(() =>
    beta
      .querySelector("[data-project-header]")!
      .dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
      ),
  );
  expect(reorderPointerDown).toHaveBeenCalledExactlyOnceWith(
    "/work/beta",
    expect.objectContaining({ type: "pointerdown" }),
  );
});

it.each([false, true])(
  "lets unpinned project headers start a reorder (grouped: %s)",
  async (grouped) => {
    if (grouped) {
      saveProjectGroups([{ id: "team", name: "Team", collapsed: false }]);
      setProjectGroupAssignment("/work/beta", "team");
    }
    await renderTree();
    const header = projectNameButton("/work/beta").closest<HTMLElement>(
      "[data-project-header]",
    )!;
    act(() =>
      header.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
      ),
    );
    expect(reorderPointerDown).toHaveBeenCalledExactlyOnceWith(
      "/work/beta",
      expect.objectContaining({ type: "pointerdown" }),
    );
    const call = vi.mocked(useAnimatedReorder).mock.calls.find(([ids]) =>
      ids.includes("/work/beta"),
    )!;
    expect(call[2]).toBe("y");
    expect(call[4]?.activationDistance).toBe(3);
    Object.defineProperty(header, "offsetHeight", { value: 32 });
    expect(call[4]?.collapsedSize?.("/work/beta", header.parentElement!)).toBe(32);
  },
);

it("temporarily folds only the dragged project's children and animates them back", async () => {
  const props = await renderTree();
  reorderState.draggingId = "/work/beta";
  await renderTree(props);
  const beta = container.querySelector('[data-project-path="/work/beta"]')!;
  const fold = beta.querySelector<HTMLElement>(".zen-fold-item")!;
  expect(fold.dataset.foldState).toBe("closing");
  expect(fold.inert).toBe(true);
  expect(fold.getAttribute("aria-hidden")).toBe("true");
  expect(beta.querySelector('[aria-expanded="true"]')).not.toBeNull();
  expect(
    container.querySelector<HTMLElement>(
      '[data-project-path="/work/alpha"] .zen-fold-item',
    )?.dataset.foldState,
  ).toBe("open");
  act(() => fold.dispatchEvent(new Event("animationend", { bubbles: true })));
  const retained = beta.querySelector("[data-project-children]");
  expect(retained).not.toBeNull();
  expect(fold.hidden).toBe(true);

  reorderState.draggingId = null;
  await renderTree(props);
  const reopening = beta.querySelector<HTMLElement>(".zen-fold-item")!;
  expect(reopening.dataset.foldState).toBe("opening");
  expect(reopening.inert).toBe(false);
  expect(beta.querySelector("[data-project-children]")).toBe(retained);
  expect(reopening.hidden).toBe(false);
  expect(props.onToggleProject).not.toHaveBeenCalled();
});

it("persists each project subset without moving pins, other groups or chats", async () => {
  const paths = [
    "/work/alpha",
    "/work/beta",
    "/work/gamma",
    "/work/delta",
    "/work/epsilon",
  ];
  saveProjectRailOrder(paths);
  savePinnedProjects([paths[0]]);
  saveProjectGroups([{ id: "team", name: "Team", collapsed: false }]);
  setProjectGroupAssignment(paths[1], "team");
  setProjectGroupAssignment(paths[3], "team");
  await renderTree({
    recents: paths.map((path, index) => ({ path, openedAt: 5 - index })),
    chatEntries: [{ id: "session", content: "Chat conversation" }],
  });
  const reorder = (subset: string[]) => {
    const call = vi.mocked(useAnimatedReorder).mock.calls.find(([ids]) =>
      ids.includes(subset[0]),
    )!;
    vi.mocked(useAnimatedReorder).mockClear();
    act(() => call[1](subset));
  };
  reorder([paths[3], paths[1]]);
  expect(loadProjectRailOrder()).toEqual([
    paths[0],
    paths[3],
    paths[2],
    paths[1],
    paths[4],
  ]);
  reorder([paths[4], paths[2]]);
  expect(loadProjectRailOrder()).toEqual([
    paths[0],
    paths[3],
    paths[4],
    paths[1],
    paths[2],
  ]);
  expect(
    vi.mocked(useAnimatedReorder).mock.calls.some(([ids]) => ids.length === 0),
  ).toBe(true);
  expect(loadPinnedProjects()).toEqual([paths[0]]);
});

it("keeps unavailable project disclosures aligned while their names remain selectable", async () => {
  const props = await renderTree({
    canExpandProject: (path) => path === "/work/alpha",
  });
  const alpha = container.querySelector('[data-project-path="/work/alpha"]')!;
  const beta = container.querySelector('[data-project-path="/work/beta"]')!;
  expect(alpha.querySelector('button[aria-expanded="true"]')).not.toBeNull();
  expect(beta.querySelector("button[aria-expanded]")).toBeNull();
  // The avatar keeps the disclosure slot's width, so names stay aligned.
  expect(
    beta
      .querySelector("[data-project-header] > span[data-project-avatar]")
      ?.classList.contains("w-4"),
  ).toBe(true);
  expect(
    alpha
      .querySelector('button[aria-expanded="true"]')
      ?.querySelector("[data-project-avatar]"),
  ).not.toBeNull();
  expect(beta.querySelector("[data-project-children]")).toBeNull();
  act(() =>
    beta
      .querySelector<HTMLButtonElement>(
        'button[data-project-select="/work/beta"]',
      )!
      .click(),
  );
  expect(props.onSelectProject).toHaveBeenCalledExactlyOnceWith("/work/beta");
  expect(props.onToggleProject).not.toHaveBeenCalled();
});

it("reveals matching projects in collapsed groups only for the duration of search", async () => {
  saveProjectGroups([{ id: "team", name: "Team", collapsed: true }]);
  setProjectGroupAssignment("/work/beta", "team");
  await renderTree();
  expect(
    container.querySelector('[data-project-path="/work/beta"]'),
  ).toBeNull();
  await renderTree({
    searchActive: true,
    matchedProjectPaths: new Set(["/work/beta"]),
    query: "matching session title",
  });
  expect(
    container.querySelector('[data-project-path="/work/beta"]'),
  ).not.toBeNull();
  expect(
    container.querySelector('[data-project-path="/work/alpha"]'),
  ).toBeNull();
  expect(
    container.querySelector(
      '[data-project-group="team"] button[aria-expanded="true"]',
    ),
  ).not.toBeNull();
  await renderTree();
  const fold = container.querySelector<HTMLElement>(
    '[data-project-group="team"] .zen-fold-item',
  )!;
  expect(fold.dataset.foldState).toBe("closing");
  expect(fold.inert).toBe(true);
  act(() => fold.dispatchEvent(new Event("animationend", { bubbles: true })));
  expect(
    container.querySelector('[data-project-path="/work/beta"]')?.closest("[hidden]"),
  ).toBe(fold);
});

it("distinguishes identically named projects by their accessible path and exposes its scroll container", async () => {
  const scrollRef = { current: null as HTMLDivElement | null };
  await renderTree({
    cwd: "/one/repo",
    recents: [
      { path: "/one/repo", openedAt: 2 },
      { path: "/two/repo", openedAt: 1 },
    ],
    expandedPaths: new Set(),
    scrollRef,
    scrollable: false,
  });
  expect(
    container.querySelector(
      'button[data-project-select="/one/repo"][aria-description="/one/repo"]',
    ),
  ).not.toBeNull();
  expect(
    container.querySelector(
      'button[data-project-select="/two/repo"][aria-description="/two/repo"]',
    ),
  ).not.toBeNull();
  expect(scrollRef.current).not.toBeNull();
  expect(scrollRef.current!.classList.contains("overflow-y-auto")).toBe(false);
});

function scrollMaskFixture(normalizeMaskCssom = false) {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames.delete(id); });
  const resizes: FakeResizeObserver[] = [];
  class FakeResizeObserver {
    targets = new Set<Element>();
    everObserved = new Set<Element>();
    disconnected = false;
    constructor(private callback: ResizeObserverCallback) { resizes.push(this); }
    observe(element: Element) { this.targets.add(element); this.everObserved.add(element); }
    unobserve(element: Element) { this.targets.delete(element); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
    emit() { this.callback([], this as unknown as ResizeObserver); }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  const mutations: FakeMutationObserver[] = [];
  class FakeMutationObserver {
    target?: Node;
    options?: MutationObserverInit;
    disconnected = false;
    constructor(private callback: MutationCallback) { mutations.push(this); }
    observe(target: Node, options: MutationObserverInit) { this.target = target; this.options = options; }
    disconnect() { this.disconnected = true; }
    emit() { this.callback([], this as unknown as MutationObserver); }
  }
  vi.stubGlobal("MutationObserver", FakeMutationObserver);
  const dimensions = { clientHeight: 100, scrollHeight: 300, scrollTop: 0 };
  const read = vi.fn();
  const write = vi.fn();
  let element: HTMLDivElement;
  const scrollRef = (node: HTMLDivElement | null) => {
    if (!node || node === element) return;
    element = node;
    for (const key of ["clientHeight", "scrollHeight", "scrollTop"] as const) {
      Object.defineProperty(node, key, { configurable: true, get: () => { read(key); return dimensions[key]; } });
    }
    const setProperty = node.style.setProperty.bind(node.style);
    vi.spyOn(node.style, "setProperty").mockImplementation((name, value, priority) => {
      if (name === "mask-image") write(value);
      setProperty(name, value, priority);
    });
    if (normalizeMaskCssom) {
      const getPropertyValue = node.style.getPropertyValue.bind(node.style);
      vi.spyOn(node.style, "getPropertyValue").mockImplementation((name) => {
        const value = getPropertyValue(name);
        return name === "mask-image"
          ? value.replace("to bottom, ", "").replace("100% - 0px", "100% + 0px")
          : value;
      });
    }
  };
  const render = (visible: boolean, overrides: Partial<ComponentProps<typeof ProjectList>> = {}) => act(async () => {
    root.render(createElement(SurfaceVisibilityContext.Provider, { value: visible }, createElement(ProjectList, {
      cwd: "/work/alpha",
      recents: [{ path: "/work/alpha", openedAt: 1 }],
      onSelectProject: vi.fn(),
      onOpenProject: vi.fn(),
      scrollRef,
      ...overrides,
    })));
  });
  return {
    render, dimensions, read, write, frames,
    element: () => element,
    observers: () => resizes.filter((observer) => observer.everObserved.has(element)),
    mutations: () => mutations.filter((observer) => observer.target === element),
    flush: () => act(() => {
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(0);
    }),
  };
}

it("does not measure hidden scroll masks and initializes their first visible frame", async () => {
  const fixture = scrollMaskFixture();
  await fixture.render(false);
  expect(fixture.read).not.toHaveBeenCalled();
  expect(fixture.observers()).toHaveLength(0);
  fixture.element().dispatchEvent(new Event("scroll"));
  expect(fixture.frames.size).toBe(0);
  await fixture.render(true);
  expect(fixture.element().style.maskImage).toContain("black 0px, black calc(100% - 32px)");
  expect(fixture.observers()).toHaveLength(1);
  fixture.read.mockClear();
  await fixture.render(true, { busyPaths: ["/work/alpha"] });
  expect(fixture.read).not.toHaveBeenCalled();
  expect(fixture.observers()).toHaveLength(1);
  expect(fixture.observers()[0].disconnected).toBe(false);
});

it("coalesces scroll and resize mask updates and skips unchanged gradient writes", async () => {
  const fixture = scrollMaskFixture();
  await fixture.render(true);
  fixture.read.mockClear();
  fixture.write.mockClear();
  fixture.dimensions.scrollTop = 50;
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.observers()[0].emit();
  expect(fixture.read).not.toHaveBeenCalled();
  expect(fixture.frames.size).toBe(1);
  fixture.flush();
  expect(fixture.read.mock.calls.map(([key]) => key).sort()).toEqual(["clientHeight", "scrollHeight", "scrollTop"]);
  expect(fixture.element().style.maskImage).toContain("black 32px, black calc(100% - 32px)");
  expect(fixture.write).toHaveBeenCalledOnce();
  fixture.dimensions.scrollTop = 60;
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.flush();
  expect(fixture.write).toHaveBeenCalledOnce();
  fixture.dimensions.scrollTop = 200;
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.flush();
  expect(fixture.element().style.maskImage).toContain("black 32px, black calc(100% - 0px)");
  fixture.dimensions.clientHeight = 40;
  fixture.observers()[0].emit();
  fixture.flush();
  expect(fixture.element().style.maskImage).toContain("black 20px, black calc(100% - 20px)");
});

it("skips unchanged mask writes when CSSOM canonicalizes the assigned gradient", async () => {
  const fixture = scrollMaskFixture(true);
  fixture.dimensions.scrollHeight = 100;
  await fixture.render(true);
  expect(fixture.element().style.maskImage).toBe(
    "linear-gradient(transparent, black 0px, black calc(100% + 0px), transparent)",
  );
  expect(fixture.write).toHaveBeenCalledOnce();
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.observers()[0].emit();
  fixture.flush();
  expect(fixture.write).toHaveBeenCalledOnce();

  fixture.dimensions.scrollHeight = 300;
  fixture.dimensions.scrollTop = 10;
  fixture.observers()[0].emit();
  fixture.flush();
  expect(fixture.write).toHaveBeenCalledTimes(2);
  expect(fixture.element().style.maskImage).toContain(
    "black 32px, black calc(100% - 32px)",
  );
  fixture.dimensions.scrollTop = 20;
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.flush();
  expect(fixture.write).toHaveBeenCalledTimes(2);
});

it("observes newly inserted sections without replacing the mask observer", async () => {
  const fixture = scrollMaskFixture();
  await fixture.render(true);
  const observer = fixture.observers()[0];
  const mutations = fixture.mutations()[0];
  expect(mutations.options).toEqual({ childList: true });
  await fixture.render(true, { pinnedEntries: [{ id: "new-pin", content: "Pinned conversation" }] });
  const section = fixture.element().querySelector('[data-project-section="pinned"]')!;
  expect(section).not.toBeNull();
  mutations.emit();
  expect(observer.targets.has(section)).toBe(true);
  fixture.flush();
  fixture.dimensions.scrollHeight = 500;
  fixture.dimensions.scrollTop = 200;
  observer.emit();
  fixture.flush();
  expect(fixture.element().style.maskImage).toContain("black 32px, black calc(100% - 32px)");
  await fixture.render(true);
  mutations.emit();
  expect(observer.targets.has(section)).toBe(false);
  expect(fixture.observers()).toEqual([observer]);
});

it("cancels pending mask work during hiding and clears the mask when scrolling is disabled", async () => {
  const fixture = scrollMaskFixture();
  await fixture.render(true);
  const observer = fixture.observers()[0];
  const mutations = fixture.mutations()[0];
  fixture.element().dispatchEvent(new Event("scroll"));
  expect(fixture.frames.size).toBe(1);
  await fixture.render(false);
  fixture.read.mockClear();
  expect(observer.disconnected).toBe(true);
  expect(mutations.disconnected).toBe(true);
  expect(fixture.frames.size).toBe(0);
  observer.emit();
  mutations.emit();
  fixture.element().dispatchEvent(new Event("scroll"));
  fixture.flush();
  expect(fixture.read).not.toHaveBeenCalled();
  fixture.dimensions.scrollTop = 200;
  await fixture.render(true);
  expect(fixture.element().style.maskImage).toContain("black 32px, black calc(100% - 0px)");
  await fixture.render(true, { scrollable: false });
  expect(fixture.element().style.maskImage).toBe("");
});

function projectNameButton(path: string): HTMLButtonElement {
  return container.querySelector<HTMLButtonElement>(
    `[data-project-select="${path}"]`,
  )!;
}

function projectSummary(path: string): HTMLElement | null {
  return document.querySelector(`[data-project-summary="${path}"]`);
}

it("opens a project summary on keyboard focus with complete counts and an accessible full path", async () => {
  const onProjectHoverOpen = vi.fn();
  await renderTree({
    projectSummaries: new Map([
      ["/work/beta", { total: 6, unread: 1, opened: 1, historyState: "ready" }],
    ]),
    onProjectHoverOpen,
  });
  act(() => projectNameButton("/work/beta").focus());
  const summary = projectSummary("/work/beta")!;
  expect(summary).not.toBeNull();
  expect(summary.getAttribute("role")).toBe("dialog");
  expect(summary.textContent).toContain("6 sessions");
  expect(summary.textContent).toContain("1 unread");
  expect(summary.textContent).toContain("1 opened");
  expect(summary.textContent).toContain("/work/beta");
  expect(summary.querySelector('[aria-label="Pin project"]')).not.toBeNull();
  expect(
    summary.querySelector('button[aria-label="Edit project"]'),
  ).not.toBeNull();
  expect(onProjectHoverOpen).toHaveBeenCalledExactlyOnceWith("/work/beta");
  expect(projectNameButton("/work/beta").hasAttribute("title")).toBe(false);
});

it("opens and closes immediately and keeps the summary open while crossing into its actions", async () => {
  const onProjectHoverOpen = vi.fn();
  await renderTree({ onProjectHoverOpen });
  vi.useFakeTimers();
  const header = container.querySelector<HTMLElement>(
    '[data-project-path="/work/beta"] [data-project-header]',
  )!;
  act(() =>
    header.dispatchEvent(
      new PointerEvent("pointerover", {
        bubbles: true,
        pointerType: "mouse",
      }),
    ),
  );
  const summary = projectSummary("/work/beta")!;
  expect(summary).not.toBeNull();
  expect(onProjectHoverOpen).toHaveBeenCalledExactlyOnceWith("/work/beta");
  act(() =>
    header.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: summary,
      }),
    ),
  );
  act(() =>
    summary.dispatchEvent(
      new PointerEvent("pointerover", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: header,
      }),
    ),
  );
  expect(projectSummary("/work/beta")).toBe(summary);
  act(() =>
    summary.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: header,
      }),
    ),
  );
  expect(projectSummary("/work/beta")).toBe(summary);
  expect(onProjectHoverOpen).toHaveBeenCalledTimes(1);
  act(() =>
    header.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: document.body,
      }),
    ),
  );
  expect(projectSummary("/work/beta")).toBeNull();
});

it("allows Tab into summary actions and edits the original project without activation or disclosure", async () => {
  const props = await renderTree();
  const nameButton = projectNameButton("/work/beta");
  act(() => nameButton.focus());
  act(() =>
    nameButton.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  const summary = projectSummary("/work/beta")!;
  expect(summary.contains(document.activeElement)).toBe(true);
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Pin project",
  );
  const edit = summary.querySelector<HTMLButtonElement>(
    '[aria-label="Edit project"]',
  )!;
  act(() => {
    edit.focus();
    edit.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    edit.click();
  });
  expect(projectSummary("/work/beta")).toBeNull();
  const menu = document.querySelector<HTMLElement>(
    '[role="menu"][aria-label="Project options"]',
  )!;
  expect(menu).not.toBeNull();
  expect(
    menu.querySelector<HTMLInputElement>('input[aria-label="Group name"]')
      ?.value,
  ).toBe("beta");
  expect(props.onSelectProject).not.toHaveBeenCalled();
  expect(props.onToggleProject).not.toHaveBeenCalled();
  expect(reorderPointerDown).not.toHaveBeenCalled();
  act(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(document.activeElement).toBe(projectNameButton("/work/beta"));
});

it("pins a project from its summary without activating it or starting a reorder", async () => {
  const props = await renderTree();
  act(() => projectNameButton("/work/beta").focus());
  const pin = projectSummary("/work/beta")!.querySelector<HTMLButtonElement>(
    '[aria-label="Pin project"]',
  )!;
  act(() => {
    pin.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    pin.click();
  });
  expect(loadPinnedProjects()).toContain("/work/beta");
  expect(props.onSelectProject).not.toHaveBeenCalled();
  expect(props.onToggleProject).not.toHaveBeenCalled();
  expect(reorderPointerDown).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(projectNameButton("/work/beta"));
  expect(projectSummary("/work/beta")).toBeNull();
  act(() => {
    projectNameButton("/work/alpha").focus();
    projectNameButton("/work/beta").focus();
  });
  expect(
    projectSummary("/work/beta")?.querySelector('[aria-label="Unpin project"]'),
  ).not.toBeNull();
});

it("shows unavailable history as an error rather than zero and retries through the hover loader", async () => {
  const onProjectHoverOpen = vi.fn();
  await renderTree({
    projectSummaries: new Map([
      ["/work/beta", { unread: 0, opened: 1, historyState: "error" }],
    ]),
    onProjectHoverOpen,
  });
  act(() => projectNameButton("/work/beta").focus());
  const summary = projectSummary("/work/beta")!;
  expect(summary.textContent).toContain("Project summary unavailable");
  expect(summary.textContent).not.toContain("0 sessions");
  act(() =>
    summary
      .querySelector<HTMLButtonElement>('button[aria-label="Retry"]')!
      .click(),
  );
  expect(onProjectHoverOpen).toHaveBeenCalledTimes(2);
});

it("hides Retry for a project whose backend has no available loader", async () => {
  await renderTree({
    projectSummaries: new Map([
      [
        "/work/beta",
        {
          unread: 0,
          opened: 1,
          historyState: "error",
          canRetry: false,
        },
      ],
    ]),
    onProjectHoverOpen: vi.fn(),
  });
  act(() => projectNameButton("/work/beta").focus());
  expect(projectSummary("/work/beta")?.textContent).toContain(
    "Project summary unavailable",
  );
  expect(
    projectSummary("/work/beta")?.querySelector('button[aria-label="Retry"]'),
  ).toBeNull();
});

it.each(["loading", "error"] as const)(
  "retains cached counts with an explicit note during a project history %s",
  async (historyState) => {
    await renderTree({
      projectSummaries: new Map([
        [
          "/work/beta",
          { total: 6, unread: 1, opened: 2, historyState, cached: true },
        ],
      ]),
    });
    act(() => projectNameButton("/work/beta").focus());
    const summary = projectSummary("/work/beta")!;
    expect(summary.textContent).toContain("6 sessions");
    expect(summary.textContent).toContain("1 unread");
    expect(summary.textContent).toContain("2 opened");
    expect(summary.textContent).toContain("Showing cached summary");
    expect(summary.textContent).toContain(
      historyState === "error"
        ? "Project summary unavailable"
        : "Loading project summary…",
    );
  },
);

it("suppresses pointer-origin focus and hides summaries during project drag", async () => {
  savePinnedProjects(["/work/beta"]);
  const props = await renderTree();
  const beta = projectNameButton("/work/beta");
  act(() => {
    beta.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
        button: 0,
      }),
    );
    beta.focus();
  });
  expect(projectSummary("/work/beta")).toBeNull();
  act(() => {
    beta.blur();
    beta.focus();
  });
  expect(projectSummary("/work/beta")).not.toBeNull();
  reorderState.draggingId = "/work/beta";
  await renderTree(props);
  expect(projectSummary("/work/beta")).toBeNull();
  act(() => {
    beta.blur();
    beta.focus();
  });
  expect(projectSummary("/work/beta")).toBeNull();
});

it("preserves manual recent project order after a project is reopened", async () => {
  saveProjectRailOrder([
    "/work/gamma", "/work/beta", "/work/alpha",
  ]);
  const props = await renderTree();
  const paths = () => [...container.querySelectorAll<HTMLElement>(
    '[data-project-section="projects"] [data-project-path]',
  )].map((row) => row.dataset.projectPath);
  expect(paths()).toEqual(["/work/gamma", "/work/beta", "/work/alpha"]);
  await renderTree({
    ...props,
    recents: props.recents.map((row) => row.path === "/work/alpha"
      ? { ...row, openedAt: 4 }
      : row),
  });
  expect(paths()).toEqual(["/work/gamma", "/work/beta", "/work/alpha"]);
});

it("supports summary hover for compact project avatars and projects inside groups", async () => {
  saveProjectGroups([{ id: "team", name: "Team" }]);
  setProjectGroupAssignment("/work/beta", "team");
  await renderTree({ compact: true });
  act(() => projectNameButton("/work/beta").focus());
  expect(projectSummary("/work/beta")?.textContent).toContain("/work/beta");
  expect(projectSummary("/work/beta")?.textContent).toContain("Edit project");
});

it("hides the project summary while its menu or a closing project group owns the surface", async () => {
  saveProjectGroups([{ id: "team", name: "Team" }]);
  setProjectGroupAssignment("/work/beta", "team");
  await renderTree();
  act(() => projectNameButton("/work/beta").focus());
  expect(projectSummary("/work/beta")).not.toBeNull();
  act(() =>
    container
      .querySelector<HTMLButtonElement>(
        '[data-project-path="/work/beta"] button[aria-label="Project options"]',
      )!
      .click(),
  );
  expect(projectSummary("/work/beta")).toBeNull();
  expect(
    document.querySelector('[role="menu"][aria-label="Project options"]'),
  ).not.toBeNull();
  act(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      }),
    ),
  );
  act(() => projectNameButton("/work/beta").focus());
  // A focus already restored to the name does not re-emit an event; visit it again.
  act(() => {
    projectNameButton("/work/alpha").focus();
    projectNameButton("/work/beta").focus();
  });
  expect(projectSummary("/work/beta")).not.toBeNull();
  act(() => saveProjectGroups([{ id: "team", name: "Team", collapsed: true }]));
  const fold = container.querySelector<HTMLElement>(
    '[data-project-group="team"] .zen-fold-item',
  )!;
  expect(fold.dataset.foldState).toBe("closing");
  expect(projectNameButton("/work/beta")).not.toBeNull();
  expect(projectSummary("/work/beta")).toBeNull();
});

it("shows a remote project's host path and machine connection in its summary", async () => {
  const remote = rememberRemoteProject(machine.environmentId, project);
  await renderRail(remote.key);
  act(() => projectNameButton(remote.key).focus());
  const summary = projectSummary(remote.key)!;
  expect(summary.textContent).toContain(project.cwd);
  expect(summary.textContent).toContain("wy-ubuntu");
  expect(summary.textContent).toContain("Connected");
  expect(summary.textContent).not.toContain(remote.key);
});


it("only prepares visible shortcuts from a large history and animates the next page", async () => {
  const prepare = vi.fn((index: number) =>
    createElement(
      "button",
      { "data-history-entry": index },
      `Conversation ${index}`,
    ),
  );
  const entries = Array.from({ length: 2000 }, (_, index) => ({
    id: `entry-${index}`,
    content: () => prepare(index),
  }));
  const props = await renderTree({ chatEntries: entries });
  const prepared = () => [...new Set(prepare.mock.calls.map(([index]) => index))];
  expect(prepared()).toEqual([0, 1, 2, 3, 4]);
  await renderTree({ ...props, expandedPaths: new Set() });
  expect(prepared()).toEqual([0, 1, 2, 3, 4]);
  const chats = container.querySelector("[data-chat-project]")!;
  await act(async () =>
    chats
      .querySelector<HTMLButtonElement>("[data-sidebar-list-toggle]")!
      .click(),
  );
  expect(prepared()).toEqual(Array.from({ length: 10 }, (_, index) => index));
  expect(
    chats
      .querySelector('[data-history-entry="9"]')
      ?.closest<HTMLElement>(".zen-fold-item")?.dataset.foldState,
  ).toBe("opening");
  await renderTree({
    ...props,
    chatEntries: [entries[1999]],
    searchActive: true,
  });
  expect(container.querySelector('[data-history-entry="1999"]')).not.toBeNull();
});

it("does not let a queued disclosure override an external project selection", async () => {
  vi.useFakeTimers();
  const onActivateProject = vi.fn();
  const props = await renderTree({
    expandedPaths: new Set(),
    onActivateProject,
  });
  act(() => projectNameButton("/work/beta").click());
  await renderTree({
    ...props,
    expandedPaths: new Set(["/work/beta"]),
    cwd: "/work/gamma",
  });
  act(() => vi.advanceTimersByTime(300));
  expect(onActivateProject).not.toHaveBeenCalled();
});

it("defers unopened session sections and retains them without repeated hidden preparation", async () => {
  const prepare = vi.fn((path: string) =>
    createElement("button", { "data-session": path }, "Conversation"),
  );
  const props = await renderTree({
    expandedPaths: new Set(),
    renderProjectChildren: prepare,
  });
  expect(prepare).not.toHaveBeenCalled();
  await renderTree({
    ...props,
    expandedPaths: new Set(["/work/alpha"]),
  });
  expect(new Set(prepare.mock.calls.map(([path]) => path))).toEqual(
    new Set(["/work/alpha"]),
  );
  const session = container.querySelector('[data-session="/work/alpha"]');
  await renderTree(props);
  const fold = container.querySelector<HTMLElement>(
    '[data-project-path="/work/alpha"] .zen-fold-item',
  )!;
  act(() => fold.dispatchEvent(new Event("animationend", { bubbles: true })));
  expect(fold.hidden).toBe(true);
  prepare.mockClear();
  await renderTree({ ...props, renderProjectChildren: (path) => prepare(path) });
  expect(prepare).not.toHaveBeenCalled();
  expect(container.querySelector('[data-session="/work/alpha"]')).toBe(session);
  await renderTree({ ...props, expandedPaths: new Set(["/work/alpha"]) });
  expect(container.querySelector('[data-session="/work/alpha"]')).toBe(session);
  expect(fold.hidden).toBe(false);
});

it("reveals projects in batches of five independently for pins, groups and loose projects", async () => {
  const recents = Array.from({ length: 36 }, (_, index) => ({
    path: `/work/project-${index}`,
    openedAt: 100 - index,
  }));
  savePinnedProjects(recents.slice(0, 12).map((row) => row.path));
  saveProjectGroups([{ id: "group", name: "Group", collapsed: false }]);
  for (const row of recents.slice(12, 24))
    setProjectGroupAssignment(row.path, "group");
  await renderTree({ cwd: recents[0].path, recents });
  const headers = () => container.querySelectorAll("[data-project-header]");
  const toggles = () =>
    container.querySelectorAll<HTMLButtonElement>("[data-sidebar-list-toggle]");
  expect(headers()).toHaveLength(15);
  expect(toggles()).toHaveLength(3);
  await act(async () => toggles()[0].click());
  expect(headers()).toHaveLength(20);
  await act(async () => toggles()[0].click());
  expect(headers()).toHaveLength(22);
  await act(async () => toggles()[0].click());
  const closing = container.querySelector<HTMLElement>(
    '[data-fold-state="closing"]',
  )!;
  expect(closing.inert).toBe(true);
  await act(async () => {
    container
      .querySelectorAll('[data-fold-state="closing"]')
      .forEach((node) =>
        node.dispatchEvent(new Event("animationend", { bubbles: true })),
      );
  });
  expect(headers()).toHaveLength(15);
  await renderTree({
    cwd: recents[0].path,
    recents,
    query: "project-35",
    searchActive: true,
  });
  expect(headers()).toHaveLength(1);
  expect(container.textContent).toContain("project-35");
});
