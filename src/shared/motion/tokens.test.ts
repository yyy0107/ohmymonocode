import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { duration, ease, springs, defaultTransition, autoAnimateOptions } from "./tokens";

describe("shared Motion vocabulary", () => {
  it("keeps timings, easing and free spring presets in one place", () => {
    expect(ease).toEqual([0.22, 1, 0.36, 1]);
    expect(duration).toEqual({ msg: 0.18, pop: 0.2, panel: 0.24, collapse: 0.2 });
    expect(defaultTransition).toEqual({ duration: duration.panel, ease });
    expect(autoAnimateOptions.duration).toBe(duration.panel * 1000);
    expect(springs).toEqual({
      sheet: { type: "spring", stiffness: 400, damping: 38 },
      drawer: { type: "spring", stiffness: 380, damping: 36 },
      press: { type: "spring", stiffness: 600, damping: 30 },
    });
  });
  it.each([
    "src/shared/ui/AnimatedCollapse.tsx", "src/shared/ui/Popover.tsx",
  ])("uses tokens rather than literal animation durations in %s", (path) => {
    const source = readFileSync(path, "utf8");
    expect(source).toMatch(/motion\/tokens/);
    expect(source).not.toMatch(/\bduration\s*:\s*\d/);
    expect(source).not.toContain("framer-motion");
  });
});
