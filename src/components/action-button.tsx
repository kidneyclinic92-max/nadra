"use client";

import { useActionState } from "react";
import { idleState, type ActionState } from "@/lib/form";
import { SubmitButton } from "@/components/submit-button";
import type { ComponentProps } from "react";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Hidden fields submitted with the action, e.g. the record id. */
  fields: Record<string, string>;
  children: React.ReactNode;
  confirm?: string;
  pendingLabel?: string;
} & Pick<ComponentProps<typeof SubmitButton>, "variant" | "size" | "className">;

/** A one-click server action wrapped in its own form, with optional confirmation. */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  pendingLabel,
  ...buttonProps
}: Props) {
  const [, formAction] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton {...buttonProps} pendingLabel={pendingLabel}>
        {children}
      </SubmitButton>
    </form>
  );
}
