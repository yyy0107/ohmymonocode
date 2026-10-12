import { motion as motionElement } from "motion/react";
import { panelTransition, immediateTransition } from "../../shared/motion/tokens";
import { reducedMotionQuery as motionPreferenceQuery } from "../../shared/lib/reducedMotion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useCollapseMotion } from "../../shared/ui/AnimatedCollapse";
import { SurfaceVisibilityContext } from "../../shared/ui/SurfaceVisibility";

/** Reserve the destinations' measured width without covering other chrome. */
export function TitlebarNavigation({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  const { foldState, finish } = useCollapseMotion(expanded);
  const content = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <motionElement.div
      initial={false} animate={{ gridTemplateColumns: expanded ? `${width}px` : "0px" }} transition={motionPreferenceQuery().matches ? immediateTransition : panelTransition} onAnimationComplete={finish}
      data-titlebar-navigation
      data-fold-state={foldState}
      className="animated-collapse-size grid min-w-0 shrink-0"
      aria-hidden={!expanded || undefined}
      inert={!expanded}

    >
      <div className="min-w-0 overflow-hidden">
        <div
          ref={content}
          className="w-max"
          style={{
            visibility:
              !expanded && foldState === "closed" ? "hidden" : undefined,
          }}
        >
          <SurfaceVisibilityContext.Provider value={expanded}>
            {children}
          </SurfaceVisibilityContext.Provider>
        </div>
      </div>
    </motionElement.div>
  );
}
