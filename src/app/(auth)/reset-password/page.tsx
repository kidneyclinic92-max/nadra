import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardHeader
        title="Choose a new password"
        description="Use at least 8 characters. You'll sign in with it next."
      />
      <CardBody>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Alert tone="danger">
            This reset link is incomplete. Open the link from your email again, or request a new
            one.
          </Alert>
        )}
        <p className="mt-6 text-center text-sm text-slate-600">
          Need a new link?{" "}
          <Link href="/forgot-password" className="font-medium text-teal-700 hover:underline">
            Request another
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
