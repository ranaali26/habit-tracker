import uuid
from pydantic import BaseModel

class HabitStreakRead(BaseModel):
    habit_id: uuid.UUID
    current_streak: int
    longest_streak: int