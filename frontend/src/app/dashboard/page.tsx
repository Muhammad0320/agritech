import { getDashboardSummaryAction } from "@/actions/logistics";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const summary = await getDashboardSummaryAction();

  return (
    <main>
      <Dashboard summary={summary} />
    </main>
  );
}
