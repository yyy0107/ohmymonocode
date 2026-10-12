import {
  memo, useCallback, useEffect, useLayoutEffect, useRef, useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion as motionElement, usePresence, useMotionValue } from "motion/react";
import { collapseTransition, duration, immediateTransition } from "../motion/tokens";
import { useMotionPreference } from "../motion/useMotionPreference";
import { SurfaceVisibilityContext, useSurfaceVisibility } from "./SurfaceVisibility";

const RetainedCollapseContent = memo(
  function RetainedCollapseContent({ children }: {
    visible: boolean;
    children: ReactNode | (() => ReactNode);
  }) {
    return typeof children === "function" ? children() : children;
  },
  (previous, next) => previous.visible === next.visible &&
    (!next.visible || previous.children === next.children),
);

/** Shared Motion lifetime for disclosures and grid-sized panels. */
export function useCollapseMotion(expanded: boolean, durationMs = duration.collapse * 1000) {
  const reduced = useMotionPreference();
  const progress = useMotionValue(expanded ? 1 : 0);
  const [foldState, setFoldState] = useState<"open" | "opening" | "closing" | "closed">(
    expanded ? "open" : "closed",
  );
  const latest = useRef(expanded);
  latest.current = expanded;
  const previous = useRef(expanded);
  const finish = useCallback(() => {
    progress.jump(latest.current ? 1 : 0);
    setFoldState(latest.current ? "open" : "closed");
  }, [progress]);
  const restart = useCallback((_milliseconds = durationMs) => {
    if (reduced) finish();
    else setFoldState(latest.current ? "opening" : "closing");
  }, [durationMs, reduced, finish]);
  useLayoutEffect(() => {
    if (reduced) { finish(); previous.current = expanded; return; }
    if (previous.current === expanded) return;
    previous.current = expanded;
    setFoldState(expanded ? "opening" : "closing");
  }, [expanded, reduced, finish]);
  return {
    foldState, finish, restart, progress,
    motionProps: {
      initial: false as const,
      transition: reduced ? immediateTransition : { ...collapseTransition, duration: durationMs / 1000 },
      onAnimationComplete: finish,
    },
  };
}

type CollapseProps = {
  expanded: boolean;
  className?: string;
  durationMs?: number;
  motion?: "grid" | "height";
  animateContentResize?: boolean;
  keepMounted?: boolean;
  onEntered?: () => void;
  children: ReactNode | (() => ReactNode);
};

export function AnimatedCollapse({
  expanded, className, durationMs, animateContentResize = false,
  keepMounted = false, onEntered, children,
}: CollapseProps) {
  const parentVisible = useSurfaceVisibility();
  const reduced = useMotionPreference();
  const lifetime = useCollapseMotion(expanded, durationMs);
  const hasOpened = useRef(expanded);
  const entered = useRef(expanded);
  if (expanded) hasOpened.current = true;
  useEffect(() => {
    if (!expanded) entered.current = false;
    else if (lifetime.foldState === "open" && !entered.current) {
      entered.current = true;
      onEntered?.();
    }
  }, [expanded, lifetime.foldState, onEntered]);
  const retained = keepMounted && hasOpened.current;
  const content = (expanded || retained) && (
        <CollapseBody
          key="collapse"
          expanded={expanded}
          className={className}
          keepMounted={keepMounted}
          parentVisible={parentVisible}
          hidden={!expanded && lifetime.foldState === "closed"}
          foldState={lifetime.foldState}
          reduced={reduced}
          durationMs={durationMs}
          animateContentResize={animateContentResize}
          finish={lifetime.finish}
        >{children}</CollapseBody>
      );
  return (
    <AnimatePresence onExitComplete={lifetime.finish}>{content}</AnimatePresence>
  );
}

function CollapseBody({
  expanded, className, keepMounted, parentVisible, hidden, foldState,
  durationMs, animateContentResize, finish, children,
}: Omit<CollapseProps, "onEntered" | "motion"> & {
  parentVisible: boolean; hidden: boolean;
  foldState: "open" | "opening" | "closing" | "closed";
  reduced: boolean; finish: () => void;
}) {
  const [present, safeToRemove] = usePresence();
  const reduced = useMotionPreference();
  useLayoutEffect(() => {
    if (reduced && !present) { safeToRemove?.(); finish(); }
  }, [reduced, present, safeToRemove, finish]);
  const visible = expanded && present && parentVisible;
  if (reduced && !present) return null;
  return (
    <motionElement.div
      data-collapse-motion="height"
      className={`zen-fold-item${className ? ` ${className}` : ""}`}
      data-fold-state={present ? foldState : "closing"}
      initial={reduced || foldState === "open" ? false : { height: 0 }}
      animate={{ height: expanded ? "auto" : 0 }}
      exit={{ height: 0 }}
      transition={reduced ? immediateTransition : {
        ...collapseTransition,
        ...(durationMs === undefined ? undefined : { duration: durationMs / 1000 }),
      }}
      layout={animateContentResize ? "size" : false}
      style={{ overflow: expanded && present && foldState === "open" ? undefined : "hidden", display: hidden ? "none" : undefined }}
      hidden={hidden}
      aria-hidden={!visible || undefined}
      inert={!visible}
      onAnimationComplete={() => { finish(); if (!present) safeToRemove?.(); }}
    >
      <div>
        <SurfaceVisibilityContext.Provider value={visible}>
          {keepMounted ? (
            <RetainedCollapseContent visible={visible}>{children}</RetainedCollapseContent>
          ) : typeof children === "function" ? children() : children}
        </SurfaceVisibilityContext.Provider>
      </div>
    </motionElement.div>
  );
}
