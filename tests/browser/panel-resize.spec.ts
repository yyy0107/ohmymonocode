import { expect, test, type Page } from "@playwright/test";

type FixtureWindow = Window & {
  toolsFixture: {
    setTab(tab: string): void;
    selectFile(id: string): void;
    output(text: string): void;
    rpc: { command: string }[];
  };
};

async function painted(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function resizing(page: Page) {
  return page.evaluate(async () => {
    const module = "/src/shared/lib/paneResize.ts";
    return (await import(module)).isPaneResizing() as boolean;
  });
}

async function openTools(page: Page) {
  await page.setViewportSize({ width: 2200, height: 1000 });
  await page.goto("/tests/browser/desktop-tools.html?editor=source");
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  await expect(page.locator(".xterm")).toBeVisible();
  await expect.poll(() => resizing(page)).toBe(false);
  await painted(page);
}

test("keeps the split aligned with its sash when file content rerenders during a drag", async ({ page }) => {
  await openTools(page);
  const handle = page.locator('[data-pane-sash="tools-split:0"] > .resize-handle');
  const chat = page.locator('[data-pane-id="tools-session"]');
  const before = (await chat.boundingBox())!.width;
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 140, box.y + 100, { steps: 8 });
  await painted(page);
  const preview = (await chat.boundingBox())!.width;
  expect(before - preview).toBeGreaterThan(130);
  await page.evaluate(() => (window as FixtureWindow).toolsFixture.selectFile("tools-review"));
  await expect(page.locator("[data-git-review-pane]")).toBeVisible();
  await painted(page);
  expect(Math.abs((await chat.boundingBox())!.width - preview)).toBeLessThan(1);
  const sash = (await page.locator('[data-pane-sash="tools-split:0"]').boundingBox())!;
  const pane = (await chat.boundingBox())!;
  expect(Math.abs(pane.x + pane.width - sash.x)).toBeLessThan(1);
  await page.mouse.up();
  await expect.poll(() => resizing(page)).toBe(false);
  await page.evaluate(() => (window as FixtureWindow).toolsFixture.selectFile("tools-source"));
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  await painted(page);
  expect(Math.abs((await chat.boundingBox())!.width - preview)).toBeLessThan(1);
});

for (const kind of ["tools", "terminal", "sidebar"] as const) {
  test(`${kind} resize follows the pointer without repeated PTY resizing`, async ({ page }) => {
    await openTools(page);
    if (kind === "tools") {
      await page.evaluate(() => (window as FixtureWindow).toolsFixture.setTab("changes"));
      await expect(page.locator(".desktop-tools-layout")).toHaveAttribute("data-fold-state", "open");
    }
    if (kind === "sidebar") {
      await page.evaluate(() => {
        const list = document.querySelector("[data-project-list-scroll]")!;
        const row = list.querySelector("[data-session-dense]")!;
        for (let index = 0; index < 350; index++) list.append(row.cloneNode(true));
      });
    }
    await page.evaluate(() => (window as FixtureWindow).toolsFixture.output(
      Array.from({ length: 2000 }, (_, index) => `${index}: ${"scrollback content ".repeat(12)}`).join("\r\n") + "\r\n",
    ));
    await expect.poll(() => resizing(page)).toBe(false);
    await painted(page);
    const count = () => page.evaluate(() => (window as FixtureWindow).toolsFixture.rpc.filter(call => call.command === "pty_resize").length);
    const countBefore = await count();
    const handle = page.getByRole("separator", { name: { tools: "Resize panel", terminal: "Resize terminal", sidebar: "Resize sidebar" }[kind] });
    await expect(handle).toBeVisible();
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const terminal = page.locator(".xterm");
    await terminal.evaluate(element => element.setAttribute("data-resize-retained", "true"));
    await page.mouse.move(x, y);
    await page.mouse.down();
    expect(await resizing(page)).toBe(true);
    for (let step = 1; step <= 8; step++) {
      await page.mouse.move(
        x + (kind === "terminal" ? 0 : (kind === "sidebar" ? 1 : -1) * step * 10),
        y - (kind === "terminal" ? step * 10 : 0),
      );
      await painted(page);
    }
    expect(await count()).toBe(countBefore);
    const moved = (await handle.boundingBox())!;
    expect(Math.abs((kind === "terminal" ? moved.y - box.y : moved.x - box.x))).toBeGreaterThan(70);
    await page.mouse.up();
    await expect.poll(() => resizing(page)).toBe(false);
    await expect.poll(count).toBe(countBefore + 1);
    await expect(terminal).toHaveAttribute("data-resize-retained", "true");
    if (kind === "sidebar") {
      const gap = await page.evaluate(() => {
        const sidebar = document.querySelector("[data-desktop-sidebar]")!;
        const inset = parseFloat(getComputedStyle(sidebar).getPropertyValue("--desktop-sidebar-inset"));
        return sidebar.getBoundingClientRect().right - inset - document.querySelector(".desktop-mode-toggle")!.getBoundingClientRect().right;
      });
      expect(gap).toBe(10);
    }
  });
}
