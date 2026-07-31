from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import ActivityLog, Subtask, Task
from app.schemas.task import (
    SubtaskCreate,
    SubtaskRead,
    SubtaskUpdate,
    TaskCreate,
    TaskReadWithProgress,
    TaskUpdate,
)

router = APIRouter()


@router.post("/tasks", response_model=TaskReadWithProgress, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    session: Session = Depends(get_session),
):
    db_task = Task.model_validate(task_data)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)

    # Initial Activity Log
    log = ActivityLog(
        action="Task Created",
        details=f"Task '{db_task.title}' was created",
        task_id=db_task.id,
    )
    session.add(log)
    session.commit()
    session.refresh(db_task)

    return db_task


@router.get("/tasks", response_model=List[TaskReadWithProgress])
def read_tasks(
    session: Session = Depends(get_session),
):
    statement = select(Task)
    tasks = session.exec(statement).all()
    return tasks


@router.get("/tasks/{task_id}", response_model=TaskReadWithProgress)
def read_task(
    task_id: int,
    session: Session = Depends(get_session),
):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )
    return db_task


@router.patch("/tasks/{task_id}", response_model=TaskReadWithProgress)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    session: Session = Depends(get_session),
):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    update_data = task_update.model_dump(exclude_unset=True)

    # CRITICAL AUTOMATION TRIGGER: Automatically log status or description changes
    if "status" in update_data and update_data["status"] != db_task.status:
        old_status = db_task.status
        new_status = update_data["status"]
        log = ActivityLog(
            action="Status Change",
            details=f"Moved from '{old_status}' to '{new_status}'",
            task_id=db_task.id,
        )
        session.add(log)

    if "description" in update_data and update_data["description"] != db_task.description:
        old_desc = db_task.description or ""
        new_desc = update_data["description"] or ""
        log = ActivityLog(
            action="Description Change",
            details=f"Updated description from '{old_desc}' to '{new_desc}'",
            task_id=db_task.id,
        )
        session.add(log)

    for key, value in update_data.items():
        setattr(db_task, key, value)

    session.add(db_task)
    session.commit()
    session.refresh(db_task)

    return db_task


@router.post("/tasks/{task_id}/subtasks", response_model=SubtaskRead, status_code=status.HTTP_201_CREATED)
def create_subtask(
    task_id: int,
    subtask_data: SubtaskCreate,
    session: Session = Depends(get_session),
):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    db_subtask = Subtask(
        title=subtask_data.title,
        is_completed=subtask_data.is_completed,
        task_id=task_id,
    )
    session.add(db_subtask)

    log = ActivityLog(
        action="Subtask Added",
        details=f"Added subtask '{db_subtask.title}'",
        task_id=task_id,
    )
    session.add(log)

    session.commit()
    session.refresh(db_subtask)

    return db_subtask


@router.patch("/subtasks/{subtask_id}", response_model=SubtaskRead)
def update_subtask(
    subtask_id: int,
    subtask_update: SubtaskUpdate,
    session: Session = Depends(get_session),
):
    db_subtask = session.get(Subtask, subtask_id)
    if not db_subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtask with ID {subtask_id} not found",
        )

    update_data = subtask_update.model_dump(exclude_unset=True)

    if "is_completed" in update_data and update_data["is_completed"] != db_subtask.is_completed:
        status_str = "completed" if update_data["is_completed"] else "incomplete"
        log = ActivityLog(
            action="Subtask Toggle",
            details=f"Marked subtask '{db_subtask.title}' as {status_str}",
            task_id=db_subtask.task_id,
        )
        session.add(log)

    for key, value in update_data.items():
        setattr(db_subtask, key, value)

    session.add(db_subtask)
    session.commit()
    session.refresh(db_subtask)

    return db_subtask
