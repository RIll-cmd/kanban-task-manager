import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine, select, text
from app.models import Status, Swimlane

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///../kanban.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    # Ensure columns exist on SQLite database if table already existed
    with Session(engine) as session:
        try:
            session.exec(text("ALTER TABLE task ADD COLUMN previous_progress INTEGER DEFAULT 0"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("ALTER TABLE task ADD COLUMN category TEXT DEFAULT 'General'"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("ALTER TABLE task ADD COLUMN note TEXT"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("ALTER TABLE status ADD COLUMN default_progress INTEGER DEFAULT 0"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("ALTER TABLE status ADD COLUMN swimlane_name TEXT DEFAULT 'General'"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text('ALTER TABLE swimlane ADD COLUMN "order" INTEGER DEFAULT 0'))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("ALTER TABLE activitylog ADD COLUMN task_title TEXT DEFAULT ''"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("ALTER TABLE activitylog ADD COLUMN description TEXT DEFAULT ''"))
            session.commit()
        except Exception:
            pass # Column already exists or fresh table

        try:
            session.exec(text("DROP INDEX IF EXISTS ix_status_name"))
            session.commit()
        except Exception:
            pass

        # Seed default swimlanes if empty
        try:
            existing_swimlanes = session.exec(select(Swimlane)).all()
            if not existing_swimlanes:
                default_names = ["OpenCV & Software", "Hardware Integration", "General"]
                for name in default_names:
                    session.add(Swimlane(name=name))
                session.commit()
        except Exception as e:
            print(f"Error seeding default swimlanes: {e}")

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
            print(f"Error seeding default statuses per swimlane: {e}")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
