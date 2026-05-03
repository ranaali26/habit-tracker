import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, conint

HabitFrequency = Literal["daily"]  # keep MVP simple


class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    frequency: HabitFrequency = "daily"
    target_days_per_week: conint(ge=0, le=7) = 7  # type: ignore
    start_date: date | None = None


class HabitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    frequency: HabitFrequency | None = None
    target_days_per_week: conint(ge=0, le=7) | None = None  # type: ignore
    start_date: date | None = None
    is_archived: bool | None = None


class HabitRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    frequency: HabitFrequency
    target_days_per_week: int
    start_date: date
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HabitListResponse(BaseModel):
    items: list[HabitRead]
    total: int
    limit: int
    offset: int


class CompletionRead(BaseModel):
    id: uuid.UUID
    habit_id: uuid.UUID
    user_id: uuid.UUID
    completion_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class CompletionListResponse(BaseModel):
    items: list[CompletionRead]
    total: int