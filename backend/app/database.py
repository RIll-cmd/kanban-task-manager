import os
import sys
import traceback
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine, select, text
from app.models import Hashtag, Status, Swimlane

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///../kanban.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)


def _safe_alter(session: Session, sql: str) -> None:
    """Execute an ALTER TABLE statement, silently ignoring if column already exists."""
    try:
        session.exec(text(sql))
        session.commit()
    except Exception:
        session.rollback()  # Prevent poisoned session state


def create_db_and_tables() -> None:
    # ── Step 1: Create all tables from SQLModel metadata ──
    try:
        SQLModel.metadata.create_all(engine)
        print("[DB INIT] [OK] SQLModel.metadata.create_all() completed successfully.")
    except Exception as exc:
        print(f"[DB INIT] [ERROR] FATAL: Failed to create tables from SQLModel metadata!", file=sys.stderr)
        traceback.print_exc()
        raise  # Re-raise — the app cannot function without tables

    # ── Step 2: Apply incremental SQLite migrations ──
    try:
        with Session(engine) as session:
            # ── Legacy migration columns ──
            _safe_alter(session, "ALTER TABLE task ADD COLUMN previous_progress INTEGER DEFAULT 0")
            _safe_alter(session, "ALTER TABLE task ADD COLUMN category TEXT DEFAULT 'General'")
            _safe_alter(session, "ALTER TABLE task ADD COLUMN note TEXT")
            _safe_alter(session, "ALTER TABLE status ADD COLUMN default_progress INTEGER DEFAULT 0")
            _safe_alter(session, "ALTER TABLE status ADD COLUMN swimlane_name TEXT DEFAULT 'General'")
            _safe_alter(session, 'ALTER TABLE swimlane ADD COLUMN "order" INTEGER DEFAULT 0')
            _safe_alter(session, "ALTER TABLE activitylog ADD COLUMN task_title TEXT DEFAULT ''")
            _safe_alter(session, "ALTER TABLE activitylog ADD COLUMN description TEXT DEFAULT ''")

            # ── Phase 1: Temporal tracking columns on task table ──
            _safe_alter(session, "ALTER TABLE task ADD COLUMN created_date DATETIME")
            _safe_alter(session, "ALTER TABLE task ADD COLUMN start_date DATE")
            _safe_alter(session, "ALTER TABLE task ADD COLUMN scheduled_date DATE")
            # due_date already exists as DATETIME; no ALTER needed — the column type
            # is widened from datetime to date in the model, which SQLite handles transparently.
            _safe_alter(session, "ALTER TABLE task ADD COLUMN completed_date DATE")
            _safe_alter(session, "ALTER TABLE task ADD COLUMN tags_json TEXT DEFAULT '[]'")
            _safe_alter(session, "ALTER TABLE task ADD COLUMN is_archived BOOLEAN DEFAULT 0")
            _safe_alter(session, "ALTER TABLE swimlane ADD COLUMN color TEXT DEFAULT '#00ffff'")
            _safe_alter(session, "ALTER TABLE status ADD COLUMN color TEXT DEFAULT '#00ffff'")
            _safe_alter(session, "ALTER TABLE hashtag ADD COLUMN color TEXT DEFAULT '#00d4ff'")

            # ── Back-fill created_date from created_at for existing rows ──
            try:
                session.exec(text(
                    "UPDATE task SET created_date = created_at WHERE created_date IS NULL"
                ))
                session.commit()
            except Exception:
                session.rollback()

            # ── Drop obsolete index if present ──
            try:
                session.exec(text("DROP INDEX IF EXISTS ix_status_name"))
                session.commit()
            except Exception:
                session.rollback()

            # Seed default swimlanes if empty
            try:
                existing_swimlanes = session.exec(select(Swimlane)).all()
                if not existing_swimlanes:
                    default_names = ["OpenCV & Software", "Hardware Integration", "General"]
                    for name in default_names:
                        session.add(Swimlane(name=name))
                    session.commit()
            except Exception as e:
                session.rollback()
                print(f"[DB INIT] Warning: Error seeding default swimlanes: {e}")

            # Seed default statuses per swimlane if empty
            try:
                swimlane_objs = session.exec(select(Swimlane)).all()
                swimlane_names = [s.name for s in swimlane_objs] or ["OpenCV & Software", "Hardware Integration", "General"]

                default_templates = [
                    {"name": "To Do", "order": 0, "default_progress": 0},
                    {"name": "In Progress", "order": 1, "default_progress": 50},
                    {"name": "Review", "order": 2, "default_progress": 80},
                    {"name": "Done", "order": 3, "default_progress": 100},
                ]

                for s_name in swimlane_names:
                    existing_for_lane = session.exec(select(Status).where(Status.swimlane_name == s_name)).all()
                    if not existing_for_lane:
                        for t in default_templates:
                            session.add(Status(
                                name=t["name"],
                                swimlane_name=s_name,
                                order=t["order"],
                                default_progress=t["default_progress"]
                            ))
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"[DB INIT] Warning: Error seeding default statuses per swimlane: {e}")

        print("[DB INIT] [OK] All migrations and seeds completed successfully.")
    except Exception as exc:
        print(f"[DB INIT] [ERROR] Error during migration/seeding phase:", file=sys.stderr)
        traceback.print_exc()
        # Don't re-raise — tables exist, migrations are best-effort


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
