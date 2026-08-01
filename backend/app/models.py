from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    status: str = Field(default="To Do")
    priority: str = Field(default="MEDIUM")
    category: str = Field(default="General")
    note: Optional[str] = Field(default=None)
    due_date: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    previous_progress: Optional[int] = Field(default=0)

    subtasks: List["Subtask"] = Relationship(
        back_populates="task",
        cascade_delete=True
    )
    logs: List["ActivityLog"] = Relationship(
        back_populates="task",
        cascade_delete=True
    )


class Subtask(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    is_completed: bool = Field(default=False)
    task_id: int = Field(foreign_key="task.id")

    task: Optional[Task] = Relationship(back_populates="subtasks")


class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: Optional[int] = Field(default=None, foreign_key="task.id", nullable=True)
    task_title: str = Field(default="[Unknown Task]")
    description: str = Field(default="")
    action: str = Field(default="UPDATE")
    details: str = Field(default="")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    task: Optional[Task] = Relationship(back_populates="logs")


class Swimlane(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    order: int = Field(default=0)


class Status(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    swimlane_name: str = Field(default="General", index=True)
    order: int = Field(default=0)
    default_progress: Optional[int] = Field(default=None)




