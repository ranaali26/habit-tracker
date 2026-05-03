import { api } from "./client";

export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskListResponse = {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
};

export async function listTasks(params: {
  completed?: boolean;
  priority?: TaskPriority;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const res = await api.get<TaskListResponse>("/tasks", { params });
  return res.data;
}

export async function createTask(body: {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
}) {
  const res = await api.post<Task>("/tasks", body);
  return res.data;
}

export async function setTaskCompleted(taskId: string, completed: boolean) {
  const res = await api.patch<Task>(`/tasks/${taskId}/complete`, { completed });
  return res.data;
}