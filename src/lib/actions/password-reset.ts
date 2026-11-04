"use server";

import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { appBaseUrl, escapeHtml, sendEmail } from "@/lib/email";
import { errorState, successState, type ActionState } from "@/lib/form";
import {
  fieldErrorsFrom,
  formDataToObject,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueResetEmail(userId: string, email: string, name: string) {
  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Only the newest link works.
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${appBaseUrl()}/reset-password?token=${token}`;
  const greeting = name ? `Hi ${name},` : "Hi,";

  await sendEmail({
    to: email,
    subject: "Reset your password",
    text: [
      greeting,
      "",
      "We received a request to reset the password for your recruitment portal account.",
      `Open this link within 1 hour to choose a new password:`,
      link,
      "",
      "If you didn't ask for this, you can ignore this email; your password won't change.",
    ].join("\n"),
    html: `
      <p>${escapeHtml(greeting)}</p>
      <p>We received a request to reset the password for your recruitment portal account.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p>This link expires in 1 hour. If the button doesn't work, paste this into your browser:<br>${link}</p>
      <p>If you didn't ask for this, you can ignore this email; your password won't change.</p>
    `,
  });
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true, candidate: { select: { fullName: true } } },
  });

  if (user?.isActive) {
    // Sent after the response so timing doesn't reveal whether the account exists.
    after(async () => {
      try {
        await issueResetEmail(user.id, user.email, user.candidate?.fullName ?? "");
      } catch (error) {
        console.error("Failed to send password reset email", error);
      }
    });
  }

  return successState(
    "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.",
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const { token, password } = parsed.data;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return errorState("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  // Claiming the token with a conditional update makes it single-use even if
  // the form is submitted twice at once.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) {
    return errorState("This reset link has already been used. Request a new one.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  redirect("/login?reset=1");
}
