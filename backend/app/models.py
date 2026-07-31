from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    status: str = Field(default="To Do")
    priority: str = Field(default="MEDIUM")
    due_date: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    action: str
    details: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    task_id: int = Field(foreign_key="task.id")

    task: Optional[Task] = Relationship(back_populates="logs")
