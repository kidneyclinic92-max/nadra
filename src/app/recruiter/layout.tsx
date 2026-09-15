import { requireStaff } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { DashboardNav, type NavItem } from "@/components/dashboard-nav";
import { Badge } from "@/components/ui";

const NAV_ITEMS: NavItem[] = [
  { href: "/recruiter", label: "Overview", exact: true },
  { href: "/recruiter/jobs", label: "Positions" },
  { href: "/recruiter/candidates", label: "Candidate Database" },
];

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="mb-4 hidden lg:block">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-medium text-slate-800">
              {user.email}
            </p>
            <Badge tone="info" className="mt-1.5">
              {user.role === "ADMIN" ? "Administrator" : "Recruiter"}
            </Badge>
          </div>
          <DashboardNav items={NAV_ITEMS} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
