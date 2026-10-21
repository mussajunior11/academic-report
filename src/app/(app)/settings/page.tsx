import { PageHeader } from "@/components/layout/app-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Alert } from "@/components/ui/feedback";
import { buttonClasses } from "@/components/ui/button";
import { getSchoolSettings, listAcademicYears } from "@/lib/services/school";
import { getGradeRemarks } from "@/lib/services/grading";
import { GradeRemarksForm } from "./grade-remarks-form";
import { LogoUploader } from "./logo-uploader";
import { SettingsForm } from "./settings-form";
import { SidebarThemePicker } from "./sidebar-theme-picker";
import {
  removeHeadMasterSignatureAction,
  removeLogoAction,
  removeSystemLogoAction,
  updateSettingsAction,
  updateSidebarThemeAction,
  uploadHeadMasterSignatureAction,
  uploadLogoAction,
  uploadSystemLogoAction,
} from "./actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [data, years, gradeRemarks] = await Promise.all([
    getSchoolSettings(),
    listAcademicYears(),
    getGradeRemarks(),
  ]);

  const yearOptions = years.map((y) => ({ value: y.id, label: y.name }));

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Configure the school and application defaults." />
        <Alert tone="warning">
          No school record exists yet. Run <code>npm run db:seed</code> to create the initial school and
          default configuration.
        </Alert>
      </div>
    );
  }

  const { school, settings } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage school information and application-wide defaults."
      />

      <Card>
        <CardHeader
          title="School logo"
          description="PNG, JPEG, WEBP or SVG up to 2 MB. Used on printed reports in later phases."
        />
        <CardBody>
          <LogoUploader
            logoUrl={school.logoUrl ?? settings.logoUrl ?? null}
            uploadAction={uploadLogoAction}
            removeAction={removeLogoAction}
            label="School logo"
            alt="School logo"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="System logo"
          description="PNG, JPEG, WEBP or SVG up to 2 MB. Shown in the top of the sidebar, above “Academic Report”."
        />
        <CardBody>
          <LogoUploader
            logoUrl={settings.systemLogoUrl ?? null}
            uploadAction={uploadSystemLogoAction}
            removeAction={removeSystemLogoAction}
            label="System logo"
            alt="System logo"
            previewClassName="h-16 w-32"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Head master's signature"
          description="PNG, JPEG, WEBP or SVG up to 2 MB. Stamped automatically where the Head Master signs on every report form, so reports do not need to be signed by hand."
        />
        <CardBody>
          <LogoUploader
            logoUrl={settings.headMasterSignatureUrl ?? null}
            uploadAction={uploadHeadMasterSignatureAction}
            removeAction={removeHeadMasterSignatureAction}
            label="Head master's signature"
            alt="Head master's signature"
            previewClassName="h-20 w-40"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Sidebar appearance"
          description="Choose the sidebar background colour from the swatches (or a custom colour) and set how transparent it is."
        />
        <CardBody>
          <SidebarThemePicker
            action={updateSidebarThemeAction}
            defaultValues={{ color: settings.sidebarColor, opacity: settings.sidebarOpacity }}
          />
        </CardBody>
      </Card>

      <CollapsibleCard
        title="School information"
        description="School name, contact information, location and other details that appear on report headers."
      >
        <SettingsForm
          action={updateSettingsAction}
          yearOptions={yearOptions}
          defaultValues={{
            schoolName: settings.schoolName ?? school.name,
            address: settings.address ?? school.address ?? "",
            poBox: settings.poBox ?? school.poBox ?? "",
            mobile1: settings.mobile1 ?? school.mobile1 ?? "",
            mobile2: settings.mobile2 ?? school.mobile2 ?? "",
            mobile3: settings.mobile3 ?? school.mobile3 ?? "",
            email: settings.email ?? school.email ?? "",
            website: settings.website ?? school.website ?? "",
            defaultAcademicYearId: settings.defaultAcademicYearId ?? "",
          }}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Report remarks"
        description="Remarks the Academic Master and Head Master automatically added to a student's report form, chosen by the student's average grade. A per-student remark entered on the report form overrides these."
      >
        {gradeRemarks ? (
          <GradeRemarksForm defaultValues={{ grades: gradeRemarks }} />
        ) : (
          <Alert tone="warning">The grading scale is not configured yet.</Alert>
        )}
      </CollapsibleCard>

      <Card>
        <CardHeader
          title="Users"
          description="User management will be developed in a later phase."
        />
        <CardBody>
          <button
            type="button"
            disabled
            title="User management will be available in a later phase."
            className={buttonClasses("secondary", "md")}
          >
            Manage users
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="School identity" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">School code</dt>
              <dd className="mt-0.5 font-mono text-sm text-slate-800">{school.code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(
                  school.createdAt,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Academic years</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{years.length}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            The school code is used to build internal student numbers (e.g. {school.code}/2026/0001) and is not
            editable in Phase 1.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
