import Image from "next/image";
import Link from "next/link";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { Button, LinkButton } from "@/components/ui";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2">
          <Image
            src="/assets/logo.jpg"
            alt="Recruitment Portal logo"
            width={500}
            height={596}
            sizes="36px"
            priority
            className="h-9 w-auto rounded transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-sm font-semibold text-slate-900">
            Recruitment Portal
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-teal-500 after:transition-transform after:duration-300 hover:text-teal-700 hover:after:scale-x-100"
          >
            Open Positions
          </Link>

          {user ? (
            <>
              <LinkButton
                href={homePathForRole(user.role)}
                variant="secondary"
                size="sm"
              >
                Dashboard
              </LinkButton>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="secondary" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/register" size="sm">
                Register
              </LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
