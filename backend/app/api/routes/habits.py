import uuid
from datetime import date, datetime, timezone
from app.schemas.streak import HabitStreakRead
from app.services.streaks import compute_streaks_daily

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.habit import Habit
from app.models.habit_completion import HabitCompletion
from app.schemas.habit import (
    HabitCreate,
    HabitUpdate,
    HabitRead,
    HabitListResponse,
    CompletionRead,
    CompletionListResponse,
)

router = APIRouter(prefix="/habits", tags=["habits"])


def _get_habit_or_404(db: Session, *, habit_id: uuid.UUID, user_id: uuid.UUID) -> Habit:
    stmt = select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    habit = db.execute(stmt).scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


@router.get("", response_model=HabitListResponse)
def list_habits(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    archived: bool = False,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    filters = [Habit.user_id == user.id, Habit.is_archived.is_(archived)]

    total_stmt = select(func.count()).select_from(Habit).where(*filters)
    total = db.execute(total_stmt).scalar_one()

    stmt = (
        select(Habit)
        .where(*filters)
        .order_by(Habit.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = db.execute(stmt).scalars().all()

    return HabitListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    habit = Habit(
        user_id=user.id,
        name=payload.name,
        description=payload.description,
        frequency=payload.frequency,
        target_days_per_week=payload.target_days_per_week,
        # if start_date omitted, DB default current_date() will apply
        start_date=payload.start_date if payload.start_date is not None else None,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("/{habit_id}", response_model=HabitRead)
def get_habit(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(
    habit_id: uuid.UUID,
    payload: HabitUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    habit = _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(habit, k, v)

    db.commit()
    db.refresh(habit)
    return habit


@router.patch("/{habit_id}/archive", response_model=HabitRead)
def archive_habit(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    habit = _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)
    habit.is_archived = True
    db.commit()
    db.refresh(habit)
    return habit


# -------- completions --------

@router.put("/{habit_id}/completions/{completion_date}", status_code=status.HTTP_204_NO_CONTENT)
def mark_complete(
    habit_id: uuid.UUID,
    completion_date: date,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    habit = _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)

    # Optional rule: don't allow before start_date
    if completion_date < habit.start_date:
        raise HTTPException(status_code=400, detail="Completion date is before habit start_date")

    completion = HabitCompletion(
        habit_id=habit.id,
        user_id=user.id,
        completion_date=completion_date,
        created_at=datetime.now(timezone.utc),
    )
    db.add(completion)

    # idempotent: if already exists due to UNIQUE(habit_id, completion_date), treat as success
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    return None

@router.get("/{habit_id}/streak", response_model=HabitStreakRead)
def get_streak(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ensure habit belongs to user
    habit = _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)

    today = datetime.now(timezone.utc).date()
    current, longest = compute_streaks_daily(db, habit_id=habit.id, user_id=user.id, today=today)

    return HabitStreakRead(
        habit_id=habit.id,
        current_streak=current,
        longest_streak=longest,
    )

@router.delete("/{habit_id}/completions/{completion_date}", status_code=status.HTTP_204_NO_CONTENT)
def unmark_complete(
    habit_id: uuid.UUID,
    completion_date: date,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ensure habit belongs to user
    _ = _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)

    stmt = (
        delete(HabitCompletion)
        .where(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.user_id == user.id,
            HabitCompletion.completion_date == completion_date,
        )
    )
    db.execute(stmt)
    db.commit()
    return None


@router.get("/{habit_id}/completions", response_model=CompletionListResponse)
def list_completions(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
):
    # ensure habit belongs to user
    _ = _get_habit_or_404(db, habit_id=habit_id, user_id=user.id)

    if from_date > to_date:
        raise HTTPException(status_code=400, detail="'from' must be <= 'to'")

    filters = [
        HabitCompletion.habit_id == habit_id,
        HabitCompletion.user_id == user.id,
        HabitCompletion.completion_date >= from_date,
        HabitCompletion.completion_date <= to_date,
    ]

    total_stmt = select(func.count()).select_from(HabitCompletion).where(*filters)
    total = db.execute(total_stmt).scalar_one()

    stmt = (
        select(HabitCompletion)
        .where(*filters)
        .order_by(HabitCompletion.completion_date.asc())
    )
    items = db.execute(stmt).scalars().all()

    return CompletionListResponse(items=items, total=total)