import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";

// Exercise the real motion controller and mobile CSS with actual browser layout.
// The observer mirrors the transcript's bottom pin and anchored-turn sizing.
const css = ["06-chat.css", "09-transcript.css"].map(name =>
  readFileSync(new URL(`../../src/mobile/styles/${name}`, import.meta.url), "utf8"),
).join("\n");
let controller: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: [new URL("../../src/mobile/keyboardMotion.ts", import.meta.url).pathname],
    bundle: true, format: "iife", globalName: "keyboardMotion", write: false,
  });
  controller = result.outputFiles[0].text;
});

for (const scenario of [
  { name: "short history", height: 200, anchored: false },
  { name: "history that starts scrolling", height: 600, anchored: false },
  { name: "short anchored turn", height: 200, anchored: true },
  { name: "long history", height: 1500, anchored: false },
]) {
  for (const easing of ["linear", "linear(0, 0.6, 1.08, 0.97, 1)"]) {
    test(`${scenario.name} (${easing}) hands keyboard motion to layout without a jump`, async ({ page }) => {
      await page.setViewportSize({ width: 400, height: 800 });
      await page.setContent(`<style>${css}
        * { box-sizing: border-box; }
        body { margin: 0; }
        .mobile-app { height: 800px; display: flex; flex-direction: column;
          --mobile-header-height: 68px; --mobile-safe-top: 0px; --mobile-safe-bottom: 24px; }
        .mobile-chat { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .agent-transcript { overflow-y: auto; overflow-anchor: none; }
        .message { height: ${scenario.height}px; }
        .mobile-composer-dock { height: 100px; }
      </style><div class="mobile-app"><div class="mobile-chat" style="--mobile-dock-height:100px">
        <div class="mobile-desktop-transcript">
          <div class="agent-transcript"><div><div class="${scenario.anchored ? "transcript-turn-anchor" : ""}"><div class="message">Message</div></div></div></div>
          <button class="mobile-jump">Jump</button>
        </div>
        <div class="mobile-composer-dock"><textarea></textarea></div>
      </div></div>`);
      await page.addScriptTag({ content: controller });
      const samples = await page.evaluate(async (easing) => {
        (window as unknown as { keyboardMotion: { installKeyboardMotion(): void } }).keyboardMotion.installKeyboardMotion();
        const log = document.querySelector<HTMLElement>(".agent-transcript")!;
        const anchor = log.querySelector<HTMLElement>(".transcript-turn-anchor");
        const read = () => ({
          message: document.querySelector(".message")!.getBoundingClientRect().top,
          composer: document.querySelector(".mobile-composer-dock")!.getBoundingClientRect().top,
          jump: document.querySelector(".mobile-jump")!.getBoundingClientRect().top,
          layout: document.querySelector<HTMLElement>(".mobile-app")!.style.height,
          scroll: log.scrollTop,
        });
        const pin = () => {
          if (anchor) {
            const style = getComputedStyle(log);
            anchor.style.minHeight = `${log.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)}px`;
          }
          log.scrollTop = log.scrollHeight;
        };
        const observer = new ResizeObserver(pin);
        observer.observe(log);
        pin();
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const initial = read();
        const move = async (height: number) => {
          window.dispatchEvent(new CustomEvent("monocode:keyboard", {
            detail: { height, viewport: 800, duration: 200, easing },
          }));
          const start = performance.now();
          const frames: (ReturnType<typeof read> & { time: number })[] = [];
          await new Promise<void>(resolve => {
            const sample = () => {
              frames.push({ ...read(), time: performance.now() - start });
              if (performance.now() - start < 320) requestAnimationFrame(sample);
              else resolve();
            };
            requestAnimationFrame(sample);
          });
          return frames;
        };
        const rise = await move(300);
        const fall = await move(0);
        observer.disconnect();
        return { initial, rise, fall };
      }, easing);
      const handoff = samples.rise.findIndex((frame, index, frames) =>
        index > 0 && frame.layout !== frames[index - 1].layout,
      );
      expect(handoff).toBeGreaterThan(0);
      for (const property of ["message", "jump", "composer"] as const) {
        // Layout commits after the animated position has reached its destination.
        expect(Math.abs(samples.rise[handoff][property] - samples.rise[handoff - 1][property])).toBeLessThan(1);
        expect(samples.fall.at(-1)![property]).toBeCloseTo(samples.initial[property], 0);
        for (const [frames, direction] of [[samples.rise, -1], [samples.fall, 1]] as const) {
          for (let index = 1; index < frames.length; index++) {
            expect((frames[index][property] - frames[index - 1][property]) * direction).toBeGreaterThanOrEqual(-1);
          }
        }
      }
      if (scenario.height === 200) expect(samples.rise.at(-1)!.scroll).toBe(0);
    });
  }
}
