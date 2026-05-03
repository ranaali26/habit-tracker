import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.habit import Habit
from app.models.habit_completion import HabitCompletion
from app.schemas.analytics import AnalyticsSummary, HabitHistory

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
):
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="'from' must be <= 'to'")

    # tasks created in range
    tasks_created_stmt = (
        select(func.count())
        .select_from(Task)
        .where(
            Task.user_id == user.id,
            Task.is_deleted.is_(False),
            func.date(Task.created_at) >= from_date,
            func.date(Task.created_at) <= to_date,
        )
    )
    tasks_created = db.execute(tasks_created_stmt).scalar_one()

    # tasks completed in range (completed_at timestamp)
    tasks_completed_stmt = (
        select(func.count())
        .select_from(Task)
        .where(
            Task.user_id == user.id,
            Task.is_deleted.is_(False),
            Task.completed_at.is_not(None),
            func.date(Task.completed_at) >= from_date,
            func.date(Task.completed_at) <= to_date,
        )
    )
    tasks_completed = db.execute(tasks_completed_stmt).scalar_one()

    # active habits count (not archived)
    active_habits_stmt = (
        select(func.count())
        .select_from(Habit)
        .where(
            Habit.user_id == user.id,
            Habit.is_archived.is_(False),
        )
    )
    active_habits = db.execute(active_habits_stmt).scalar_one()

    # habit completions in range
    habit_completions_stmt = (
        select(func.count())
        .select_from(HabitCompletion)
        .where(
            HabitCompletion.user_id == user.id,
            HabitCompletion.completion_date >= from_date,
            HabitCompletion.completion_date <= to_date,
        )
    )
    habit_completions = db.execute(habit_completions_stmt).scalar_one()

    return AnalyticsSummary(
        from_date=from_date,
        to_date=to_date,
        tasks_created=tasks_created,
        tasks_completed=tasks_completed,
        habit_completions=habit_completions,
        active_habits=active_habits,
    )


@router.get("/habits/{habit_id}/history", response_model=HabitHistory)
def habit_history(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
):
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="'from' must be <= 'to'")

    # ensure habit belongs to user
    habit_stmt = select(Habit.id).where(Habit.id == habit_id, Habit.user_id == user.id)
    habit_exists = db.execute(habit_stmt).scalar_one_or_none()
    if not habit_exists:
        raise HTTPException(status_code=404, detail="Habit not found")

    stmt = (
        select(HabitCompletion.completion_date)
        .where(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.user_id == user.id,
            HabitCompletion.completion_date >= from_date,
            HabitCompletion.completion_date <= to_date,
        )
        .order_by(HabitCompletion.completion_date.asc())
    )
    dates = db.execute(stmt).scalars().all()

    return HabitHistory(
        habit_id=habit_id,
        from_date=from_date,
        to_date=to_date,
        completion_dates=dates,
    )