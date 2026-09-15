import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/constants";

const COOKIE_NAME = "recruitment_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a value of at least 32 characters in .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role as Role,
    };
  } catch {
    // Expired or tampered token; treat as signed out.
    return null;
  }
}

/**
 * Reads the user from the database rather than trusting the token alone, so a
 * deactivated account loses access immediately instead of at token expiry.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { candidate: { select: { id: true, fullName: true } } },
  });

  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    redirect("/unauthorized");
  }
  return user;
}

/** Recruiters and admins share the hiring-side screens. */
export async function requireStaff() {
  return requireRole("RECRUITER", "ADMIN");
}

export async function requireCandidate() {
  const user = await requireRole("CANDIDATE");
  if (!user.candidate) redirect("/candidate/profile");
  return user;
}

export function homePathForRole(role: string): string {
  switch (role) {
    case "ADMIN":
    case "RECRUITER":
      return "/recruiter";
    case "CANDIDATE":
      return "/candidate";
    default:
      return "/";
  }
}
