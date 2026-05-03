import uuid
from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habit_completion import HabitCompletion


def compute_streaks_daily(db: Session, *, habit_id: uuid.UUID, user_id: uuid.UUID, today: date) -> tuple[int, int]:
    """
    Returns (current_streak, longest_streak) for a daily habit.
    Streak is based on completion_date (DATE), consecutive days.
    """
    stmt = (
        select(HabitCompletion.completion_date)
        .where(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.user_id == user_id,
        )
        .order_by(HabitCompletion.completion_date.asc())
    )
    dates = db.execute(stmt).scalars().all()
    if not dates:
        return 0, 0

    unique_dates = sorted(set(dates))

    longest = 1
    run = 1
    for i in range(1, len(unique_dates)):
        if unique_dates[i] == unique_dates[i - 1] + timedelta(days=1):
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    date_set = set(unique_dates)
    current = 0
    d = today
    while d in date_set:
        current += 1
        d = d - timedelta(days=1)

    return current, longest