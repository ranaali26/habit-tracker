import { api } from "./client";


export type Habit = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: "daily";
  target_days_per_week: number;
  start_date: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitListResponse = {
  items: Habit[];
  total: number;
  limit: number;
  offset: number;
};

export type HabitStreak = {
  habit_id: string;
  current_streak: number;
  longest_streak: number;
};

export async function listHabits(params?: { archived?: boolean; limit?: number; offset?: number }) {
  const res = await api.get<HabitListResponse>("/habits", { params });
  return res.data;
}

export async function createHabit(body: {
  name: string;
  description?: string | null;
  target_days_per_week?: number;
  start_date?: string;
}) {
  const res = await api.post<Habit>("/habits", { frequency: "daily", ...body });
  return res.data;
}

export async function markHabitComplete(habitId: string, date: string) {
  await api.put(`/habits/${habitId}/completions/${date}`);
}

export async function unmarkHabitComplete(habitId: string, date: string) {
  await api.delete(`/habits/${habitId}/completions/${date}`);
}

export async function getHabitStreak(habitId: string) {
  const res = await api.get<HabitStreak>(`/habits/${habitId}/streak`);
  return res.data;
}

export type Completion = {
  id: string;
  habit_id: string;
  user_id: string;
  completion_date: string;
  created_at: string;
};

export type CompletionListResponse = {
  items: Completion[];
  total: number;
};

export async function listHabitCompletions(habitId: string, from: string, to: string) {
  const res = await api.get<CompletionListResponse>(`/habits/${habitId}/completions`, {
    params: { from, to },
  });
  return res.data;
}

export async function getHabit(habitId: string) {
  const res = await api.get<Habit>(`/habits/${habitId}`);
  return res.data;
}