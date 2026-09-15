import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
          Recruitment Portal — applications are reviewed against the eligibility
          criteria published with each position.
        </div>
      </footer>
    </>
  );
}
