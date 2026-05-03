import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import {
  createHabit,
  getHabitStreak,
  listHabits,
  markHabitComplete,
  unmarkHabitComplete,
} from "../api/habits";
import { listHabitCompletions } from "../api/habits";
import { Link } from "react-router-dom";

function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function HabitsPage() {
  const qc = useQueryClient();

  const today = useMemo(() => yyyyMmDd(new Date()), []);

  const [name, setName] = useState("");
  const [targetDays, setTargetDays] = useState(5);

  const habitsQuery = useQuery({
    queryKey: ["habits", false],
    queryFn: () => listHabits({ archived: false, limit: 50, offset: 0 }),
  });

  const createMutation = useMutation({
    mutationFn: () => createHabit({ name, target_days_per_week: targetDays }),
    onSuccess: async () => {
      setName("");
      setTargetDays(5);
      await qc.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (args: { habitId: string; completed: boolean }) => {
      if (args.completed) await markHabitComplete(args.habitId, today);
      else await unmarkHabitComplete(args.habitId, today);
    },
    onSuccess: async () => {
      // refresh habits list + streaks
      await qc.invalidateQueries({ queryKey: ["habits"] });
      await qc.invalidateQueries({ queryKey: ["habit-streak"] });
    },
  });

  return (
    <div>
      <NavBar />

      <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 720 }}>
        <h1>Habits</h1>

        {/* Create */}
        <div style={{ border: "1px solid #ddd", padding: 16, display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Create Habit</h3>

          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit name" />

          <label style={{ display: "grid", gap: 4 }}>
            <span>Target days/week</span>
            <input
              type="number"
              min={0}
              max={7}
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value))}
            />
          </label>

          <button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>

          {createMutation.isError && (
            <div style={{ color: "crimson" }}>
              Failed: {(createMutation.error as any)?.response?.data?.detail ?? "Error"}
            </div>
          )}
        </div>

        {/* List */}
        {habitsQuery.isLoading && <div>Loading habits...</div>}
        {habitsQuery.isError && (
          <div style={{ color: "crimson" }}>
            Failed: {(habitsQuery.error as any)?.response?.data?.detail ?? "Error"}
          </div>
        )}

        {habitsQuery.data && (
          <div style={{ display: "grid", gap: 8 }}>
            {habitsQuery.data.items.length === 0 ? (
              <div>No habits yet.</div>
            ) : (
              habitsQuery.data.items.map((h) => <HabitRow key={h.id} habitId={h.id} name={h.name} today={today} />)
            )}
          </div>
        )}

        {completeMutation.isError && (
          <div style={{ color: "crimson" }}>
            Completion failed: {(completeMutation.error as any)?.response?.data?.detail ?? "Error"}
          </div>
        )}
      </div>
    </div>
  );
}

function HabitRow(props: { habitId: string; name: string; today: string }) {
  
  const { habitId, name, today } = props;

  const completionsTodayQuery = useQuery({
  queryKey: ["habit-completions", habitId, today],
  queryFn: () => listHabitCompletions(habitId, today, today),
  });

const doneToday = (completionsTodayQuery.data?.total ?? 0) > 0;

  const streakQuery = useQuery({
    queryKey: ["habit-streak", habitId],
    queryFn: () => getHabitStreak(habitId),
  });

  const qc = useQueryClient();
  const toggleMutation = useMutation({
  mutationFn: async () => {
    if (doneToday) await unmarkHabitComplete(habitId, today);
    else await markHabitComplete(habitId, today);
  },
  onSuccess: async () => {
    await qc.invalidateQueries({ queryKey: ["habit-streak", habitId] });
    await qc.invalidateQueries({ queryKey: ["habit-completions", habitId, today] });
  },
});

<Link to={`/habits/${habitId}`} style={{ fontWeight: 600, textDecoration: "none" }}>
  {name}
</Link>

  const currentlyCompleted = (streakQuery.data?.current_streak ?? 0) > 0;

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {streakQuery.data && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Current: {streakQuery.data.current_streak} • Longest: {streakQuery.data.longest_streak}
          </div>
        )}
      </div>

      <button onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}>
        {currentlyCompleted ? "Uncheck today" : "Check today"}
      </button>
    </div>
  );

}