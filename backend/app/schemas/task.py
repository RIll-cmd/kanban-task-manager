from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, model_validator
from sqlmodel import SQLModel


class SubtaskBase(SQLModel):
    title: str
    is_completed: bool = False


class SubtaskCreate(SubtaskBase):
    pass


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None


class SubtaskRead(SubtaskBase):
    id: int
    task_id: int

    model_config = ConfigDict(from_attributes=True)


class ActivityLogRead(SQLModel):
    id: int
    action: str
    details: str
    timestamp: datetime
    task_id: int

    model_config = ConfigDict(from_attributes=True)


class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    status: str = "To Do"
    priority: str = "MEDIUM"
    category: str = "General"
    note: Optional[str] = None
    due_date: Optional[datetime] = None
    previous_progress: Optional[int] = 0


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    due_date: Optional[datetime] = None
    previous_progress: Optional[int] = None


class TaskReadWithProgress(SQLModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    category: str = "General"
    note: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    previous_progress: Optional[int] = 0
    subtasks: List[SubtaskRead] = []
    logs: List[ActivityLogRead] = []
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def calculate_progress(self) -> "TaskReadWithProgress":
        if self.status == "Done":
            self.progress_percentage = 100.0
        elif not self.subtasks:
            self.progress_percentage = float(self.previous_progress or 0)
        else:
            completed_subtasks = sum(1 for s in self.subtasks if s.is_completed)
            total_subtasks = len(self.subtasks)
            self.progress_percentage = round((completed_subtasks / total_subtasks) * 100.0, 2)
        return self
