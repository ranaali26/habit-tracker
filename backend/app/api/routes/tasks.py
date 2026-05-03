import uuid
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.task import Task
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskRead,
    TaskListResponse,
    TaskCompleteRequest,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

Priority = Literal["low", "medium", "high"]


def _get_task_or_404(db: Session, *, task_id: uuid.UUID, user_id: uuid.UUID) -> Task:
    stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.is_deleted.is_(False))
    task = db.execute(stmt).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("", response_model=TaskListResponse)
def list_tasks(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    completed: bool | None = None,
    priority: Priority | None = None,
    q: str | None = None,
    due_from: date | None = None,
    due_to: date | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    filters = [Task.user_id == user.id, Task.is_deleted.is_(False)]

    if completed is True:
        filters.append(Task.completed_at.is_not(None))
    elif completed is False:
        filters.append(Task.completed_at.is_(None))

    if priority:
        filters.append(Task.priority == priority)

    if q:
        # simple search (title/description)
        like = f"%{q.strip()}%"
        filters.append((Task.title.ilike(like)) | (Task.description.ilike(like)))

    if due_from:
        filters.append(Task.due_date.is_not(None))
        filters.append(Task.due_date >= due_from)

    if due_to:
        filters.append(Task.due_date.is_not(None))
        filters.append(Task.due_date <= due_to)

    total_stmt = select(func.count()).select_from(Task).where(*filters)
    total = db.execute(total_stmt).scalar_one()

    stmt = (
        select(Task)
        .where(*filters)
        .order_by(Task.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = db.execute(stmt).scalars().all()

    return TaskListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = Task(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id=task_id, user_id=user.id)
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id=task_id, user_id=user.id)

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: uuid.UUID,
    payload: TaskCompleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id=task_id, user_id=user.id)

    if payload.completed:
        task.completed_at = datetime.now(timezone.utc)
    else:
        task.completed_at = None

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task_or_404(db, task_id=task_id, user_id=user.id)
    task.is_deleted = True
    db.commit()
    return None