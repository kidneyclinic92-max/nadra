"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import { idleState } from "@/lib/form";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, idleState);
  const errors = state.errors ?? {};

  if (state.status === "success") {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <Field label="Email address" name="email" error={errors.email} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          error={errors.email}
        />
      </Field>

      <SubmitButton className="mt-2 w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
