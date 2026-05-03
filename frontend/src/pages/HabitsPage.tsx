import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  createHabit,
  getHabitStreak,
  listHabits,
  listHabitCompletions,
  markHabitComplete,
  unmarkHabitComplete,
} from "@/api/habits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Flame, ChevronRight, Plus } from "lucide-react";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
        <p className="text-muted-foreground">Build consistency every day</p>
      </div>

      {/* Create */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48 space-y-1.5">
              <Label>Habit name</Label>
              <Input
                placeholder="e.g. Morning run"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && createMutation.mutate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target days/week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              <Plus size={16} />
              {createMutation.isPending ? "Adding..." : "Add Habit"}
            </Button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-destructive mt-2">
              {(createMutation.error as any)?.response?.data?.detail ?? "Failed to create"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {habitsQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-muted rounded-xl" />
          ))}
        </div>
      )}

      {habitsQuery.isError && (
        <p className="text-sm text-destructive">Failed to load habits</p>
      )}

      {habitsQuery.data && (
        <div className="space-y-3">
          {habitsQuery.data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No habits yet. Create one above.</p>
          ) : (
            habitsQuery.data.items.map((h) => (
              <HabitRow key={h.id} habitId={h.id} name={h.name} today={today} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HabitRow({ habitId, name, today }: { habitId: string; name: string; today: string }) {
  const qc = useQueryClient();

  const completionsTodayQuery = useQuery({
    queryKey: ["habit-completions", habitId, today],
    queryFn: () => listHabitCompletions(habitId, today, today),
  });

  const streakQuery = useQuery({
    queryKey: ["habit-streak", habitId],
    queryFn: () => getHabitStreak(habitId),
  });

  const doneToday = (completionsTodayQuery.data?.total ?? 0) > 0;

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

  return (
    <Card>
      <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Toggle button */}
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
              doneToday
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-muted-foreground hover:border-foreground"
            }`}
          >
            {doneToday && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Name + streak */}
          <div className="min-w-0">
            <Link
              to={`/habits/${habitId}`}
              className="font-medium hover:underline underline-offset-4 truncate block"
            >
              {name}
            </Link>
            {streakQuery.data && streakQuery.data.current_streak > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Flame size={12} className="text-orange-500" />
                <span className="text-xs text-muted-foreground">
                  {streakQuery.data.current_streak} day streak
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {streakQuery.data && (
            <Badge variant="secondary">
              Best: {streakQuery.data.longest_streak}
            </Badge>
          )}
          {doneToday && <Badge variant="success">Done today</Badge>}
          <Link to={`/habits/${habitId}`} className="text-muted-foreground hover:text-foreground">
            <ChevronRight size={18} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}