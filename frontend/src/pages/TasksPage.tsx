import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import { createTask, listTasks, setTaskCompleted } from "../api/tasks";
import type { TaskPriority } from "../api/tasks";

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
    mutationFn: () =>
      createTask({
        title,
        priority,
      }),
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
    <div>
      <NavBar />

      <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 720 }}>
        <h1>Tasks</h1>

        {/* Create */}
        <div style={{ border: "1px solid #ddd", padding: 16, display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Create Task</h3>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />

          <label style={{ display: "grid", gap: 4 }}>
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>

          <button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>

          {createMutation.isError && (
            <div style={{ color: "crimson" }}>
              Failed: {(createMutation.error as any)?.response?.data?.detail ?? "Error"}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Completed</span>
            <select value={filterCompleted} onChange={(e) => setFilterCompleted(e.target.value as any)}>
              <option value="all">all</option>
              <option value="true">completed</option>
              <option value="false">not completed</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Priority</span>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}>
              <option value="all">all</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
        </div>

        {/* List */}
        {tasksQuery.isLoading && <div>Loading tasks...</div>}
        {tasksQuery.isError && (
          <div style={{ color: "crimson" }}>
            Failed: {(tasksQuery.error as any)?.response?.data?.detail ?? "Error"}
          </div>
        )}

        {tasksQuery.data && (
          <div style={{ display: "grid", gap: 8 }}>
            {tasksQuery.data.items.length === 0 ? (
              <div>No tasks found.</div>
            ) : (
              tasksQuery.data.items.map((t) => {
                const completed = Boolean(t.completed_at);
                return (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid #ddd",
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {t.title}{" "}
                        <span style={{ fontWeight: 400, color: "#666" }}>
                          ({t.priority})
                        </span>
                      </div>
                      {t.completed_at && (
                        <div style={{ fontSize: 12, color: "#666" }}>
                          Completed at: {new Date(t.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        completeMutation.mutate({ taskId: t.id, completed: !completed })
                      }
                      disabled={completeMutation.isPending}
                    >
                      {completed ? "Mark incomplete" : "Mark complete"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}