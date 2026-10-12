import type { Element, ElementContent, Root } from "hast";

import type { TextRevealSequence } from "./textRevealQueue";

/** Compatibility helpers for transcript callers; provider text renders immediately. */
export type TextRevealOptions = {
  unit: "word" | "character";
  /** Text already visible when this conversation was opened. */
  initialLength?: number;
  /** Received history to show immediately after a retained conversation resumes. */
  settledLength?: number;
  /** Wait until earlier mounted replies have caught up with their received text. */
  sequence?: TextRevealSequence;
};

/** UTF-16 boundaries of complete displayed characters, including emoji. */
export function characterBoundaries(text: string): number[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: string },
      ) => {
        segment: (text: string) => Iterable<{ index: number; segment: string }>;
      };
    }
  ).Segmenter;
  if (Segmenter)
    return Array.from(
      new Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (part) => part.index + part.segment.length,
    );
  const characters: string[] = [];
  for (const character of text) {
    const previous = characters[characters.length - 1];
    if (
      previous &&
      (/^[\p{Mark}\uFE0E\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]$/u.test(character) ||
        previous.endsWith("\u200D"))
    )
      characters[characters.length - 1] += character;
    else characters.push(character);
  }
  let offset = 0;
  return characters.map((character) => (offset += character.length));
}

/**
 * Where to stop revealing `text` for a reveal that has reached `at`: the end
 * of the word `at` falls in, so a word is never shown half written. A stream
 * still mid-word holds back at the last whole word; a finished one runs out.
 */
export function revealEnd(
  text: string,
  at: number,
  streaming: boolean,
): number {
  for (let i = Math.max(0, Math.ceil(at)); i < text.length; i++) {
    if (isSpace(text.charCodeAt(i))) return i;
  }
  if (!streaming) return text.length;
  let end = text.length;
  while (end > 0 && !isSpace(text.charCodeAt(end - 1))) end--;
  return end;
}

function isSpace(code: number): boolean {
  return code === 32 || code === 10 || code === 9 || code === 13;
}

/** Provider text is rendered as received; sequencing no longer gates words. */
export function usePacedText(text: string, _streaming: boolean, _options?: TextRevealOptions) {
  return { text, revealing: false };
}
export function useWordFading(_active: boolean): boolean { return false; }

/*
 * Text here is either not prose (code, math, drawings) or read whole by the
 * component that renders it (links).
 */
const UNFADED_TAGS = new Set(["a", "code", "pre", "svg", "math", "kbd"]);

/**
 * Wraps every word in a span that fades in as it is added to the page. The
 * plugin keeps no state: a word already on screen keeps its element however
 * often its block re-renders, so it never fades twice, and a word the reveal
 * has just let out is a new element, so it does. That holds because every
 * word gets a span — the JSX keys count spans, and a word without one would
 * shift the keys of every word after it and fade them again.
 */
export function rehypeWordFade() {
  return (tree: Root) => {
    const wrap = (value: string): ElementContent[] =>
      value
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part) =>
          isSpace(part.charCodeAt(0))
            ? { type: "text", value: part }
            : {
                type: "element",
                tagName: "span",
                properties: { dataWordFade: "" },
                children: [{ type: "text", value: part }],
              },
        );

    const walk = (parent: Root | Element) => {
      const children: Array<Root["children"][number]> = [];
      for (const child of parent.children) {
        if (child.type === "text") children.push(...wrap(child.value));
        else {
          if (child.type === "element" && !UNFADED_TAGS.has(child.tagName)) {
            walk(child);
          }
          children.push(child);
        }
      }
      parent.children = children as typeof parent.children;
    };

    walk(tree);
  };
}
