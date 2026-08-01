from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, text

from app.database import get_session
from app.models import Status, Swimlane, Task

router = APIRouter()


class SwimlaneCreate(BaseModel):
    name: str
    use_defaults: bool = True
    order: Optional[int] = None


class SwimlaneUpdate(BaseModel):
    name: Optional[str] = None
    new_name: Optional[str] = None
    order: Optional[int] = None


class SwimlaneReorderItem(BaseModel):
    name: str
    order: int


@router.get("/swimlanes", response_model=List[Swimlane])
def read_swimlanes(session: Session = Depends(get_session)):
    statement = select(Swimlane).order_by(Swimlane.order.asc())
    return session.exec(statement).all()


@router.post("/swimlanes", response_model=Swimlane, status_code=status.HTTP_201_CREATED)
def create_swimlane(
    data: SwimlaneCreate,
    session: Session = Depends(get_session),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Swimlane name cannot be empty",
        )

    existing = session.exec(select(Swimlane).where(Swimlane.name == name)).first()
    if existing:
        return existing

    all_lanes = session.exec(select(Swimlane)).all()
    max_order = max([s.order for s in all_lanes], default=-1)
    new_order = data.order if data.order is not None else max_order + 1

    swimlane = Swimlane(name=name, order=new_order)
    session.add(swimlane)
    session.commit()
    session.refresh(swimlane)

    if data.use_defaults:
        default_statuses = [
            {"name": "To Do", "order": 0, "default_progress": 0, "swimlane_name": swimlane.name},
            {"name": "In Progress", "order": 1, "default_progress": 50, "swimlane_name": swimlane.name},
            {"name": "Review", "order": 2, "default_progress": 80, "swimlane_name": swimlane.name},
            {"name": "Done", "order": 3, "default_progress": 100, "swimlane_name": swimlane.name},
        ]
        for item in default_statuses:
            session.add(Status(**item))
        session.commit()

    return swimlane


@router.put("/swimlanes/reorder", response_model=List[Swimlane])
def reorder_swimlanes(
    items: List[SwimlaneReorderItem],
    session: Session = Depends(get_session),
):
    for item in items:
        lane = session.exec(select(Swimlane).where(Swimlane.name == item.name)).first()
        if lane:
            lane.order = item.order
            session.add(lane)
    session.commit()
    return session.exec(select(Swimlane).order_by(Swimlane.order.asc())).all()


@router.put("/swimlanes/{old_name}", response_model=Swimlane)
def update_swimlane(
    old_name: str,
    payload: Optional[SwimlaneUpdate] = None,
    new_name: Optional[str] = None,
    session: Session = Depends(get_session),
):
    target_new_name = (
        (payload.new_name or payload.name) if payload and (payload.new_name or payload.name) else new_name
    )

    if not target_new_name or not target_new_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New swimlane name is required",
        )

    target_new_name = target_new_name.strip()

    # Locate existing swimlane by old_name
    swimlane = session.exec(select(Swimlane).where(Swimlane.name == old_name)).first()
    if not swimlane:
        # Check if already created under target_new_name
        existing_new = session.exec(select(Swimlane).where(Swimlane.name == target_new_name)).first()
        if existing_new:
            swimlane = existing_new
        else:
            all_lanes = session.exec(select(Swimlane)).all()
            max_order = max([s.order for s in all_lanes], default=-1)
            swimlane = Swimlane(name=target_new_name, order=max_order + 1)
            session.add(swimlane)
    else:
        swimlane.name = target_new_name
        if payload and payload.order is not None:
            swimlane.order = payload.order
        session.add(swimlane)

    # Bulk update tasks and status columns so they aren't orphaned
    session.exec(
        text("UPDATE task SET category = :new_name WHERE category = :old_name"),
        params={"new_name": target_new_name, "old_name": old_name},
    )
    session.exec(
        text("UPDATE status SET swimlane_name = :new_name WHERE swimlane_name = :old_name"),
        params={"new_name": target_new_name, "old_name": old_name},
    )

    session.commit()
    session.refresh(swimlane)
    return swimlane


@router.delete("/swimlanes/{name}")
def delete_swimlane(
    name: str,
    session: Session = Depends(get_session),
):
    swimlane = session.exec(select(Swimlane).where(Swimlane.name == name)).first()
    if not swimlane:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Swimlane '{name}' not found",
        )

    remaining = session.exec(
        select(Swimlane).where(Swimlane.name != name).order_by(Swimlane.order.asc())
    ).all()
    fallback_category = remaining[0].name if remaining else "General"

    # Reassign tasks in this swimlane to fallback category
    session.exec(
        text("UPDATE task SET category = :fallback WHERE category = :name"),
        params={"fallback": fallback_category, "name": name},
    )

    # Delete statuses associated with this swimlane
    session.exec(
        text("DELETE FROM status WHERE swimlane_name = :name"),
        params={"name": name},
    )

    session.delete(swimlane)
    session.commit()
    return {"message": f"Swimlane '{name}' deleted successfully", "fallback": fallback_category}
