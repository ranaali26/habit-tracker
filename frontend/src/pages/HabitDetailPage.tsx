import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getHabit,
  getHabitStreak,
  listHabitCompletions,
  markHabitComplete,
  unmarkHabitComplete,
} from "@/api/habits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, ArrowLeft, Trophy } from "lucide-react";

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const completedCount = completionSet.size;
  const completionRate = days.length > 0 ? Math.round((completedCount / days.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        to="/habits"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to habits
      </Link>

      {/* Header */}
      {habitQuery.isLoading ? (
        <div className="h-10 w-48 animate-pulse bg-muted rounded" />
      ) : habitQuery.data ? (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{habitQuery.data.name}</h1>
          {habitQuery.data.description && (
            <p className="text-muted-foreground mt-1">{habitQuery.data.description}</p>
          )}
        </div>
      ) : null}

      {/* Streak stats */}
      {streakQuery.data && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 flex flex-col items-center gap-1">
              <Flame size={20} className="text-orange-500" />
              <span className="text-2xl font-bold">{streakQuery.data.current_streak}</span>
              <span className="text-xs text-muted-foreground">Current streak</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex flex-col items-center gap-1">
              <Trophy size={20} className="text-yellow-500" />
              <span className="text-2xl font-bold">{streakQuery.data.longest_streak}</span>
              <span className="text-xs text-muted-foreground">Longest streak</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex flex-col items-center gap-1">
              <span className="text-lg">📅</span>
              <span className="text-2xl font-bold">{completionRate}%</span>
              <span className="text-xs text-muted-foreground">Last 30 days</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium">
                {d}
              </div>
            ))}
          </div>

          {completionsQuery.isLoading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => {
                const done = completionSet.has(d);
                const isToday = d === yyyyMmDd(new Date());
                return (
                  <button
                    key={d}
                    onClick={() => toggleMutation.mutate(d)}
                    disabled={toggleMutation.isPending}
                    title={d}
                    className={`
                      aspect-square rounded-md text-xs font-medium transition-all
                      flex items-center justify-center
                      ${done
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-muted hover:bg-muted/70 text-muted-foreground"
                      }
                      ${isToday ? "ring-2 ring-offset-1 ring-primary" : ""}
                    `}
                  >
                    {d.slice(8, 10)}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {toggleMutation.isError && (
        <p className="text-sm text-destructive">
          Toggle failed: {(toggleMutation.error as any)?.response?.data?.detail ?? "Error"}
        </p>
      )}
    </div>
  );
}