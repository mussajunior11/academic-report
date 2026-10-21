import "server-only";

import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Validates credentials and returns the user record, or null if the email does
 * not exist, the account is inactive, or the password is wrong.
 */
export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || user.status !== "ACTIVE") return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
