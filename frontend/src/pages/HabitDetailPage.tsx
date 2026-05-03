import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import {getHabit, getHabitStreak, listHabitCompletions, markHabitComplete, unmarkHabitComplete,} from "../api/habits";

function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(yyyyMmDd(x));
  }
  return out.reverse();
}

export default function HabitDetailPage() {
  const { habitId } = useParams();
  const qc = useQueryClient();

  if (!habitId) return <div>Missing habit id</div>;

  const days = useMemo(() => lastNDays(30), []);
  const from = days[0];
  const to = days[days.length - 1];

  const habitQuery = useQuery({
    queryKey: ["habit", habitId],
    queryFn: () => getHabit(habitId),
  });

  const streakQuery = useQuery({
    queryKey: ["habit-streak", habitId],
    queryFn: () => getHabitStreak(habitId),
  });

  const completionsQuery = useQuery({
    queryKey: ["habit-completions-range", habitId, from, to],
    queryFn: () => listHabitCompletions(habitId, from, to),
  });

  const completionSet = useMemo(() => {
    const items = completionsQuery.data?.items ?? [];
    return new Set(items.map((x) => x.completion_date));
  }, [completionsQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: async (date: string) => {
      if (completionSet.has(date)) await unmarkHabitComplete(habitId, date);
      else await markHabitComplete(habitId, date);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["habit-streak", habitId] });
      await qc.invalidateQueries({ queryKey: ["habit-completions-range", habitId, from, to] });
    },
  });

  return (
    <div>
      <NavBar />
      <div style={{ padding: 24, display: "grid", gap: 12, maxWidth: 800 }}>
        {habitQuery.isLoading ? (
  <div>Loading habit...</div>
) : habitQuery.isError ? (
  <div style={{ color: "crimson" }}>Failed to load habit</div>
) : !habitQuery.data ? (
  <div style={{ color: "crimson" }}>No habit data</div>
) : (
  <>
    <h1 style={{ margin: 0 }}>{habitQuery.data.name}</h1>
    {habitQuery.data.description && <div>{habitQuery.data.description}</div>}
  </>
)}

        {streakQuery.data && (
          <div style={{ color: "#555" }}>
            Current streak: <b>{streakQuery.data.current_streak}</b> • Longest:{" "}
            <b>{streakQuery.data.longest_streak}</b>
          </div>
        )}

        <h3 style={{ marginBottom: 0 }}>Last 30 days</h3>

        {completionsQuery.isLoading && <div>Loading history...</div>}
        {completionsQuery.isError && <div style={{ color: "crimson" }}>Failed to load history</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {days.map((d) => {
            const done = completionSet.has(d);
            return (
              <button
                key={d}
                onClick={() => toggleMutation.mutate(d)}
                disabled={toggleMutation.isPending}
                style={{
                  padding: 8,
                  border: "1px solid #ddd",
                  background: done ? "#d1fae5" : "white",
                }}
                title={d}
              >
                {d.slice(8, 10)}
              </button>
            );
          })}
        </div>

        {toggleMutation.isError && (
          <div style={{ color: "crimson" }}>
            Toggle failed: {(toggleMutation.error as any)?.response?.data?.detail ?? "Error"}
          </div>
        )}
      </div>
    </div>
  );
}