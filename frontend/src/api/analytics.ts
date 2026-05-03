import { api } from "./client";

export type AnalyticsSummary = {
  from_date: string;
  to_date: string;
  tasks_created: number;
  tasks_completed: number;
  habit_completions: number;
  active_habits: number;
};

export async function getSummary(from: string, to: string) {
  const res = await api.get<AnalyticsSummary>("/analytics/summary", {
    params: { from, to },
  });
  return res.data;
}