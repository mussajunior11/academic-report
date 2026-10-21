import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError, toFriendlyError } from "@/lib/errors";
import { normalizeHex, DEFAULT_SIDEBAR_THEME, type SidebarThemeValues } from "@/lib/utils/color";
import type { SettingsInput } from "@/lib/validation/schemas";

/** Phase 1 is single-school. Returns the first configured school, or null. */
export async function getPrimarySchool() {
  return prisma.school.findFirst({ orderBy: { createdAt: "asc" } });
}

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

export async function getSchoolSettings() {
  const school = await getPrimarySchool();
  if (!school) return null;

  const settings =
    (await prisma.schoolSettings.findUnique({ where: { schoolId: school.id } })) ??
    (await prisma.schoolSettings.create({ data: { schoolId: school.id, schoolName: school.name } }));

  return { school, settings };
}

export async function listAcademicYears() {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.academicYear.findMany({
    where: { schoolId: school.id },
    orderBy: [{ isCurrent: "desc" }, { name: "desc" }],
  });
}

export async function getCurrentAcademicYear() {
  const school = await getPrimarySchool();
  if (!school) return null;
  return (
    (await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true },
      orderBy: { name: "desc" },
    })) ??
    (await prisma.academicYear.findFirst({
      where: { schoolId: school.id },
      orderBy: { name: "desc" },
    }))
  );
}

function normalized(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateSchoolSettings(input: SettingsInput) {
  const school = await requireSchool();

  if (input.defaultAcademicYearId) {
    const year = await prisma.academicYear.findFirst({
      where: { id: input.defaultAcademicYearId, schoolId: school.id },
    });
    if (!year) throw new AppError("Select a valid default academic year.");
  }

  const shared = {
    address: normalized(input.address),
    mobile1: normalized(input.mobile1),
    mobile2: normalized(input.mobile2),
    mobile3: normalized(input.mobile3),
    email: normalized(input.email),
    website: normalized(input.website),
    poBox: normalized(input.poBox),
  };

  try {
    await prisma.$transaction([
      prisma.school.update({ where: { id: school.id }, data: { name: input.schoolName, ...shared } }),
      prisma.schoolSettings.upsert({
        where: { schoolId: school.id },
        create: {
          schoolId: school.id,
          schoolName: input.schoolName,
          defaultAcademicYearId: normalized(input.defaultAcademicYearId),
          ...shared,
        },
        update: {
          schoolName: input.schoolName,
          defaultAcademicYearId: normalized(input.defaultAcademicYearId),
          ...shared,
        },
      }),
    ]);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateSchoolLogo(logoUrl: string | null) {
  const school = await requireSchool();
  const logoUpdatedAt = logoUrl ? new Date() : null;
  await prisma.$transaction([
    prisma.school.update({ where: { id: school.id }, data: { logoUrl, logoUpdatedAt } }),
    prisma.schoolSettings.upsert({
      where: { schoolId: school.id },
      create: { schoolId: school.id, schoolName: school.name, logoUrl, logoUpdatedAt },
      update: { logoUrl, logoUpdatedAt },
    }),
  ]);
}

/** The system (application) logo shown in the sidebar, or null when unset. */
export async function getSystemLogoUrl(): Promise<string | null> {
  const school = await getPrimarySchool();
  if (!school) return null;
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId: school.id },
    select: { systemLogoUrl: true },
  });
  return settings?.systemLogoUrl ?? null;
}

export async function updateSystemLogo(logoUrl: string | null) {
  const school = await requireSchool();
  const systemLogoUpdatedAt = logoUrl ? new Date() : null;
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    create: { schoolId: school.id, schoolName: school.name, systemLogoUrl: logoUrl, systemLogoUpdatedAt },
    update: { systemLogoUrl: logoUrl, systemLogoUpdatedAt },
  });
}

/** The head master's signature/stamp image printed on report forms, or null. */
export async function getHeadMasterSignatureUrl(): Promise<string | null> {
  const school = await getPrimarySchool();
  if (!school) return null;
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId: school.id },
    select: { headMasterSignatureUrl: true },
  });
  return settings?.headMasterSignatureUrl ?? null;
}

export async function updateHeadMasterSignature(url: string | null) {
  const school = await requireSchool();
  const headMasterSignatureUpdatedAt = url ? new Date() : null;
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    create: { schoolId: school.id, schoolName: school.name, headMasterSignatureUrl: url, headMasterSignatureUpdatedAt },
    update: { headMasterSignatureUrl: url, headMasterSignatureUpdatedAt },
  });
}

/** Sidebar background colour (hex) and opacity percentage. */
export type SidebarTheme = SidebarThemeValues;

export async function getSidebarTheme(): Promise<SidebarTheme> {
  const school = await getPrimarySchool();
  if (!school) return DEFAULT_SIDEBAR_THEME;
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId: school.id },
    select: { sidebarColor: true, sidebarOpacity: true },
  });
  return {
    color: normalizeHex(settings?.sidebarColor ?? "") ?? DEFAULT_SIDEBAR_THEME.color,
    opacity: settings?.sidebarOpacity ?? DEFAULT_SIDEBAR_THEME.opacity,
  };
}

export async function updateSidebarTheme(input: SidebarTheme) {
  const school = await requireSchool();
  const color = normalizeHex(input.color) ?? DEFAULT_SIDEBAR_THEME.color;
  const opacity = Math.min(100, Math.max(0, Math.round(input.opacity)));
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    create: { schoolId: school.id, schoolName: school.name, sidebarColor: color, sidebarOpacity: opacity },
    update: { sidebarColor: color, sidebarOpacity: opacity },
  });
}
