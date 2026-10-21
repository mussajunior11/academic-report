import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session";

/** Writes a signed session cookie for the given user. */
export async function startSession(user: { id: string; name: string; email: string; role: string }) {
  const token = await createSessionToken({
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clears the session cookie. */
export async function endSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** Reads and verifies the session token, returning the payload or null. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Returns the current user, confirming the account still exists and is active.
 * Use this in server components/actions that need the authenticated identity.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.uid, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true },
  });
  return user;
}
