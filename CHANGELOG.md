# Changelog

All notable changes to the Cyberpunk Kanban Task Manager project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.12.0] - 2026-08-01

### Added
- **Activity Log Sidebar & Differential Backend Logging**:
  - `ActivityLog` model and database table updated with `task_title` and `description` string fields with automated SQLite startup migration checks.
  - Endpoint `GET /api/logs`: Returns top 50 recent activity logs ordered by timestamp descending.
  - Differential Backend Logging: Task update endpoint compares prior task state to incoming payload, automatically generating readable activity entries for status transitions (`Moved to [New Status]`), progress updates (`Progress updated to [X]%`), and note modifications (`Updated note`).
  - `getActivityLogs()` frontend API client function and TypeScript interface updates.
  - Cyberpunk Sliding Sidebar: Togglable right-side overlay (`[≡] SYSTEM_LOGS`) displaying terminal-styled timestamped activity logs with a manual `[REFRESH_LOGS]` action.
- **Swimlane Header UI Cleanup**:
  - Simplified swimlane headers by removing redundant `"SWIMLANE :: "` prefix text in favor of clean prompt headings (e.g. `> GENERAL`).

---

## [1.11.0] - 2026-08-01

### Added
- **Task Scratchpad Note Field (`note`)**:
  - `note` string field added to `Task` database model with automated SQLite migration check (`ALTER TABLE task ADD COLUMN note TEXT`).
  - FastAPI schemas (`TaskCreate`, `TaskUpdate`, `TaskReadWithProgress`) and TypeScript `Task` / `CreateTaskPayload` interfaces updated with optional `note` property.
  - Added dedicated `> SCRATCHPAD_NOTE (CODE_SNIPPETS / PARAMS)` textarea input to `<CreateTaskTerminal>` and `<EditTaskTerminal>` with distinct neon amber styling.
  - Rendered as a distinct amber code snippet block on `<TaskCard>` for storing heavy code snippets or technical parameters separate from the main task description.
- **Global Selective Property Display (Minimal vs. Detailed HUD Toggle)**:
  - Header control button (`[O] HUD: MINIMAL / DETAILED`) for toggling between minimal and detailed task card views.
  - Minimal HUD Mode (`isMinimalHUD = true`): Renders only essential task titles and priority badges to provide a clean, distraction-free board overview.
  - Detailed HUD Mode (`isMinimalHUD = false`): Renders complete card details including description text, scratchpad note blocks, subtask counters, and progress indicators.

---

## [1.10.0] - 2026-08-01

### Added
- **Dedicated Cyberpunk "No Override" Toggle in `<PromptTerminal>`**:
  - Added `secondaryAllowNoOverride` boolean prop to `<PromptTerminal>` to replace text-based `'none'` typing with a dedicated Cyberpunk checkbox control (`[ ] DISABLE_PROGRESS_OVERRIDE (NO OVERRIDE)`).
  - Visual Feedback & State Isolation: Checking the toggle disables the numeric progress input field (`disabled={true}`), applies `opacity-40 cursor-not-allowed`, and renders `NO_OVERRIDE_ACTIVE` as the placeholder.
  - Automatic Validation Bypass: When the "No Override" toggle is enabled, numeric validation checks are bypassed on submit and the field resolves cleanly to `null` on the backend.

---

## [1.9.0] - 2026-08-01

### Added
- **Strict Numeric Input Validation & Spinner Suppression**:
  - Task progress inputs in `<EditTaskTerminal>` updated with `type="number"`, `min={0}`, `max={100}`, and Tailwind utility classes (`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`) to suppress default browser stepper arrows.
  - Strict Integer Parsing: `onChange` handlers parse input values to integers, clamping numbers between 0 and 100 while rejecting non-numeric character insertions.
  - `<PromptTerminal>` Numeric Mode (`isNumeric` / `secondaryIsNumeric`): Configures prompt input fields as numeric and validates typed content upon submission.
  - Cyberpunk Validation Error Displays: Rejection of invalid types displays a glowing neon red error alert (`> ERR: INVALID_DATA_TYPE - NUMERIC REQUIRED`).
  - Status Progress "No Override" Safeguard: Allows empty string inputs or `"none"` / `"null"` strings to resolve as `null` while blocking invalid letters.

---

## [1.8.0] - 2026-08-01

### Added
- **Universal Cyberpunk UI Modals (`<ConfirmTerminal>` & `<PromptTerminal>`)**:
  - Completely eradicated native browser `window.prompt` and `window.confirm` dialogs across the entire application.
  - `<PromptTerminal>`: Styled single or dual-input modal with auto-focus, validation, and Cyberpunk HUD aesthetics for renaming swimlanes, adding status columns, and editing status configurations.
  - `<ConfirmTerminal>`: Warning modal with neon red accents for confirming deletion of swimlanes and status columns.
- **Swimlane Deletion Endpoint & UI**:
  - `DELETE /api/swimlanes/{name}`: Deletes a swimlane, removes its associated status column declarations, and safely reassigns tasks to a fallback swimlane.
  - Added `[DELETE]` button to each swimlane header triggerable via `<ConfirmTerminal>`.
- **Vertical Swimlane Drag-and-Drop Reordering**:
  - `order` integer column added to `Swimlane` database table with automated migration check (`ALTER TABLE swimlane ADD COLUMN "order" INTEGER DEFAULT 0`).
  - `PUT /api/swimlanes/reorder`: Endpoint for bulk updating swimlane order indices.
  - Integrated `<Droppable droppableId="all-swimlanes" type="SWIMLANE">` and `<Draggable>` rows with dedicated `GripVertical` handle icons in swimlane headers for vertical drag-and-drop reordering.
- **Swimlane Auto-Sort Feature**:
  - Header control selector supporting three sorting modes:
    - **`Custom`**: Driven by manual Drag-and-Drop ordering stored in the database.
    - **`Volume`**: Sorts swimlane rows dynamically by total task node count (High to Low).
    - **`A-Z`**: Sorts swimlane rows alphabetically by name.

---

## [1.7.0] - 2026-08-01

### Added
- **Cyberpunk Swimlane Creation Terminal (`<SwimlaneCreationTerminal>`)**:
  - Replaced native browser `window.prompt` and `window.confirm` dialogs with a custom modal overlay matching the Cyberpunk design system (void background, backdrop-blur, neon cyan focus rings, chamfered HUD corners, and `>` input prompt).
  - Built-in Auto-Focus: Text input automatically receives focus when the modal opens for frictionless typing.
  - Hacker-Styled Action Controls: Features two dedicated buttons: `[INIT_WITH_DEFAULTS]` (pre-populates standard columns) and `[INIT_CLEAN_SLATE]` (creates an empty lane), along with an `[X]` top-right close button and `[CANCEL]` action.

---

## [1.6.0] - 2026-08-01

### Added
- **Clean vs. Default Swimlane Initialization**:
  - `SwimlaneCreate` backend Pydantic model updated with optional `use_defaults: bool = True` field.
  - `POST /api/swimlanes` endpoint checks `use_defaults`. If `True`, automatically populates 4 default linked `Status` records (`To Do` = 0%, `In Progress` = 50%, `Review` = 80%, `Done` = 100%) for the new swimlane.
  - Updated `createSwimlane` frontend API client function signature to accept `useDefaults: boolean`.
  - Frontend `[+] INITIATE_LANE` button prompts the user to select between default column initialization or creating a completely clean, empty swimlane.
  - Instant Rendering: Re-fetches status state immediately upon swimlane creation so new default columns render without requiring a page refresh.
  - Clean Swimlane Fallback UI: Clean swimlanes display a stylized empty state notice with a direct `[+] ADD STATUS COLUMN` action button.

---

## [1.5.0] - 2026-08-01

### Added
- **Swimlane-Specific Custom Status Isolation**:
  - Added `swimlane_name` string field to `Status` SQLModel database table with automated migration check (`ALTER TABLE status ADD COLUMN swimlane_name TEXT DEFAULT 'General'`).
  - Automated startup seeding of default status columns (`To Do`, `In Progress`, `Review`, `Done`) per swimlane.
  - API endpoints (`GET/POST/PUT/DELETE /api/statuses`) updated to accept, filter, and isolate statuses by `swimlane_name`.
  - Swimlane-Filtered Render: Vertically rendered Kanban columns filtered strictly per swimlane row.
  - Swimlane Status Creation: `[+] ADD STATUS` button scope-bound to the active swimlane.
  - Dynamic Terminal Filtering: Category dropdown selections in `<CreateTaskTerminal>` and `<EditTaskTerminal>` dynamically filter available status options to matching swimlane statuses.
- **Nullable "No Override" Default Progress**:
  - Changed `default_progress` in `Status` model, FastAPI schemas, and TypeScript `StatusItem` interface to nullable `number | null`.
  - Prompts for status creation and editing support leaving the progress field blank or typing `"none"` to set `default_progress = null`.
  - Column headers render `(--)` for "No Override" statuses.
  - Drag-and-Drop Safeguard: Dragging tasks into a status with `default_progress = null` leaves the task's `progress_percentage` unchanged.

---

## [1.4.0] - 2026-08-01

### Added
- **Automated Status-Based Progress Mapping**:
  - `default_progress` integer field added to `Status` database table model with automated SQLite migration check (`ALTER TABLE status ADD COLUMN default_progress INTEGER DEFAULT 0`).
  - Sensible progress defaults assigned upon database initialization (`To Do` = 0%, `In Progress` = 50%, `Review` = 80%, `Done` = 100%).
  - Backend API schemas (`StatusCreate`, `StatusUpdate`) and endpoints updated to support setting and retrieving custom `default_progress` percentages (0–100%).
  - Frontend `StatusItem` interface and API client methods (`createStatus`, `updateStatus`) updated with `defaultProgress` parameters.
  - Automatic Drag-and-Drop Progress Updates: Moving a task into any status automatically maps the task's progress percentage to that status's `default_progress` value while preserving "Done" memory logic.
  - Column Header Status Settings: Inline `[EDIT]` prompt updated to configure status name and default progress percentage with live percentage indicator badges `(X%)` displayed beside column titles.

---

## [1.3.0] - 2026-08-01

### Added
- **Dynamic Custom Status Management (Add / Rename / Delete)**:
  - `Status` SQLModel database table with `id`, `name`, and sequential `order` fields.
  - Automated startup database seeding for default statuses (`To Do`, `In Progress`, `Review`, `Done`).
  - Backend API endpoints: `GET /api/statuses`, `POST /api/statuses`, `PUT /api/statuses/{old_name}`, and `DELETE /api/statuses/{name}`.
  - Automatic task status bulk updates on status rename and task fallback reassignment on status deletion to prevent orphaned tasks.
  - Frontend API client methods (`getStatuses`, `createStatus`, `updateStatus`, `deleteStatus`) in `client.ts`.
  - UI Status Creation: `[+] ADD STATUS` cyberpunk button for live addition of custom column statuses.
  - Inline Column Header Controls: Quick `[EDIT]` and `[X]` (trash) icons beside column headers for prompt-driven renaming and removal with optimistic state updates.
  - Dynamic Status dropdown synchronization across `<CreateTaskTerminal>` and `<EditTaskTerminal>`.

---

## [1.2.0] - 2026-08-01

### Added
- **Dynamic Swimlane Management**:
  - `Swimlane` database table model and DB startup seeding (`OpenCV & Software`, `Hardware Integration`, `General`).
  - Backend API routes: `GET /api/swimlanes`, `POST /api/swimlanes`, `PUT /api/swimlanes/{old_name}` (with task category bulk updating to prevent orphaned tasks).
  - Frontend API client integrations (`getSwimlanes`, `createSwimlane`, `updateSwimlane`).
  - UI Swimlane Creation: `[+] INITIATE_LANE` cyberpunk button for creating new empty swimlanes.
  - UI Swimlane Renaming: `[EDIT]` button on swimlane headers enabling inline renaming with optimistic updates across swimlane list and task state.
  - Dynamic Category dropdown sync across task creation and editing terminals.

---

## [1.1.0] - 2026-08-01

### Added
- **Kanban Swimlanes**:
  - Horizontal categorization separating tasks into distinct swimlane rows (e.g., `OpenCV & Software`, `Hardware Integration`, `General`).
  - Added `category` field across SQLite models, FastAPI/Pydantic schemas, and frontend TypeScript interfaces.
  - Automated SQLite database migration check (`ALTER TABLE task ADD COLUMN category TEXT DEFAULT 'General'`) upon startup.
  - Updated `<Droppable>` drag-and-drop targets to use composite IDs (`${category}|${status}`).
  - Full cross-lane and cross-column drag-and-drop support with simultaneous optimistic state updates and backend synchronization.
- **Task Category Controls**:
  - Added neon Cyberpunk category dropdown pickers to both `<CreateTaskTerminal>` and `<EditTaskTerminal>`.

---

## [1.0.0] - 2026-08-01

### Added
- **Task Creation Terminal (`<CreateTaskTerminal>`)**:
  - Full modal overlay with retro terminal aesthetic (void background, neon focus ring animations, `>` prompt indicators, and chamfered HUD corners).
- **Interactive Drag-and-Drop System (`@hello-pangea/dnd`)**:
  - Drag-and-drop re-ordering across Kanban columns with optimistic updates and seamless state reversal on network errors.
- **Backend Progress Memory Automation**:
  - Automatic progress calculation based on subtasks completion percentage.
  - Smart status transition logic: automatically saves `previous_progress` and sets progress to 100% when moving tasks to "Done", and restores `previous_progress` when moving tasks out of "Done".
- **Task Editing UI (`<EditTaskTerminal>` & `<TaskCard>`)**:
  - Double-click card or click dedicated monospace `[EDIT]` button to launch the edit terminal.
  - In-place editing of title, description, status, priority, and manual numeric progress percentage override (0–100%).
- **Cyberpunk UI Design Token System**:
  - Neon green, cyan, amber, and magenta color palette with CSS HUD scanlines, chamfer clip-paths, and glow effects.
