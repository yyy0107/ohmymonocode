import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { suppressTextSelection } from "../lib/drag";
import { beginPaneResize } from "../lib/paneResize";

type Options = {
  min: number;
  /** Grid tracks can consume a custom property instead of an element width. */
  cssProperty?: "width" | `--${string}`;
  direction?: "left" | "right" | "top" | "bottom";
  max: () => number;
  defaultWidth: number;
  initial: number;
  /** A preference update; it must not fight an in-progress pointer drag. */
  value?: number;
  onCommit?: (width: number) => void;
};

function clampTo(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Drag a pane's width by writing the DOM directly so React re-renders can't fight the cursor. */
export function useDragResize({
  direction = "right",
  cssProperty = "width",
  min,
  max,
  defaultWidth,
  initial,
  value,
  onCommit,
}: Options) {
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const defaultRef = useRef(defaultWidth);
  defaultRef.current = defaultWidth;

  const clamp = useCallback((value: number) => {
    return clampTo(value, minRef.current, maxRef.current());
  }, []);

  const [width, setWidth] = useState(() => clamp(initial));
  const [dragging, setDragging] = useState(false);
  const paneRef = useRef<HTMLElement | null>(null);
  const widthRef = useRef(width);
  const stopDrag = useRef<(() => void) | null>(null);
  const finishDrag = useCallback(() => stopDrag.current?.(), []);

  const apply = (next: number) => {
    widthRef.current = next;
    const pane = paneRef.current;
    if (pane) pane.style.setProperty(cssProperty, `${next}px`);
  };

  const setPaneRef = useCallback((el: HTMLElement | null) => {
    paneRef.current = el;
    if (el) el.style.setProperty(cssProperty, `${widthRef.current}px`);
  }, [cssProperty]);

  useEffect(() => {
    if (value === undefined || stopDrag.current) return;
    const next = clamp(value);
    widthRef.current = next;
    if (paneRef.current) paneRef.current.style.setProperty(cssProperty, `${next}px`);
    setWidth(next);
    // Incoming preference changes are applied without producing a new write.
  }, [value, clamp, cssProperty]);

  const commit = (next: number) => {
    const value = clamp(next);
    apply(value);
    setWidth(value);
    onCommitRef.current?.(value);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || stopDrag.current) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const vertical = direction === "top" || direction === "bottom";
    const point = (ev: { clientX: number; clientY: number }) => vertical ? ev.clientY : ev.clientX;
    const sign = direction === "left" || direction === "top" ? -1 : 1;
    const startPoint = point(event);
    const startW = widthRef.current;
    handle.setPointerCapture(pointerId);
    const endPaneResize = beginPaneResize();
    setDragging(true);
    const restoreSelection = suppressTextSelection();
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = vertical ? "row-resize" : "col-resize";
    document.documentElement.classList.add("is-resizing");
    let pending = startW;
    let frame: number | null = null;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      pending = clamp(
        startW + (point(ev) - startPoint) * sign,
      );
      if (frame != null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (widthRef.current !== pending) apply(pending);
      });
    };

    const stop = () => {
      if (stopDrag.current !== stop) return;
      stopDrag.current = null;
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", stop);
      handle.removeEventListener("lostpointercapture", stop);
      // Flush the latest sample even when release/collapse beats the queued frame.
      commit(pending);
      restoreSelection();
      document.body.style.cursor = previousCursor;
      document.documentElement.classList.remove("is-resizing");
      setDragging(false);
      endPaneResize();
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (ev.type === "pointerup") {
        pending = clamp(
          startW + (point(ev) - startPoint) * sign,
        );
      }
      stop();
    };

    stopDrag.current = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", stop);
    handle.addEventListener("lostpointercapture", stop);
  };

  useEffect(() => () => stopDrag.current?.(), []);

  const onDoubleClick = () => {
    commit(defaultRef.current);
  };

  return {
    width,
    dragging,
    setPaneRef,
    finishDrag,
    onPointerDown,
    onDoubleClick,
  };
}
