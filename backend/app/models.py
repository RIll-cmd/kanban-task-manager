import json
from datetime import date, datetime
from typing import Any, List, Optional

from sqlmodel import Column, Field, Relationship, SQLModel, Text


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    status: str = Field(default="To Do")
    priority: str = Field(default="MEDIUM")
    category: str = Field(default="General")
    note: Optional[str] = Field(default=None)
    previous_progress: Optional[int] = Field(default=0)
    is_archived: bool = Field(default=False)

    # ── Legacy timestamp (kept for backward compat) ──
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ── Temporal tracking fields ──
    created_date: datetime = Field(default_factory=datetime.utcnow)
    start_date: Optional[date] = Field(default=None)
    scheduled_date: Optional[date] = Field(default=None)
    due_date: Optional[date] = Field(default=None)
    completed_date: Optional[date] = Field(default=None)

    # ── Tags stored as JSON-encoded string in the DB ──
    tags_json: Optional[str] = Field(
        default="[]", sa_column=Column("tags_json", Text, nullable=True, default="[]")
    )

    @property
    def tags(self) -> List[str]:
        """Expose tags_json as a Python list for schema serialisation."""
        if not self.tags_json:
            return []
        try:
            parsed = json.loads(self.tags_json)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []

    # ── Relationships ──
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
    color: str = Field(default="#00ffff")


class Status(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    swimlane_name: str = Field(default="General", index=True)
    order: int = Field(default=0)
    default_progress: Optional[int] = Field(default=None)
    color: str = Field(default="#00ffff")


class Hashtag(SQLModel, table=True):
    """Global hashtag registry. Each tag is unique and prefixed with '#'."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)  # e.g. "#bug"
    color: str = Field(default="#00d4ff")

