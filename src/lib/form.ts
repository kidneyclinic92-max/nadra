import type { FieldErrors } from "@/lib/validation";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
};

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, errors?: FieldErrors): ActionState {
  return { status: "error", message, errors };
}

export function successState(message: string): ActionState {
  return { status: "success", message };
}
