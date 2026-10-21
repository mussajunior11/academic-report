"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { runAction } from "@/lib/actions/run-action";
import { AppError } from "@/lib/errors";
import {
  createExaminationType,
  deleteExaminationType,
  setExaminationTypeStatus,
  updateExaminationType,
} from "@/lib/services/examinations";
import { updateSchoolLogo, updateSchoolSettings, updateSidebarTheme, updateSystemLogo, updateHeadMasterSignature } from "@/lib/services/school";
import { saveGradeRemarks } from "@/lib/services/grading";
import { examinationTypeSchema, gradeRemarksSchema, settingsSchema, sidebarThemeSchema } from "@/lib/validation/schemas";
import { zodToFieldErrors, type ActionState } from "@/lib/validation/helpers";

export async function updateSettingsAction(input: unknown): Promise<ActionState> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
  }
  return runAction(() => updateSchoolSettings(parsed.data).then(() => undefined), {
    revalidate: ["/settings", "/", "/students", "/classes", "/subjects", "/examinations"],
    successMessage: "Settings saved.",
  });
}

export async function saveGradeRemarksAction(input: unknown): Promise<ActionState> {
  const parsed = gradeRemarksSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
  }
  return runAction(() => saveGradeRemarks(parsed.data).then(() => undefined), {
    revalidate: ["/settings", "/reports", "/"],
    successMessage: "Report remarks saved.",
  });
}

export async function updateSidebarThemeAction(input: unknown): Promise<ActionState> {
  const parsed = sidebarThemeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(parsed.error) };
  }
  return runAction(
    () =>
      updateSidebarTheme({
        color: parsed.data.sidebarColor,
        opacity: parsed.data.sidebarOpacity,
      }).then(() => undefined),
    { revalidate: ["/settings", "/"], successMessage: "Sidebar appearance saved." },
  );
}

function invalid(error: z.ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(error) };
}

const typeStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export async function createExaminationTypeAction(input: unknown): Promise<ActionState> {
  const parsed = examinationTypeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => createExaminationType(parsed.data).then(() => undefined), {
    revalidate: ["/settings", "/examinations", "/"],
    successMessage: "Examination type added.",
  });
}

export async function updateExaminationTypeAction(input: unknown): Promise<ActionState> {
  const schema = examinationTypeSchema.extend({ id: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  return runAction(() => updateExaminationType(id, data).then(() => undefined), {
    revalidate: ["/settings", "/examinations", `/examinations/${id}/edit`, "/"],
    successMessage: "Examination type updated.",
  });
}

export async function setExaminationTypeStatusAction(input: unknown): Promise<ActionState> {
  const parsed = typeStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(
    () => setExaminationTypeStatus(parsed.data.id, parsed.data.status).then(() => undefined),
    {
      revalidate: ["/settings", "/examinations", "/"],
      successMessage: "Examination type status updated.",
    },
  );
}

export async function deleteExaminationTypeAction(input: unknown): Promise<ActionState> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return runAction(() => deleteExaminationType(parsed.data.id).then(() => undefined), {
    revalidate: ["/settings", "/examinations", "/"],
    successMessage: "Examination type deleted.",
  });
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const LOGO_DIR = path.join(process.cwd(), "public", "uploads");

type LogoKind = {
  basename: string;
  update: (url: string | null) => Promise<unknown>;
};

const SCHOOL_LOGO: LogoKind = { basename: "school-logo", update: updateSchoolLogo };
const SYSTEM_LOGO: LogoKind = { basename: "system-logo", update: updateSystemLogo };
const HEAD_MASTER_SIGNATURE: LogoKind = {
  basename: "head-master-signature",
  update: updateHeadMasterSignature,
};

async function removeExistingLogos(basename: string) {
  await Promise.all(
    Object.values(ALLOWED_LOGO_TYPES).map((ext) =>
      unlink(path.join(LOGO_DIR, `${basename}.${ext}`)).catch(() => undefined),
    ),
  );
}

async function saveLogo(formData: FormData, kind: LogoKind): Promise<ActionState> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file to upload." };
  }

  const ext = ALLOWED_LOGO_TYPES[file.type];
  if (!ext) {
    return { ok: false, message: "Logo must be a PNG, JPEG, WEBP or SVG image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, message: "Logo must be 2 MB or smaller." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  return runAction(
    async () => {
      try {
        await mkdir(LOGO_DIR, { recursive: true });
        await removeExistingLogos(kind.basename);
        await writeFile(path.join(LOGO_DIR, `${kind.basename}.${ext}`), bytes);
      } catch {
        throw new AppError("Could not store the logo file. Please try again.");
      }
      await kind.update(`/uploads/${kind.basename}.${ext}`);
    },
    { revalidate: ["/settings", "/"], successMessage: "Logo updated." },
  );
}

async function clearLogo(kind: LogoKind): Promise<ActionState> {
  return runAction(
    async () => {
      await removeExistingLogos(kind.basename);
      await kind.update(null);
    },
    { revalidate: ["/settings", "/"], successMessage: "Logo removed." },
  );
}

export async function uploadLogoAction(formData: FormData): Promise<ActionState> {
  return saveLogo(formData, SCHOOL_LOGO);
}

export async function removeLogoAction(): Promise<ActionState> {
  return clearLogo(SCHOOL_LOGO);
}

export async function uploadSystemLogoAction(formData: FormData): Promise<ActionState> {
  return saveLogo(formData, SYSTEM_LOGO);
}

export async function removeSystemLogoAction(): Promise<ActionState> {
  return clearLogo(SYSTEM_LOGO);
}

export async function uploadHeadMasterSignatureAction(formData: FormData): Promise<ActionState> {
  return saveLogo(formData, HEAD_MASTER_SIGNATURE);
}

export async function removeHeadMasterSignatureAction(): Promise<ActionState> {
  return clearLogo(HEAD_MASTER_SIGNATURE);
}
