import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { useLockOverscroll } from "../../../shared/hooks/useLockOverscroll";
import { ChevronDown, ChevronUp } from "../../../shared/ui/icons";

/** Desktop skin is initialized before mounting the app, including popup windows. */
export function branchMenuLayout() {
  const desktop =
    typeof document !== "undefined" &&
    document.documentElement.hasAttribute("data-skin");
  return {
    desktop,
    width: desktop ? 320 : 280,
    maxHeight: desktop ? 360 : 280,
  };
}

/** Edge fades and scroll hints belong to the list, keeping search outside it. */
export function BranchMenuScrollArea({
  children,
}: Pick<ComponentPropsWithoutRef<"div">, "children">) {
  const scroll = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointer: number;
    y: number;
    scrollTop: number;
    ratio: number;
  } | null>(null);
  const lockOverscroll = useLockOverscroll<HTMLDivElement>();
  const [edges, setEdges] = useState({
    above: false,
    below: false,
    thumbTop: 0,
    thumbHeight: 0,
  });
  const update = useCallback(() => {
    const el = scroll.current;
    if (!el) return;
    const above = el.scrollTop > 1;
    const below = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    const thumbHeight =
      el.scrollHeight > el.clientHeight
        ? Math.min(
            el.clientHeight,
            Math.max(32, el.clientHeight ** 2 / el.scrollHeight),
          )
        : 0;
    const thumbTop = thumbHeight
      ? (el.scrollTop / (el.scrollHeight - el.clientHeight)) *
        (el.clientHeight - thumbHeight)
      : 0;
    if (!thumbHeight) drag.current = null;
    setEdges((previous) =>
      previous.above === above &&
      previous.below === below &&
      previous.thumbTop === thumbTop &&
      previous.thumbHeight === thumbHeight
        ? previous
        : { above, below, thumbTop, thumbHeight },
    );
  }, []);
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      scroll.current = el;
      lockOverscroll(el);
    },
    [lockOverscroll],
  );
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [children, update]);
  return (
    <div
      className="branch-menu-viewport"
      data-scroll-above={edges.above}
      data-scroll-below={edges.below}
    >
      <div className="branch-menu-scroll" onScroll={update} ref={attach}>
        {children}
      </div>
      {/* Keep the reference thumb visible even when the OS hides native scrollbars.
          Wheel and keyboard scrolling stay on the native overflow element. */}
      {edges.thumbHeight > 0 ? (
        <div
          aria-hidden="true"
          className="branch-menu-scroll-thumb"
          style={{ top: edges.thumbTop, height: edges.thumbHeight }}
          onPointerDown={(event) => {
            const el = scroll.current;
            if (event.button !== 0 || !el) return;
            event.preventDefault();
            const travel =
              el.getBoundingClientRect().height *
              (1 - edges.thumbHeight / el.clientHeight);
            if (travel <= 0) return;
            drag.current = {
              pointer: event.pointerId,
              y: event.clientY,
              scrollTop: el.scrollTop,
              ratio: (el.scrollHeight - el.clientHeight) / travel,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const pending = drag.current;
            if (pending?.pointer === event.pointerId && scroll.current) {
              scroll.current.scrollTop =
                pending.scrollTop + (event.clientY - pending.y) * pending.ratio;
            }
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointer !== event.pointerId) return;
            drag.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
      ) : null}
      <ChevronUp aria-hidden="true" className="branch-menu-scroll-up" />
      <ChevronDown aria-hidden="true" className="branch-menu-scroll-down" />
    </div>
  );
}
