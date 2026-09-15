import { requireRole } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { DashboardNav, type NavItem } from "@/components/dashboard-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/candidate", label: "Overview", exact: true },
  { href: "/candidate/profile", label: "Personal Details" },
  { href: "/candidate/education", label: "Education" },
  { href: "/candidate/experience", label: "Experience" },
  { href: "/candidate/documents", label: "Documents" },
  { href: "/candidate/applications", label: "My Applications" },
];

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("CANDIDATE");

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0">
          <DashboardNav items={NAV_ITEMS} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
