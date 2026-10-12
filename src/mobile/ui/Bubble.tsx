import { motion, type HTMLMotionProps } from "motion/react";
import { msgTransition, immediateTransition, motionDistance } from "../../shared/motion/tokens";
import { useMotionPreference } from "../../shared/motion/useMotionPreference";
import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/**
 * Message-app bubble: yours on the right in the user tone with a squared
 * bottom-right corner, the agent's on the left in the card tone.
 */
export function Bubble({ from, className, ...props }:
  HTMLAttributes<HTMLDivElement> & { from: "user" | "agent" }) {
  const reduced = useMotionPreference();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: motionDistance.msg }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? immediateTransition : msgTransition}
      layout="position"
      className={cx(
        "max-w-[80%] rounded-m-bubble px-3.5 py-2 text-m-body break-words",
        from === "user"
          ? "self-end rounded-br-md bg-m-bubble-user text-m-bubble-user-ink"
          : "self-start rounded-bl-md bg-m-card text-m-ink",
        className,
      )}
      {...props as HTMLMotionProps<"div">}
    />
  );
}

/** Three 8px dots that hop 3px in turn while a reply is on its way. */
export function TypingDots({ label, className }: { label: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={cx("inline-flex items-center gap-1.5 px-1 py-2", className)}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-2 animate-m-typing rounded-full bg-m-ink-secondary"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </span>
  );
}
