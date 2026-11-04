"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import { idleState } from "@/lib/form";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, idleState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <Field label="New password" name="password" error={errors.password} required>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          error={errors.password}
        />
      </Field>

      <Field
        label="Confirm new password"
        name="confirmPassword"
        error={errors.confirmPassword}
        required
      >
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          error={errors.confirmPassword}
        />
      </Field>

      <SubmitButton className="mt-2 w-full" pendingLabel="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
