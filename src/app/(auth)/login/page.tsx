import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));

  return (
    <Card>
      <CardHeader
        title="Sign in"
        description="Access your applications and documents."
      />
      <CardBody>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          New candidate?{" "}
          <Link href="/register" className="font-medium text-teal-700 hover:underline">
            Create an account
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
