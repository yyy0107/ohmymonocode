import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { panelTransition, immediateTransition, motionGeometry } from "../../../shared/motion/tokens";
import { useMotionPreference } from "../../../shared/motion/useMotionPreference";
import { ProjectMascot } from "../../projects/ui/ProjectMascot";
import { useProjectMascotAppearance } from "../../projects/ui/useProjectMascotAppearance";
import { observeAnimationVisibility } from "../../../shared/lib/animationVisibility";
const RUNNER_SIZE = motionGeometry.mascotSize;
type Props = { boxRef: RefObject<HTMLElement | null>; cwd: string; busy: boolean; enabled?: boolean; onExited: () => void };
/** Static project mascot; Motion owns its exit while the provider state stays unchanged. */
export function ComposerRunner({ boxRef, cwd, busy, enabled = true, onExited }: Props) {
  const reduced = useMotionPreference();
  const { project, ...appearance } = useProjectMascotAppearance(cwd);
  const [visible, setVisible] = useState(true);
  const finished = useRef(false);
  if (busy) finished.current = false;
  const finish = useCallback(() => { if (!busy && !finished.current) { finished.current = true; onExited(); } }, [busy, onExited]);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const measure = () => { const rect = element.getBoundingClientRect(); setBox({ left: rect.left, top: rect.top }); };
    const stopVisibility = observeAnimationVisibility(element, activity => setVisible(activity.visible));
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure);
    return () => { stopVisibility(); observer.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [boxRef]);
  useEffect(() => { if (!busy && (!enabled || reduced || !box || !visible)) finish(); }, [busy, enabled, reduced, box, visible, finish]);
  return box && enabled ? createPortal(<motion.div aria-hidden data-composer-runner className="pointer-events-none fixed z-40"
    style={{ left: box.left, top: box.top - RUNNER_SIZE, width: RUNNER_SIZE, height: RUNNER_SIZE }}
    initial={false} animate={{ opacity: busy ? 1 : 0 }} transition={reduced ? immediateTransition : panelTransition}
    onAnimationComplete={finish}>
    <ProjectMascot project={project} name={appearance.name} color={appearance.color} className="size-4" />
  </motion.div>, document.body) : null;
}
