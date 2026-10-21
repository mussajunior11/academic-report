import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/layout/app-nav";
import {
  listClassLevels,
  listClassStreams,
  listStreams,
} from "@/lib/services/academic";
import {
  ClassLevelCreateForm,
  ClassStreamCreateForm,
  StreamCreateForm,
} from "./classes-forms";
import { ClassLevelEditButton, StreamEditButton } from "./classes-rows";
import {
  deleteClassStreamAction,
  toggleClassLevelStatusAction,
  toggleClassStreamStatusAction,
  toggleStreamStatusAction,
} from "./actions";

export const metadata = { title: "Classes & Streams" };
export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const [levels, streams, combos] = await Promise.all([
    listClassLevels(),
    listStreams(),
    listClassStreams(),
  ]);

  const classOptions = levels.map((l) => ({ value: l.id, label: l.name }));
  const streamOptions = streams.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Streams"
        description="Manage class levels, streams and the valid class-stream combinations students can be assigned to."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Class levels" description="Form 1 to Form 4 by default; add more as needed." />
          <CardBody className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <ClassLevelCreateForm />
            </div>
            {levels.length === 0 ? (
              <EmptyState title="No class levels yet" description="Add your first class level above." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Class</th>
                      <th className="px-3 py-2 font-medium">Order</th>
                      <th className="px-3 py-2 font-medium">Students</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {levels.map((level) => (
                      <tr key={level.id}>
                        <td className="px-3 py-2 font-medium text-slate-800">{level.name}</td>
                        <td className="px-3 py-2 text-slate-500">{level.sortOrder}</td>
                        <td className="px-3 py-2 text-slate-500">{level._count.students}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={level.status} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <ClassLevelEditButton
                              id={level.id}
                              name={level.name}
                              sortOrder={level.sortOrder}
                              status={level.status}
                            />
                            <ActionButton
                              action={toggleClassLevelStatusAction}
                              arg={{ id: level.id, status: level.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                              variant="ghost"
                              confirmMessage={
                                level.status === "ACTIVE"
                                  ? "Deactivate this class? Students cannot be assigned to it while inactive."
                                  : undefined
                              }
                              successMessage="Class status updated."
                            >
                              {level.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

        <Card>
          <CardHeader title="Streams" description="Streams A–E by default; add more as needed." />
          <CardBody className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <StreamCreateForm />
            </div>
            {streams.length === 0 ? (
              <EmptyState title="No streams yet" description="Add your first stream above." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Stream</th>
                      <th className="px-3 py-2 font-medium">Order</th>
                      <th className="px-3 py-2 font-medium">Students</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {streams.map((stream) => (
                      <tr key={stream.id}>
                        <td className="px-3 py-2 font-medium text-slate-800">{stream.name}</td>
                        <td className="px-3 py-2 text-slate-500">{stream.sortOrder}</td>
                        <td className="px-3 py-2 text-slate-500">{stream._count.students}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={stream.status} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <StreamEditButton
                              id={stream.id}
                              name={stream.name}
                              sortOrder={stream.sortOrder}
                              status={stream.status}
                            />
                            <ActionButton
                              action={toggleStreamStatusAction}
                              arg={{ id: stream.id, status: stream.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                              variant="ghost"
                              confirmMessage={
                                stream.status === "ACTIVE"
                                  ? "Deactivate this stream? It will no longer be available for student assignment."
                                  : undefined
                              }
                              successMessage="Stream status updated."
                            >
                              {stream.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

      <Card>
        <CardHeader
          title="Class-stream combinations"
          description="Students can only be assigned to active combinations. Duplicate combinations are prevented."
        />
        <CardBody className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <ClassStreamCreateForm classOptions={classOptions} streamOptions={streamOptions} />
          </div>
          {combos.length === 0 ? (
            <EmptyState
              title="No combinations yet"
              description="Create class-stream combinations so students can be assigned."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Stream</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combos.map((combo) => (
                    <tr key={combo.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">{combo.classLevel.name}</td>
                      <td className="px-3 py-2 text-slate-600">{combo.stream.name}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={combo.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <ActionButton
                            action={toggleClassStreamStatusAction}
                            arg={{ id: combo.id, status: combo.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }}
                            variant="ghost"
                            confirmMessage={
                              combo.status === "ACTIVE"
                                ? "Deactivate this combination? Students cannot be assigned to it while inactive."
                                : undefined
                            }
                            successMessage="Combination status updated."
                          >
                            {combo.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </ActionButton>
                          <ActionButton
                            action={deleteClassStreamAction}
                            arg={{ id: combo.id }}
                            variant="danger"
                            confirmMessage={`Delete the ${combo.classLevel.name} ${combo.stream.name} combination? This cannot be undone.`}
                            successMessage="Combination deleted."
                          >
                            Delete
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
