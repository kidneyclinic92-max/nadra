"use client";

import { useActionState } from "react";
import { registerAction } from "@/lib/actions/auth";
import { idleState } from "@/lib/form";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, idleState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <Field label="Full name" name="fullName" error={errors.fullName} required>
        <Input
          name="fullName"
          autoComplete="name"
          placeholder="As printed on your CNIC"
          required
          error={errors.fullName}
        />
      </Field>

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

      <Field
        label="CNIC"
        name="cnic"
        error={errors.cnic}
        hint="13 digits, with or without dashes"
        required
      >
        <Input
          name="cnic"
          inputMode="numeric"
          placeholder="35202-1234567-1"
          required
          error={errors.cnic}
        />
      </Field>

      <Field
        label="Mobile number"
        name="mobile"
        error={errors.mobile}
        hint="Pakistani mobile, e.g. 0300-1234567"
        required
      >
        <Input
          name="mobile"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300-1234567"
          required
          error={errors.mobile}
        />
      </Field>

      <Field
        label="Password"
        name="password"
        error={errors.password}
        hint="At least 8 characters"
        required
      >
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password}
        />
      </Field>

      <Field
        label="Confirm password"
        name="confirmPassword"
        error={errors.confirmPassword}
        required
      >
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
        />
      </Field>

      <SubmitButton className="mt-2 w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
