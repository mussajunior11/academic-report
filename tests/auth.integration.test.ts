import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { authenticateUser } from "@/lib/auth/service";

beforeAll(async () => {
  await prisma.user.create({
    data: {
      name: "Integration Admin",
      email: "admin@test.local",
      passwordHash: await hashPassword("Secret@123"),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
});

describe("authenticateUser", () => {
  it("returns the user for valid credentials", async () => {
    const user = await authenticateUser("admin@test.local", "Secret@123");
    expect(user?.email).toBe("admin@test.local");
  });

  it("is case-insensitive on the email", async () => {
    const user = await authenticateUser("ADMIN@TEST.LOCAL", "Secret@123");
    expect(user?.id).toBeTruthy();
  });

  it("returns null for a wrong password", async () => {
    expect(await authenticateUser("admin@test.local", "nope")).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    expect(await authenticateUser("missing@test.local", "Secret@123")).toBeNull();
  });
});
