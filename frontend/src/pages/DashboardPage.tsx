import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSummary } from "@/api/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ListTodo, Flame, Activity } from "lucide-react";

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

  const stats = summaryQuery.data;

  const cards = stats
    ? [
        {
          label: "Tasks Created",
          value: stats.tasks_created,
          icon: ListTodo,
          color: "text-blue-500",
        },
        {
          label: "Tasks Completed",
          value: stats.tasks_completed,
          icon: CheckCircle2,
          color: "text-emerald-500",
        },
        {
          label: "Habit Completions",
          value: stats.habit_completions,
          icon: Flame,
          color: "text-orange-500",
        },
        {
          label: "Active Habits",
          value: stats.active_habits,
          icon: Activity,
          color: "text-purple-500",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your progress overview</p>
      </div>

      {/* Date range */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button
          variant="outline"
          onClick={() => summaryQuery.refetch()}
          disabled={summaryQuery.isFetching}
        >
          {summaryQuery.isFetching ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Error */}
      {summaryQuery.isError && (
        <p className="text-sm text-destructive">
          Failed to load: {(summaryQuery.error as any)?.response?.data?.detail ?? "Error"}
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-16 animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          : cards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                  <Icon size={18} className={color} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}