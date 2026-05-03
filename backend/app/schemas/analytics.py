import uuid
from datetime import date
from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    from_date: date
    to_date: date

    tasks_created: int
    tasks_completed: int

    habit_completions: int
    active_habits: int


class HabitHistory(BaseModel):
    habit_id: uuid.UUID
    from_date: date
    to_date: date
    completion_dates: list[date]