"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { idleState } from "@/lib/form";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, idleState);
  const errors = state.errors ?? {};

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

      <Field label="Password" name="password" error={errors.password} required>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password}
        />
      </Field>

      <SubmitButton className="mt-2 w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
