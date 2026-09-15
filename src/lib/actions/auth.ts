"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  homePathForRole,
  verifyPassword,
} from "@/lib/auth";
import { errorState, type ActionState } from "@/lib/form";
import {
  fieldErrorsFrom,
  formDataToObject,
  loginSchema,
  registerSchema,
} from "@/lib/validation";
import type { Role } from "@/lib/constants";

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const { fullName, email, cnic, mobile, password } = parsed.data;

  const [existingUser, existingCandidate] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.candidate.findUnique({ where: { cnic }, select: { id: true } }),
  ]);

  if (existingUser) {
    return errorState("An account with this email already exists.", {
      email: "This email is already registered. Try signing in instead.",
    });
  }
  if (existingCandidate) {
    return errorState("An account with this CNIC already exists.", {
      cnic: "This CNIC is already registered.",
    });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: "CANDIDATE",
      candidate: {
        create: {
          fullName,
          // Collected during profile completion; seeded blank to keep signup short.
          guardianName: "",
          cnic,
          mobile,
        },
      },
    },
  });

  await createSession({ userId: user.id, email: user.email, role: "CANDIDATE" });

  // redirect() signals via an exception, so it must stay outside any try block.
  redirect("/candidate/profile?welcome=1");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // The same message covers unknown emails and wrong passwords so the form
  // cannot be used to discover which addresses have accounts.
  const invalid = errorState("Incorrect email or password.");

  if (!user) {
    // Hash anyway to keep the response time similar to a real account.
    await hashPassword(password);
    return invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;
  if (!user.isActive) {
    return errorState("This account has been deactivated. Contact the administrator.");
  }

  await createSession({
    userId: user.id,
    email: user.email,
    role: user.role as Role,
  });

  redirect(homePathForRole(user.role));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
