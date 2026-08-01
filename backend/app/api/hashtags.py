from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Hashtag
from app.schemas.task import HashtagCreate, HashtagRead

router = APIRouter()


@router.get("/hashtags", response_model=List[HashtagRead])
def list_hashtags(
    session: Session = Depends(get_session),
):
    """Return all registered hashtags, sorted alphabetically."""
    statement = select(Hashtag).order_by(Hashtag.name.asc())
    return session.exec(statement).all()


@router.post("/hashtags", response_model=HashtagRead, status_code=status.HTTP_201_CREATED)
def create_hashtag(
    data: HashtagCreate,
    session: Session = Depends(get_session),
):
    """Register or update a global hashtag. Name must start with '#'."""
    name = data.name.strip()
    tag_color = data.color.strip() if data.color else "#00d4ff"

    # Auto-prefix with '#' if the caller forgot
    if not name.startswith("#"):
        name = f"#{name}"

    if len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hashtag name must be at least 2 characters (including '#').",
        )

    # Check for duplicates
    existing = session.exec(
        select(Hashtag).where(Hashtag.name == name)
    ).first()
    if existing:
        if data.color and existing.color != tag_color:
            existing.color = tag_color
            session.add(existing)
            session.commit()
            session.refresh(existing)
        return existing

    hashtag = Hashtag(name=name, color=tag_color)
    session.add(hashtag)
    session.commit()
    session.refresh(hashtag)
    return hashtag


@router.delete("/hashtags/{hashtag_id}")
def delete_hashtag(
    hashtag_id: int,
    session: Session = Depends(get_session),
):
    """Delete a global hashtag by ID."""
    hashtag = session.get(Hashtag, hashtag_id)
    if not hashtag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hashtag with ID {hashtag_id} not found",
        )
    session.delete(hashtag)
    session.commit()
    return {"message": f"Hashtag '{hashtag.name}' deleted successfully"}
