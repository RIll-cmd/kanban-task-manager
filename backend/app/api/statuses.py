from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, text

from app.database import get_session
from app.models import Status, Task

router = APIRouter()


class StatusCreate(BaseModel):
    name: str
    swimlane_name: Optional[str] = "General"
    order: Optional[int] = None
    default_progress: Optional[int] = None


class StatusUpdate(BaseModel):
    name: Optional[str] = None
    new_name: Optional[str] = None
    swimlane_name: Optional[str] = None
    order: Optional[int] = None
    default_progress: Optional[int] = None


@router.get("/statuses", response_model=List[Status])
def read_statuses(
    swimlane_name: Optional[str] = None,
    session: Session = Depends(get_session),
):
    statement = select(Status)
    if swimlane_name:
        statement = statement.where(Status.swimlane_name == swimlane_name)
    statement = statement.order_by(Status.order.asc())
    return session.exec(statement).all()


@router.post("/statuses", response_model=Status, status_code=status.HTTP_201_CREATED)
def create_status(
    data: StatusCreate,
    session: Session = Depends(get_session),
):
    name = data.name.strip()
    swimlane = (data.swimlane_name or "General").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status name cannot be empty",
        )

    existing = session.exec(
        select(Status).where(Status.name == name, Status.swimlane_name == swimlane)
    ).first()
    if existing:
        return existing

    all_for_lane = session.exec(
        select(Status).where(Status.swimlane_name == swimlane)
    ).all()
    max_order = max([s.order for s in all_for_lane], default=-1)
    new_order = data.order if data.order is not None else max_order + 1

    status_obj = Status(
        name=name,
        swimlane_name=swimlane,
        order=new_order,
        default_progress=data.default_progress,
    )
    session.add(status_obj)
    session.commit()
    session.refresh(status_obj)
    return status_obj


@router.put("/statuses/{old_name}", response_model=Status)
def update_status(
    old_name: str,
    payload: Optional[StatusUpdate] = None,
    new_name: Optional[str] = None,
    swimlane_name: Optional[str] = None,
    session: Session = Depends(get_session),
):
    target_new_name = (
        (payload.new_name or payload.name) if payload and (payload.new_name or payload.name) else new_name
    )
    target_swimlane = (
        payload.swimlane_name if payload and payload.swimlane_name else swimlane_name
    )

    if not target_new_name or not target_new_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New status name is required",
        )

    target_new_name = target_new_name.strip()

    stmt = select(Status).where(Status.name == old_name)
    if target_swimlane:
        stmt = stmt.where(Status.swimlane_name == target_swimlane)
    status_obj = session.exec(stmt).first()

    if not status_obj:
        swimlane_to_use = target_swimlane or "General"
        all_for_lane = session.exec(
            select(Status).where(Status.swimlane_name == swimlane_to_use)
        ).all()
        max_order = max([s.order for s in all_for_lane], default=-1)
        status_obj = Status(
            name=target_new_name,
            swimlane_name=swimlane_to_use,
            order=max_order + 1,
            default_progress=payload.default_progress if payload else None,
        )
        session.add(status_obj)
    else:
        old_status_name = status_obj.name
        old_status_swimlane = status_obj.swimlane_name
        status_obj.name = target_new_name
        if payload:
            if payload.order is not None:
                status_obj.order = payload.order
            if "default_progress" in payload.model_fields_set:
                status_obj.default_progress = payload.default_progress
            if payload.swimlane_name:
                status_obj.swimlane_name = payload.swimlane_name
        session.add(status_obj)

        # Bulk update tasks matching old_status_name and old_status_swimlane
        session.exec(
            text(
                "UPDATE task SET status = :new_name WHERE status = :old_name AND category = :swimlane"
            ),
            params={
                "new_name": target_new_name,
                "old_name": old_status_name,
                "swimlane": old_status_swimlane,
            },
        )

    session.commit()
    session.refresh(status_obj)
    return status_obj


@router.delete("/statuses/{name}")
def delete_status(
    name: str,
    swimlane_name: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Status).where(Status.name == name)
    if swimlane_name:
        stmt = stmt.where(Status.swimlane_name == swimlane_name)
    status_obj = session.exec(stmt).first()

    if not status_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Status '{name}' not found",
        )

    target_swimlane = status_obj.swimlane_name

    remaining_statuses = session.exec(
        select(Status)
        .where(Status.swimlane_name == target_swimlane, Status.id != status_obj.id)
        .order_by(Status.order.asc())
    ).all()

    fallback_status_name = remaining_statuses[0].name if remaining_statuses else "To Do"

    # Bulk reassign tasks in this status and swimlane to fallback status
    session.exec(
        text(
            "UPDATE task SET status = :fallback_name WHERE status = :target_name AND category = :swimlane"
        ),
        params={
            "fallback_name": fallback_status_name,
            "target_name": name,
            "swimlane": target_swimlane,
        },
    )

    session.delete(status_obj)
    session.commit()

    return {"message": f"Status '{name}' deleted successfully", "fallback": fallback_status_name}
