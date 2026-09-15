import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));

  return (
    <Card>
      <CardHeader
        title="Create your candidate account"
        description="You will complete your full profile and upload documents in the next step."
      />
      <CardBody>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
