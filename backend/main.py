from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.tasks import router as tasks_router
from app.api.swimlanes import router as swimlanes_router
from app.api.statuses import router as statuses_router
from app.api.hashtags import router as hashtags_router
from app.database import create_db_and_tables

app = FastAPI(title="Enterprise Kanban Task Manager API", version="1.0.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Include routers with /api prefix
app.include_router(tasks_router, prefix="/api")
app.include_router(swimlanes_router, prefix="/api")
app.include_router(statuses_router, prefix="/api")
app.include_router(hashtags_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Kanban Task Manager API is operational"}
