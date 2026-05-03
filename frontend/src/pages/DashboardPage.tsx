import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import { getSummary } from "../api/analytics";

function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return yyyyMmDd(d);
  });
  const [to, setTo] = useState(() => yyyyMmDd(new Date()));

  const summaryQuery = useQuery({
    queryKey: ["analytics-summary", from, to],
    queryFn: () => getSummary(from, to),
  });

  return (
    <div>
      <NavBar />

      <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 720 }}>
        <h1>Dashboard</h1>

        <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching}>
            Refresh
          </button>
        </div>

        {summaryQuery.isLoading && <div>Loading summary...</div>}
        {summaryQuery.isError && (
          <div style={{ color: "crimson" }}>
            Failed to load: {(summaryQuery.error as any)?.response?.data?.detail ?? "Error"}
          </div>
        )}

        {summaryQuery.data && (
          <div style={{ display: "grid", gap: 8, border: "1px solid #ddd", padding: 16 }}>
            <div><b>Tasks created:</b> {summaryQuery.data.tasks_created}</div>
            <div><b>Tasks completed:</b> {summaryQuery.data.tasks_completed}</div>
            <div><b>Habit completions:</b> {summaryQuery.data.habit_completions}</div>
            <div><b>Active habits:</b> {summaryQuery.data.active_habits}</div>
          </div>
        )}
      </div>
    </div>
  );
}