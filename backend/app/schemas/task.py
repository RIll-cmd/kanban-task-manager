from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
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
    timestamp: str  # Explicit ISO-8601 string so the frontend gets a parseable value
    task_id: Optional[int] = None
    task_title: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("timestamp", mode="before")
    @classmethod
    def ensure_iso_timestamp(cls, v: object) -> str:
        """Coerce datetime objects into full ISO-8601 strings."""
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)


# ── Hashtag schemas ──

class HashtagCreate(BaseModel):
    name: str
    color: Optional[str] = "#00d4ff"

class HashtagRead(BaseModel):
    id: int
    name: str
    color: str = "#00d4ff"

    model_config = ConfigDict(from_attributes=True)


class TaskDuplicatePayload(BaseModel):
    category: str
    status: str


# ── Date parsing helper ──

def _parse_optional_date(v: object) -> Optional[date]:
    """Accept date objects, ISO-8601 date strings, or None."""
    if v is None or v == "":
        return None
    if isinstance(v, date):
        return v
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, str):
        # Accept ISO date (YYYY-MM-DD) or ISO datetime (strip time portion)
        try:
            return date.fromisoformat(v[:10])
        except ValueError:
            raise ValueError(f"Invalid date format: '{v}'. Expected YYYY-MM-DD.")
    raise ValueError(f"Cannot parse date from type {type(v).__name__}")


class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    status: str = "To Do"
    priority: str = "MEDIUM"
    category: str = "General"
    note: Optional[str] = None
    previous_progress: Optional[int] = 0
    is_archived: bool = False

    # ── Temporal fields ──
    start_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None

    # ── Tags ──
    tags: List[str] = []

    # Robust date parsing for all date fields
    @field_validator("start_date", "scheduled_date", "due_date", "completed_date", mode="before")
    @classmethod
    def parse_dates(cls, v: object) -> Optional[date]:
        return _parse_optional_date(v)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    previous_progress: Optional[int] = None
    is_archived: Optional[bool] = None

    # ── Temporal fields ──
    start_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None

    # ── Tags ──
    tags: Optional[List[str]] = None

    @field_validator("start_date", "scheduled_date", "due_date", "completed_date", mode="before")
    @classmethod
    def parse_dates(cls, v: object) -> Optional[date]:
        return _parse_optional_date(v)


class TaskReadWithProgress(SQLModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    category: str = "General"
    note: Optional[str] = None
    previous_progress: Optional[int] = 0
    is_archived: bool = False

    # ── Legacy timestamp ──
    created_at: str = ""  # ISO string

    # ── Temporal tracking ──
    created_date: str = ""  # ISO string
    start_date: Optional[str] = None
    scheduled_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_date: Optional[str] = None

    # ── Tags ──
    tags: List[str] = []

    subtasks: List[SubtaskRead] = []
    logs: List[ActivityLogRead] = []
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)

    @field_validator("created_at", "created_date", mode="before")
    @classmethod
    def datetime_to_iso(cls, v: object) -> str:
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v) if v else ""

    @field_validator("start_date", "scheduled_date", "due_date", "completed_date", mode="before")
    @classmethod
    def date_to_iso(cls, v: object) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, (date, datetime)):
            return v.isoformat()
        return str(v)

    @field_validator("tags", mode="before")
    @classmethod
    def deserialise_tags(cls, v: object) -> List[str]:
        """Handle tags coming from the ORM as a raw JSON string or Python list."""
        import json as _json
        if v is None:
            return []
        if isinstance(v, str):
            try:
                parsed = _json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (_json.JSONDecodeError, TypeError):
                return []
        if isinstance(v, list):
            return v
        return []

    @model_validator(mode="after")
    def calculate_progress(self) -> "TaskReadWithProgress":
        if self.status and self.status.upper() == "DONE":
            self.progress_percentage = 100.0
        elif not self.subtasks:
            self.progress_percentage = float(self.previous_progress or 0)
        else:
            completed_subtasks = sum(1 for s in self.subtasks if s.is_completed)
            total_subtasks = len(self.subtasks)
            self.progress_percentage = round((completed_subtasks / total_subtasks) * 100.0, 2)
        return self

