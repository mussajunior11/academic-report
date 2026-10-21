import Link from "next/link";
import { PageHeader } from "@/components/layout/app-nav";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/feedback";
import { PowerIcon, TrashIcon } from "@/components/ui/icons";
import { listExaminationTypes } from "@/lib/services/examinations";
import { ExaminationTypeCreateForm, ExaminationTypeEditButton } from "../examination-types";
import { deleteExaminationTypeAction, setExaminationTypeStatusAction } from "../actions";

export const metadata = { title: "Examination types" };
export const dynamic = "force-dynamic";

export default async function ExaminationTypesSettingsPage() {
  const examTypes = await listExaminationTypes();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination types"
        description="Manage the types (e.g. ANNUAL, TERMINAL, MIDTERM) available when creating examinations."
        actions={
          <Link href="/settings" className={buttonClasses("secondary", "md")}>
            Back to settings
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Examination types"
          description={`Manage the types available when creating examinations. ${examTypes.length} type${examTypes.length === 1 ? "" : "s"} configured.`}
        />
        <CardBody className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <ExaminationTypeCreateForm />
          </div>

          {examTypes.length === 0 ? (
            <EmptyState
              title="No examination types"
              description="Add an examination type above to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {examTypes.map((type) => (
                    <tr key={type.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">{type.name}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={type.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <ExaminationTypeEditButton id={type.id} name={type.name} status={type.status} />
                          <ActionButton
                            action={setExaminationTypeStatusAction}
                            arg={{ id: type.id, status: type.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                            variant="ghost"
                            size="icon"
                            label={type.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            confirmMessage={
                              type.status === "ACTIVE"
                                ? "Deactivate this examination type? It will no longer be selectable for new examinations."
                                : undefined
                            }
                            successMessage="Examination type status updated."
                          >
                            <PowerIcon />
                          </ActionButton>
                          <ActionButton
                            action={deleteExaminationTypeAction}
                            arg={{ id: type.id }}
                            variant="danger"
                            size="icon"
                            label="Delete"
                            confirmMessage={`Delete ${type.name}? This cannot be undone.`}
                            successMessage="Examination type deleted."
                          >
                            <TrashIcon />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
