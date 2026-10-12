import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOTION, SPRINGS, springDuration, springEasing } from "../shared/lib/springs";

const metrics = readFileSync("src/styles/omb-metrics.css", "utf8");
const mobile = readFileSync("src/mobile/motion.css", "utf8");

function token(css: string, name: string) {
  return css
    .match(new RegExp(`--${name}:\\s*([^;]+);`, "g"))
    ?.map((line) => line.replace(/^[^:]+:\s*/, "").replace(/;$/, ""));
}

/** Split a selector list at top-level commas, keeping `:is(a, b)` whole. */
function selectorParts(selector: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(selector.slice(start, index));
      start = index + 1;
    }
  }
  return [...parts, selector.slice(start)].map((part) => part.trim());
}

function selectors(css: string) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...stripped.matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1].trim())
    .filter((selector) => !selector.startsWith("@"));
}

describe("skinned desktop metrics", () => {
  it("keeps desktop springs in sync with the generator and the phone", () => {
    for (const [name, spring] of Object.entries(SPRINGS)) {
      expect(token(metrics, `omb-spring-${name}-duration`)).toEqual([
        `${springDuration(spring)}ms`,
      ]);
      expect(token(metrics, `omb-spring-${name}`)).toContain(springEasing(spring));
      const curve = (css: string, prefix: string) =>
        token(css, `${prefix}-spring-${name}`)?.filter((value) =>
          value.startsWith("linear("),
        );
      expect(curve(metrics, "omb")).toEqual(curve(mobile, "mobile"));
    }
    expect(token(metrics, "omb-motion-press")).toEqual([`${MOTION.pressMs}ms`]);
    expect(token(metrics, "omb-motion-shift")).toEqual([`${MOTION.shiftPx}px`]);
    expect(token(metrics, "omb-motion-press-scale")).toEqual([
      String(MOTION.pressScale),
    ]);
  });

  it("only applies under a desktop skin", () => {
    for (const selector of selectors(metrics)) {
      for (const part of selectorParts(selector)) {
        expect(part).toMatch(/^html\[data-skin\]/);
      }
    }
  });

  it("leaves Tailwind's per-skin radii alone", () => {
    expect(metrics).not.toMatch(/--radius-(lg|xl)\s*:/);
  });
});
