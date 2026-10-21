import { PageHeader } from "@/components/layout/app-nav";
import { Alert } from "@/components/ui/feedback";
import { getGradingConfig } from "@/lib/services/grading";
import { GradingForm } from "./grading-form";

export const metadata = { title: "Grading" };
export const dynamic = "force-dynamic";

export default async function GradingPage() {
  const config = await getGradingConfig();

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grading" description="Set the grade and division scales used on marks and reports." />
        <Alert tone="warning">
          No school record exists yet. Run <code>npm run db:seed</code> to create the initial school and
          default configuration.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading"
        description="Configure the grade and division scales used when reporting marks, and the minimum average score required to pass."
      />
      <GradingForm defaultValues={config} />
    </div>
  );
}