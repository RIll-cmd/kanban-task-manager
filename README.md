# ⚡ CYBERPUNK_KANBAN // Task Management Terminal

A production-grade, highly customizable monorepo Kanban Task Manager built with a sleek neon/void hacker aesthetic. Unlike standard project boards, this terminal features isolated workflows, automated lifecycle states, and a live hardware/software audit trail designed for intricate engineering pipelines.

---

## 🖥️ System HUD Previews

*   📂 [View All System HUD & Console Screen Capture Assets](./screenshots/)

---

## 🚀 Key Features

*   **Isolated Custom Swimlanes:** Initialize lanes with standard pipelines or deploy a completely clean slate to build isolated, lane-specific status queues from scratch.
*   **Automated Progress Mapping:** Configure statuses with custom default progress thresholds (or set to "No Override"). Moving cards dynamically snaps progress metrics across the system.
*   **Cyberpunk Terminal Modals:** Native browser dialogs are completely eradicated in favor of custom, keyboard-focused UI prompt and confirmation modules matching the board theme.
*   **System Activity HUD Log:** A differential real-time system log sidebar tracking precise status changes, state updates, and technical scratchpad notes.
*   **Selective HUD Modes:** Instantly toggle the interface between an information-rich dashboard view and a minimal HUD layout to optimize screen space.

---

## 🛠️ Tech Stack & Architecture

### Backend Core
- **Framework:** FastAPI (Python)
- **Database / ORM:** SQLite via SQLModel
- **Validation:** Pydantic

### Frontend Interface
- **Framework:** React + TypeScript
- **Styling:** Tailwind CSS (Custom neon utility filters & clip-paths)
- **Drag & Drop:** `@hello-pangea/dnd`

---

## 💻 Local Infrastructure Deployment

### Prerequisites
- Node.js (v18+ recommended)
- Python (3.11+ recommended)

### 1. Database & Backend Engine Initialization
```bash
cd backend
# Create and activate virtual environment
python -m venv .venv
source .venv/Scripts/activate  # On Windows: .venv\Scripts\activate

# Install dependencies and start server
pip install -r requirements.txt
fastapi dev main.py
