// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMarkdown } from "./AgentMarkdown";
import { revealEnd, characterBoundaries, usePacedText, useWordFading } from "./wordFade";

describe("revealEnd", () => {
  it("keeps emoji, combining marks, and flags together for character reveal", () => {
    expect(characterBoundaries("A👩‍💻e\u0301🇨🇳")).toEqual([1, 6, 8, 12]);
  });
  it("stops at the end of the word the reveal has reached", () => {
    expect(revealEnd("Hello there friend", 0, true)).toBe(5);
    expect(revealEnd("Hello there friend", 6.2, true)).toBe(11);
    expect(revealEnd("Hello there", 5, true)).toBe(5);
  });

  it("holds a word still being streamed back until it is whole", () => {
    expect(revealEnd("Hello the", 7, true)).toBe(6);
    expect(revealEnd("Hel", 1, true)).toBe(0);
  });

  it("lets the last word out once the stream has ended", () => {
    expect(revealEnd("Hello the", 7, false)).toBe(9);
  });
});


describe("streaming text without character animation", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  function Probe({text, streaming = true}: {text: string; streaming?: boolean}) {
    const paced = usePacedText(text, streaming, {unit: "character", initialLength: 0});
    return createElement("span", {"data-revealing": paced.revealing, "data-fading": useWordFading(streaming)}, paced.text);
  }
  it("renders each received chunk immediately, including incomplete words and emoji", () => {
    const text = "一段👩‍💻已经收到的文本 Hel";
    act(() => root.render(createElement(Probe, {text})));
    expect(host.textContent).toBe(text);
    expect(host.firstElementChild?.getAttribute("data-revealing")).toBe("false");
    expect(host.firstElementChild?.getAttribute("data-fading")).toBe("false");
    act(() => root.render(createElement(Probe, {text: text + "lo"})));
    expect(host.textContent).toBe(text + "lo");
  });
  it("shows completed history immediately", () => {
    act(() => root.render(createElement(Probe, {text: "已有完整历史。", streaming: false})));
    expect(host.textContent).toBe("已有完整历史。");
  });
  it("leaves code and links whole", () => {
    act(() => root.render(createElement(AgentMarkdown, {text: "See [the guide](https://example.com) and `hello world`.", streaming: true})));
    expect(host.querySelector("a")?.textContent).toBe("the guide");
    expect(host.querySelector("code")?.textContent).toBe("hello world");
  });
});
