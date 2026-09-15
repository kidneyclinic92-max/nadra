"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

/** Shared easing curve (ease-out-expo) so every reveal on the site feels related. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Fades and lifts its children into place the first time they scroll into view.
 * `data-reveal` lets the no-JS fallback in the root layout force them visible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px" }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Same reveal, but children arrive one after another. Pair with `RevealItem`.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-reveal
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-72px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-reveal
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts from zero up to `to` on mount. Renders `to` for the first frame and
 * without JavaScript, so the real number is always what gets crawled.
 */
export function CountUp({
  to,
  duration = 1.5,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (reduceMotion) return;

    const controls = animate(0, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => setValue(Math.round(latest)),
    });

    return () => controls.stop();
  }, [duration, reduceMotion, to]);

  return <span className={className}>{value}</span>;
}
