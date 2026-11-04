import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader
        title="Forgot your password?"
        description="Enter the email you registered with and we'll send you a link to set a new one."
      />
      <CardBody>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
