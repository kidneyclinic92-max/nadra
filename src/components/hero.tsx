"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  FileText,
  GraduationCap,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { CountUp, EASE_OUT } from "@/components/motion-primitives";

export type HeroProps = {
  openCount: number;
  primaryHref: string;
  primaryLabel: string;
  /** Titles of the currently advertised positions, shown in the ticker. */
  spotlight: string[];
};

export function Hero({ openCount, primaryHref, primaryLabel, spotlight }: HeroProps) {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE_OUT },
        };

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <Backdrop />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-4 pt-20 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pt-28 lg:pb-28">
        <div>
          <motion.div {...fadeUp(0)}>
            <Link
              href="/jobs"
              className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pr-3 pl-2.5 text-xs font-medium text-slate-200 backdrop-blur-sm transition hover:border-teal-300/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-teal-400" />
                <span className="relative size-2 rounded-full bg-teal-400" />
              </span>
              {openCount} position{openCount === 1 ? "" : "s"} open right now
              <ArrowRight className="size-3.5 text-teal-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <h1
            className="mt-7 text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            aria-label="One profile. Every position you are eligible for."
          >
            <span aria-hidden className="block text-white">
              <RisingWords text="One profile." delay={0.1} />
            </span>
            <span
              aria-hidden
              className="mt-1.5 block bg-gradient-to-r from-teal-200 via-emerald-100 to-teal-400 bg-clip-text text-transparent"
            >
              <RisingWords text="Every position you are eligible for." delay={0.28} />
            </span>
          </h1>

          <motion.p
            className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300"
            {...fadeUp(0.55)}
          >
            Create your profile once, upload your CNIC, domicile, degrees and resume, then
            apply to any open position without filling the same form again. Recruiters
            shortlist against the criteria published on each advertisement.
          </motion.p>

          <motion.div className="mt-9 flex flex-wrap items-center gap-3" {...fadeUp(0.68)}>
            <Link
              href={primaryHref}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-teal-300 to-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:shadow-teal-400/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[200%]"
              />
              <span className="relative">{primaryLabel}</span>
              <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <Search className="size-4 text-teal-300" />
              Browse open positions
            </Link>
          </motion.div>

          <motion.dl
            className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-7"
            {...fadeUp(0.8)}
          >
            <HeroStat value={<CountUp to={openCount} />} label="Live positions" />
            <HeroStat value={<CountUp to={4} />} label="Documents, uploaded once" />
            <HeroStat value="1" label="Profile for every application" />
          </motion.dl>
        </div>

        <ReadinessCard />
      </div>

      {spotlight.length > 0 ? <Ticker items={spotlight} /> : null}

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent"
      />
    </section>
  );
}

/* ------------------------------------------------------------- decoration */

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(125%_120%_at_12%_0%,#0d3b3d_0%,#061225_48%,#020617_100%)]" />

      <div className="absolute -top-44 -left-28 size-[38rem] animate-aurora rounded-full bg-teal-500/25 blur-[130px]" />
      <div className="absolute -right-32 top-4 size-[32rem] animate-aurora rounded-full bg-emerald-400/20 blur-[130px] [animation-delay:-8s]" />
      <div className="absolute -bottom-56 left-1/3 size-[34rem] animate-aurora rounded-full bg-sky-500/15 blur-[140px] [animation-delay:-16s]" />

      <div className="fade-radial bg-hairline-grid absolute inset-0 text-white/[0.06]" />

      <div className="absolute inset-x-0 top-0 h-px animate-sheen bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

function RisingWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");

  return (
    <>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="mr-[0.24em] inline-block overflow-hidden pb-[0.16em] align-bottom -mb-[0.16em]"
        >
          <motion.span
            className="inline-block"
            initial={reduceMotion ? undefined : { y: "115%" }}
            animate={reduceMotion ? undefined : { y: 0 }}
            transition={{ duration: 0.9, delay: delay + index * 0.06, ease: EASE_OUT }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </>
  );
}

function HeroStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block bg-gradient-to-br from-white to-slate-400 bg-clip-text text-3xl font-semibold text-transparent tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-xs leading-snug text-slate-400">{label}</span>
      </dd>
    </div>
  );
}

/* ----------------------------------------------------------- profile card */

const CHECKLIST = [
  { icon: UserRound, label: "Personal details & address", meta: "Complete" },
  { icon: MapPin, label: "Domicile & quota category", meta: "Complete" },
  { icon: GraduationCap, label: "Education history", meta: "Complete" },
  { icon: Briefcase, label: "Work experience", meta: "Complete" },
  { icon: FileText, label: "CNIC, degrees & resume", meta: "4 files" },
] as const;

function ReadinessCard() {
  const reduceMotion = useReducedMotion();

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const spring = { stiffness: 140, damping: 20, mass: 0.4 };
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-9, 9]), spring);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width);
    pointerY.set((event.clientY - bounds.top) / bounds.height);
  }

  function resetTilt() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <motion.div
      className="relative will-change-transform"
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1300 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      initial={reduceMotion ? undefined : { opacity: 0, y: 40, scale: 0.97 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.35, ease: EASE_OUT }}
    >
      <div className="ring-gradient rounded-[1.75rem] p-px shadow-2xl shadow-teal-950/60">
        <div className="rounded-[calc(1.75rem-1px)] bg-slate-900/70 p-6 backdrop-blur-xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-teal-300/80 uppercase">
                Your profile
              </p>
              <p className="mt-1.5 text-lg font-semibold text-white">Ready to apply</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/10 px-2.5 py-1 text-xs font-medium text-teal-200 ring-1 ring-teal-300/25 ring-inset">
              <BadgeCheck className="size-3.5" />
              Reusable
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between text-xs text-slate-400">
              <span>Profile completeness</span>
              <span className="font-semibold text-white tabular-nums">100%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-300"
                initial={{ width: reduceMotion ? "100%" : "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.4, delay: 0.7, ease: EASE_OUT }}
              />
            </div>
          </div>

          <motion.ul
            className="mt-6 space-y-2.5"
            initial={reduceMotion ? undefined : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.75 } },
            }}
          >
            {CHECKLIST.map(({ icon: Icon, label, meta }) => (
              <motion.li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition hover:border-teal-300/20 hover:bg-white/[0.06]"
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  visible: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.55, ease: EASE_OUT }}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-400/10 text-teal-300 ring-1 ring-teal-300/20 ring-inset">
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-sm text-slate-200">{label}</span>
                <span className="text-xs text-slate-500">{meta}</span>
              </motion.li>
            ))}
          </motion.ul>

          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
            Once these are in place, every application is a single click — and each one
            shows exactly which eligibility criteria you meet.
          </p>
        </div>
      </div>

      <motion.div
        className="absolute -bottom-6 -left-4 hidden animate-float items-center gap-2.5 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 shadow-xl shadow-slate-950/50 backdrop-blur-xl sm:flex"
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.3, ease: EASE_OUT }}
      >
        <ShieldCheck className="size-4 text-emerald-300" />
        <span className="text-xs font-medium text-slate-200">
          Shortlisted against published criteria
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------- job ticker */

function Ticker({ items }: { items: string[] }) {
  return (
    <div className="relative border-t border-white/10 bg-slate-950/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <span className="hidden shrink-0 text-[0.7rem] font-semibold tracking-[0.18em] text-teal-300/80 uppercase sm:block">
          Now advertised
        </span>
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center gap-9 pr-9"
              >
                {items.map((title, index) => (
                  <li
                    key={`${copy}-${title}-${index}`}
                    className="flex shrink-0 items-center gap-2.5 text-sm whitespace-nowrap text-slate-300"
                  >
                    <span className="size-1.5 rounded-full bg-teal-400/70" />
                    {title}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
