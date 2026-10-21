import { ActionButton } from "@/components/ui/action-button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { PowerIcon, TrashIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/layout/app-nav";
import { listClassLevels, listClassStreams, listSubjects } from "@/lib/services/academic";
import { SubjectClassesButton, SubjectCreateForm, SubjectEditButton } from "./subjects-forms";
import { deleteSubjectAction, toggleSubjectStatusAction } from "./actions";

export const metadata = { title: "Subjects" };
export const dynamic = "force-dynamic";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const [all, classLevels, classStreams] = await Promise.all([
    listSubjects(),
    listClassLevels(),
    listClassStreams(),
  ]);

  const classOptions = classLevels.map((level) => ({
    id: level.id,
    name: level.name,
    streams: classStreams
      .filter((combination) => combination.classLevelId === level.id)
      .map((combination) => ({ id: combination.streamId, name: combination.stream.name })),
  }));

  const filtered = all.filter((subject) => {
    const matchesQ = q
      ? subject.name.toLowerCase().includes(q.toLowerCase()) ||
        (subject.code ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (subject.numericCode ?? "").toLowerCase().includes(q.toLowerCase())
      : true;
    const matchesStatus = status ? subject.status === status : true;
    return matchesQ && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Configure the subjects offered. Initial subjects are seeded and can be extended at any time."
      />

      <Card>
        <CardHeader title="Add a subject" />
        <CardBody>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <SubjectCreateForm />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Registered subjects"
          description={`${all.length} subject${all.length === 1 ? "" : "s"} configured`}
        />
        <CardBody className="space-y-4">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xs">
              <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-700">
                Search
              </label>
              <Input id="q" name="q" defaultValue={q} placeholder="Name or code" />
            </div>
            <div className="w-full sm:max-w-40">
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-700">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>
            <button type="submit" className={buttonClasses("secondary", "md")}>
              Apply
            </button>
          </form>

          {filtered.length === 0 ? (
            <EmptyState
              title="No subjects found"
              description={all.length === 0 ? "Add a subject above to get started." : "No subjects match the current filters."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Compulsory for</th>
                    <th className="px-3 py-2 font-medium">Registrations</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((subject) => (
                    <tr key={subject.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">{subject.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">
                        {subject.code || subject.numericCode ? (
                          <>
                            {subject.code ? <span>{subject.code}</span> : null}
                            {subject.numericCode ? (
                              <span className="ml-1.5 text-slate-400">{subject.numericCode}</span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {subject.compulsoryClasses.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {subject.compulsoryClasses.map((link) => (
                              <Badge key={`${link.classLevelId}:${link.streamId ?? ""}`} tone="info">
                                {link.stream ? `${link.classLevel.name} · ${link.stream.name}` : link.classLevel.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{subject._count.registrations}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={subject.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <SubjectEditButton
                            id={subject.id}
                            name={subject.name}
                            code={subject.code}
                            numericCode={subject.numericCode}
                            status={subject.status}
                          />
                          <SubjectClassesButton
                            subjectId={subject.id}
                            subjectName={subject.name}
                            classOptions={classOptions}
                            selected={subject.compulsoryClasses.map((link) => ({
                              classLevelId: link.classLevelId,
                              streamId: link.streamId,
                            }))}
                          />
                          <ActionButton
                            action={toggleSubjectStatusAction}
                            arg={{ id: subject.id, status: subject.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                            variant="ghost"
                            size="icon"
                            label={subject.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            confirmMessage={
                              subject.status === "ACTIVE"
                                ? "Deactivate this subject? It will no longer be available for new registrations."
                                : undefined
                            }
                            successMessage="Subject status updated."
                          >
                            <PowerIcon />
                          </ActionButton>
                          <ActionButton
                            action={deleteSubjectAction}
                            arg={{ id: subject.id }}
                            variant="danger"
                            size="icon"
                            label="Delete"
                            confirmMessage={`Delete ${subject.name}? This cannot be undone.`}
                            successMessage="Subject deleted."
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
