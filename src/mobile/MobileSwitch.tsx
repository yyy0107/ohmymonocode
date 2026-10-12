import type { InputHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { immediateTransition, motionGeometry, springs } from "../shared/motion/tokens";
import { useMotionPreference } from "../shared/motion/useMotionPreference";

/** Native checkbox semantics; Motion owns the thumb's CSS-variable travel. */
export function MobileSwitch(props: InputHTMLAttributes<HTMLInputElement>) {
  const reduced = useMotionPreference();
  return <motion.input {...props as HTMLMotionProps<"input">}
    initial={false}
    animate={{ "--mobile-switch-x": props.checked ? motionGeometry.mobileSwitchTravel : 0 }}
    transition={reduced ? immediateTransition : springs.press} />;
}
