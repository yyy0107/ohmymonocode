import { createElement, forwardRef, useEffect, useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";
import type * as Motion from "motion/react";

export function completeMotionAnimation(element: Element | null | undefined) {
  element?.querySelectorAll("*").forEach((child) => child.dispatchEvent(new Event("motiontestcomplete")));
  element?.dispatchEvent(new Event("motiontestcomplete"));
}

/** Deterministic engine boundary for gesture/portal tests; browsers verify actual interpolation. */
export function motionTestDriver(actual: typeof Motion, presence = false) {
  type ControlListener = (target: Record<string, any> | null, animate: boolean) => void;
  const useAnimationControls = () => {
    const controls = useRef<ReturnType<typeof makeControls> | null>(null);
    if (!controls.current) controls.current = makeControls();
    return controls.current;
  };
  const makeControls = () => {
    const listeners = new Set<ControlListener>();
    return {
      subscribeTest: (listener: ControlListener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
      start: (target: Record<string, any>) => {
        for (const listener of listeners) listener(target, true);
        return Promise.resolve();
      },
      set: (target: Record<string, any>) => {
        for (const listener of listeners) listener(target, false);
      },
      stop: () => { for (const listener of listeners) listener(null, false); },
    };
  };
  const jobs = new Map<(...args: any[]) => void, number>();
  const schedule = (callback: (...args: any[]) => void) => {
    if (jobs.has(callback)) return;
    const id = window.requestAnimationFrame((time) => {
      jobs.delete(callback);
      callback(time);
    });
    jobs.set(callback, id);
  };
  const cancelFrame = (callback: (...args: any[]) => void) => {
    const id = jobs.get(callback);
    if (id !== undefined) window.cancelAnimationFrame(id);
    jobs.delete(callback);
  };
  const animate = (subject: unknown, target: unknown, options: Record<string, any> = {}) => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animationFrame: number | undefined;
    const started = performance.now();
    const duration = (options.duration ?? 0) * 1000;
    const tick = (now: number) => {
      if (stopped) return;
      const progress = duration ? Math.min(1, Math.max(0, (now - started) / duration)) : 1;
      options.onUpdate?.(Number(subject) + (Number(target) - Number(subject)) * progress);
      if (progress === 1) options.onComplete?.();
      else animationFrame = window.requestAnimationFrame(tick);
    };
    if (typeof subject === "number") animationFrame = window.requestAnimationFrame(tick);
    else timer = setTimeout(() => { if (!stopped) options.onComplete?.(); }, duration);
    return {
      stop: () => {
        stopped = true;
        clearTimeout(timer);
        if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      },
    };
  };
  const components = new Map<string, unknown>();
  const motion = presence ? new Proxy({}, { get: (_, tag: string) => {
    if (tag === "create") return actual.motion.create;
    if (!components.has(tag)) {
      components.set(tag, forwardRef<HTMLElement, ComponentPropsWithoutRef<"div"> & Record<string, any>>(function MotionElement(props, ref) {
        const [present, remove] = actual.usePresence();
        const node = useRef<HTMLElement | null>(null);
        const { initial: _initial, animate: _animate, exit: _exit, transition, layout: _layout, layoutId: _layoutId, onAnimationComplete: _complete, onAnimationStart: _start, ...dom } = props;
        const complete = useRef(_complete);
        complete.current = _complete;
        const start = useRef(_start);
        start.current = _start;
        const controls = _animate?.subscribeTest ? _animate as ReturnType<typeof makeControls> : undefined;
        useLayoutEffect(() => {
          if (!controls) return;
          let timer: ReturnType<typeof setTimeout> | undefined;
          let previous = "";
          const unsubscribe = controls.subscribeTest((target, animated) => {
            clearTimeout(timer);
            if (!target || !node.current) return;
            const { transition: timing, ...values } = target;
            Object.assign(node.current.style, values);
            const key = JSON.stringify(values);
            if (animated && key !== previous) start.current?.(values);
            previous = key;
            if (!animated) return;
            if (!timing?.duration) complete.current?.(values);
            else timer = setTimeout(() => complete.current?.(values), timing.duration * 1000);
          });
          return () => { clearTimeout(timer); unsubscribe(); };
        }, [controls]);
        const animateKey = JSON.stringify(_animate);
        useEffect(() => {
          const finish = () => { complete.current?.(_animate); if (!present) remove?.(); };
          const element = node.current;
          element?.addEventListener("motiontestcomplete", finish);
          return () => element?.removeEventListener("motiontestcomplete", finish);
        }, [present, remove, animateKey]);
        const previousAnimation = useRef(animateKey);
        useLayoutEffect(() => {
          if (!present || controls) return;
          const changed = previousAnimation.current !== animateKey;
          previousAnimation.current = animateKey;
          if (changed) _start?.(_animate);
          if (!transition?.duration) { complete.current?.(_animate); return; }
          const timer = setTimeout(() => complete.current?.(_animate), transition.duration * 1000);
          return () => clearTimeout(timer);
        }, [present, animateKey, transition?.duration, controls]);
        useEffect(() => {
          if (present) return;
          const timer = setTimeout(() => { complete.current?.(_exit); remove?.(); }, (transition?.duration ?? 0) * 1000);
          return () => clearTimeout(timer);
        }, [present, remove, transition?.duration]);
        if (_animate && typeof _animate === "object") {
          for (const property of ["width", "height", "gridTemplateColumns", "gridTemplateRows"])
            if (property in _animate) dom.style = { ...dom.style, [property]: _animate[property] };
        }
        return createElement(tag, { ...dom, ref: (element: HTMLElement | null) => {
          node.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
          // Motion paints after ref attachment, including refs that set size.
          if (element && _animate && typeof _animate === "object") {
            for (const property of ["width", "height", "gridTemplateColumns", "gridTemplateRows"])
              if (property in _animate) element.style.setProperty(
                property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
                typeof _animate[property] === "number" ? `${_animate[property]}px` : _animate[property],
              );
          }
        } });
      }));
    }
    return components.get(tag);
  } }) : actual.motion;
  return { animate, cancelFrame, frame: { ...actual.frame, render: schedule, update: schedule }, motion, ...(presence ? { useAnimationControls } : {}) };
}
