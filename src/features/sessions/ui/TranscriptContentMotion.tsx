import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatedCollapse } from "../../../shared/ui/AnimatedCollapse";
import { reducedMotionQuery } from "../../../shared/lib/reducedMotion";
import { useSurfaceVisibility } from "../../../shared/ui/SurfaceVisibility";

/** Only messages received while this surface is visible get an entrance. */
export function useMessageArrivals(
  entries: readonly { id: string }[],
  visible: boolean,
  animateFrom?: string,
  history?: readonly { id: string }[],
) {
  const seen = useRef(new Set<string>());
  const seeded = useRef(false);
  // An empty loading frame is not the history baseline. Match text reveal by
  // seeding the first populated snapshot, except output after an explicit send.
  if (!seeded.current && entries.length > 0) {
    const start = animateFrom ? entries.findIndex(entry => entry.id === animateFrom) : -1;
    seen.current = new Set((start < 0 ? entries : entries.slice(0, start + 1)).map(entry => entry.id));
    seeded.current = true;
  }
  const wasVisible = useRef(visible);
  if (!visible || !wasVisible.current)
    for (const entry of entries) seen.current.add(entry.id);
  for (const entry of history ?? []) seen.current.add(entry.id);
  useLayoutEffect(() => {
    for (const entry of entries) seen.current.add(entry.id);
    wasVisible.current = visible;
  });
  return (id: string) => !seen.current!.has(id);
}

/** A whole message glides in once; streamed growth uses shared height motion. */
export function TranscriptContentMotion({
  arrive = false, resize = true, as: Container = "div", className, children,
}: { arrive?: boolean; resize?: boolean; as?: "div" | "li"; className?: string; children: ReactNode }) {
  const visible = useSurfaceVisibility();
  const element = useRef<HTMLElement | null>(null);
  const initialArrival = useRef(arrive);
  const [expanded, setExpanded] = useState(!arrive);
  useLayoutEffect(() => { setExpanded(true); }, []);
  useLayoutEffect(() => {
    const node = element.current;
    if (!initialArrival.current || !visible || !node?.animate || reducedMotionQuery().matches) return;
    const animation = node.animate(
      [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    void animation.finished.catch(() => undefined);
    return () => animation.cancel();
    // Updates to an existing message must not restart its entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Container ref={(node: HTMLElement | null) => { element.current = node; }} className={className} data-transcript-content-motion>
      <AnimatedCollapse expanded={expanded} motion="height" animateContentResize={visible && resize} durationMs={280}>
        {children}
      </AnimatedCollapse>
    </Container>
  );
}
