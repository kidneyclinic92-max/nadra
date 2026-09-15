import type { Metadata } from "next";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { EmptyState, LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Access denied" };

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        title="You do not have access to that page"
        description="Your account does not have permission to view this section of the portal."
        action={
          <LinkButton href={user ? homePathForRole(user.role) : "/"}>
            {user ? "Back to your dashboard" : "Back to home"}
          </LinkButton>
        }
      />
    </div>
  );
}
