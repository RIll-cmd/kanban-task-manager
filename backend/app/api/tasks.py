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


@router.get("/logs")
def read_activity_logs(
    session: Session = Depends(get_session),
):
    statement = select(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(50)
    return session.exec(statement).all()


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
        description=f"Initiated task in '{db_task.category}'",
        task_title=db_task.title,
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


@router.put("/tasks/{task_id}", response_model=TaskReadWithProgress)
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

    # Capture old state BEFORE applying updates
    old_status = db_task.status
    old_note = db_task.note or ""

    # Calculate old progress
    if db_task.status == "Done":
        old_progress = 100
    elif not db_task.subtasks:
        old_progress = db_task.previous_progress or 0
    else:
        completed = sum(1 for s in db_task.subtasks if s.is_completed)
        old_progress = int(round((completed / len(db_task.subtasks)) * 100))

    update_data = task_update.model_dump(exclude_unset=True)

    # Apply attribute updates
    for key, value in update_data.items():
        setattr(db_task, key, value)

    session.add(db_task)
    session.commit()
    session.refresh(db_task)

    # Calculate new progress AFTER updates applied
    if db_task.status == "Done":
        new_progress = 100
    elif not db_task.subtasks:
        new_progress = db_task.previous_progress or 0
    else:
        completed = sum(1 for s in db_task.subtasks if s.is_completed)
        new_progress = int(round((completed / len(db_task.subtasks)) * 100))

    new_status = db_task.status
    new_note = db_task.note or ""

    # 1. Status change log
    if "status" in update_data and old_status != new_status:
        session.add(
            ActivityLog(
                action="Status Change",
                details=f"Moved from '{old_status}' to '{new_status}'",
                description=f"Moved to '{new_status}'",
                task_title=db_task.title,
                task_id=db_task.id,
            )
        )

    # 2. Progress change log
    if old_progress != new_progress or ("previous_progress" in update_data and update_data["previous_progress"] != old_progress):
        session.add(
            ActivityLog(
                action="Progress Update",
                details=f"Progress updated to {new_progress}%",
                description=f"Progress updated to {new_progress}%",
                task_title=db_task.title,
                task_id=db_task.id,
            )
        )

    # 3. Note update log
    if "note" in update_data and old_note != new_note and new_note.strip() != "":
        session.add(
            ActivityLog(
                action="Note Update",
                details="Updated note",
                description="Updated note",
                task_title=db_task.title,
                task_id=db_task.id,
            )
        )

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
