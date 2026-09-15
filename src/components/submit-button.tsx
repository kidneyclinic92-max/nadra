"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Button>, "type" | "children"> & {
  children: React.ReactNode;
  pendingLabel?: string;
};

export function SubmitButton({ children, pendingLabel, ...props }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" disabled={pending || props.disabled}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
