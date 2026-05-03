import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, listTasks, setTaskCompleted } from "@/api/tasks";
import type { TaskPriority } from "@/api/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Plus } from "lucide-react";

const priorityVariant: Record<TaskPriority, "danger" | "warning" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

export default function TasksPage() {
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [filterCompleted, setFilterCompleted] = useState<"all" | "true" | "false">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | TaskPriority>("all");

  const completedParam = useMemo(() => {
    if (filterCompleted === "all") return undefined;
    return filterCompleted === "true";
  }, [filterCompleted]);

  const tasksQuery = useQuery({
    queryKey: ["tasks", completedParam, filterPriority],
    queryFn: () =>
      listTasks({
        completed: completedParam,
        priority: filterPriority === "all" ? undefined : filterPriority,
        limit: 50,
        offset: 0,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () => createTask({ title, priority }),
    onSuccess: async () => {
      setTitle("");
      setPriority("medium");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      setTaskCompleted(taskId, completed),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">Manage your to-dos</p>
      </div>

      {/* Create */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48 space-y-1.5">
              <Label>Task title</Label>
              <Input
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && title.trim() && createMutation.mutate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-32"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || createMutation.isPending}
            >
              <Plus size={16} />
              {createMutation.isPending ? "Adding..." : "Add Task"}
            </Button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-destructive mt-2">
              {(createMutation.error as any)?.response?.data?.detail ?? "Failed to create"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={filterCompleted}
            onChange={(e) => setFilterCompleted(e.target.value as any)}
            className="w-36"
          >
            <option value="all">All</option>
            <option value="false">Active</option>
            <option value="true">Completed</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="w-32"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
      </div>

      {/* List */}
      {tasksQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-muted rounded-xl" />
          ))}
        </div>
      )}

      {tasksQuery.isError && (
        <p className="text-sm text-destructive">
          {(tasksQuery.error as any)?.response?.data?.detail ?? "Failed to load tasks"}
        </p>
      )}

      {tasksQuery.data && (
        <div className="space-y-2">
          {tasksQuery.data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks found.</p>
          ) : (
            tasksQuery.data.items.map((t) => {
              const completed = Boolean(t.completed_at);
              return (
                <Card
                  key={t.id}
                  className={completed ? "opacity-60" : ""}
                >
                  <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() =>
                          completeMutation.mutate({ taskId: t.id, completed: !completed })
                        }
                        disabled={completeMutation.isPending}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {completed ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className={`font-medium truncate ${completed ? "line-through" : ""}`}>
                          {t.title}
                        </p>
                        {t.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed {new Date(t.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge variant={priorityVariant[t.priority]}>
                      {t.priority}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}