import Link from "next/link";
import { ArrowRight, FileCheck2, ListChecks, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { Hero } from "@/components/hero";
import { JobCard } from "@/components/job-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion-primitives";
import { EmptyState, LinkButton } from "@/components/ui";

export default async function HomePage() {
  const [user, jobs, openCount] = await Promise.all([
    getCurrentUser(),
    prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: [{ closingDate: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <>
      <Hero
        openCount={openCount}
        primaryHref={user ? homePathForRole(user.role) : "/register"}
        primaryLabel={user ? "Go to dashboard" : "Create your profile"}
        spotlight={jobs.map((job) => job.title)}
      />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Latest openings
            </h2>
            <p className="mt-1 text-sm text-slate-600">Closing soonest first.</p>
          </div>
          <Link
            href="/jobs"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 transition hover:text-teal-800"
          >
            View all positions
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        {jobs.length === 0 ? (
          <Reveal>
            <EmptyState
              title="No positions are open right now"
              description="Create your profile so you are ready to apply the moment a position is advertised."
              action={<LinkButton href="/register">Create your profile</LinkButton>}
            />
          </Reveal>
        ) : (
          <RevealGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <RevealItem key={job.id} className="h-full">
                <JobCard job={job} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </section>

      <section className="relative overflow-hidden border-t border-slate-200 bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-teal-100/50 blur-[120px]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <Reveal className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-teal-700 uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Three steps, then you are done re-typing forms
            </h2>
          </Reveal>

          <RevealGroup className="mt-10 grid gap-8 sm:grid-cols-3" delay={0.1}>
            <RevealItem>
              <Step
                icon={<UserPlus className="size-5" />}
                number="1"
                title="Register and complete your profile"
                body="Personal details, address, domicile and quota category — captured once and reused on every application."
              />
            </RevealItem>
            <RevealItem>
              <Step
                icon={<FileCheck2 className="size-5" />}
                number="2"
                title="Upload your documents"
                body="CNIC, domicile certificate, educational documents and resume are stored securely and shared only with recruiters."
              />
            </RevealItem>
            <RevealItem>
              <Step
                icon={<ListChecks className="size-5" />}
                number="3"
                title="Apply and track"
                body="Every application shows exactly which eligibility criteria you meet, and where it stands in the review."
              />
            </RevealItem>
          </RevealGroup>
        </div>
      </section>
    </>
  );
}

function Step({
  icon,
  number,
  title,
  body,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative h-full rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-700 ring-1 ring-teal-200/70 ring-inset transition duration-300 group-hover:from-teal-100 group-hover:to-emerald-100">
          {icon}
        </span>
        <span className="font-mono text-xs font-semibold tracking-wider text-slate-400">
          STEP {number}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
