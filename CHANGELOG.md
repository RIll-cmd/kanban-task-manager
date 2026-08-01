# Changelog

All notable changes to the Cyberpunk Kanban Task Manager project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.32.1] - 2026-08-02

### Fixed
- **Syntax Repair in `PromptTerminal.tsx`**: Removed duplicate closing line in `useEffect` dependency array that caused a compiler parse error.

---

## [1.32.0] - 2026-08-02

### Added
- **Swimlane & Status Column Accent Color Customization**:
  - **Backend Schema & Migrations (`color`)**: Added `color` column (`default="#00ffff"`) to `Swimlane` and `Status` models, API router schemas, and database migration scripts.
  - **Prompt Terminal Hex Color Input (`PromptTerminal.tsx`)**: Extended `PromptTerminal` to support color input (`> COLOR_HEX`) with a live color preview block next to the input.
  - **Swimlane Header Color Customization**: Clicking `[EDIT]` on a Swimlane allows editing both name and accent color; dynamically applies `color` to title text and diamond indicator via inline styles.
  - **Status Column Color Customization**: Clicking the edit pencil on a status column allows configuring name, default progress, and accent color; dynamically applies `color` to status title, progress percentage, and diamond indicator.

---

## [1.31.0] - 2026-08-02

### Changed
- **Progress Override Refinement & Clean UI (`CreateTaskTerminal.tsx` & `EditTaskTerminal.tsx`)**:
  - **Disabled Status Auto-Overrides**: Removed all automatic progress overrides when selecting "To Do", "In Progress", or "Review" status dropdown options; the progress slider remains completely unconstrained and preserves the user's manual value.
  - **Exclusive Done Completion Rule**: Preserved automatic 100% progress snapping strictly when status is changed or dropped into "Done" / "DONE".
  - **Clean Slider Interface**: Removed all extra snap buttons (`[SNAP_0%]`, `[SNAP_50%]`, `[SNAP_80%]`) to maintain the clean, uncluttered Cyberpunk terminal UI layout.
  - **Safety Fallbacks**: Ensured progress defaults cleanly to the task's existing value or `0` for new tasks without being forced by status selections.

---

## [1.30.0] - 2026-08-02

### Added
- **Disabled Column Progress Overrides & Complete Snap Helper Matrix**:
  - **Drag-and-Drop Handler Refinement (`App.tsx`)**: Removed default column progress overrides when dragging tasks between "To Do", "In Progress", or "Review" columns; tasks retain their current progress percentage.
  - **Exclusive Done Column Rule**: Retained automatic 100% progress snapping strictly for tasks moved into the "Done" column.
  - **Full Snap Helper Suite (`[SNAP_0%]`, `[SNAP_50%]`, `[SNAP_80%]`)**:
    - Status = **To Do** -> Renders `[SNAP_0%]`.
    - Status = **In Progress** -> Renders `[SNAP_50%]`.
    - Status = **Review** -> Renders `[SNAP_80%]`.
  - **Payload Safety**: Guaranteed initial progress defaults to `0` or existing task progress so payload submission is never undefined.

---

## [1.29.0] - 2026-08-02

### Added
- **Interactive Progress Slider Snap Helpers**:
  - **Free Manual Slider Control**: Ensured status changes between "To Do", "In Progress", and "Review" never force progress overrides, while preserving the completion rule for "Done" (snaps to 100%).
  - **Conditional Snap Helper Buttons**:
    - Renders `[SNAP_50%]` next to slider when status is "In Progress".
    - Renders `[SNAP_80%]` next to slider when status is "Review".
  - **Cyberpunk Terminal Styling**: Styled with zero-radius monospace buttons (`font-mono border border-neon-cyan/40 bg-neon-cyan/5 text-neon-cyan hover:bg-neon-cyan/20`).
  - **Both Creation & Edit Modals**: Integrated in `EditTaskTerminal.tsx` and `CreateTaskTerminal.tsx`.

---

## [1.28.0] - 2026-08-01

### Added
- **Task Archival & Retrieval System**:
  - **Backend Model & Migration (`is_archived`)**: Added `is_archived: bool = Field(default=False)` to the `Task` model, Pydantic schemas, and database migration script.
  - **Card `[ARCHIVE]` Action**: Added an `[ARCHIVE]` button (neon amber styling) to `TaskCard` header when task progress is 100% and not yet archived.
  - **Card `[RESTORE]` Action**: Added a `[RESTORE]` button (neon green styling) to `TaskCard` header when viewing archived tasks, restoring them back to the active board on click.
  - **HUD Display Config Archive Mode Toggle (`showArchived`)**: Added `[ ] VIEW_ARCHIVE` toggle item to the `[Y] DISPLAY_CONFIG` dropdown checklist.
  - **Board View Filtering**: Updated board filtering engine to exclusively hide archived tasks during normal view and exclusively display archived tasks in Archive Mode.

---

## [1.27.0] - 2026-08-01

### Added
- **Task Deletion & Purge Capability in Edit Terminal**:
  - **Backend Endpoint (`DELETE /api/tasks/{task_id}`)**: Created endpoint returning HTTP 204 No Content and logging an activity log entry (`Task Deleted`).
  - **API Client Function (`deleteTask`)**: Added `deleteTask(taskId)` helper function in `frontend/src/api/client.ts`.
  - **Cyberpunk Purge Button (`EditTaskTerminal.tsx`)**: Injected `[❌ PURGE_NODE]` button with crimson styling (`border border-neon-red/60 bg-neon-red/10 text-neon-red hover:bg-neon-red hover:text-void rounded-none`) into the bottom action row (`type="button"` to avoid form submission).
  - **Terminal Error Integration & Immediate State Refresh**: Handled deletion errors via `parseApiError`, closed modal state cleanly on success, and triggered an immediate board tasks refresh in `App.tsx`.

---

## [1.26.0] - 2026-08-01

### Added
- **Cross-Lane Node Tracking Manifest (`[NODE_MANIFEST]`)**:
  - **Interactive `[SYS_AVG_PROGRESS]` Toggle**: Converted static progress readout into an interactive Cyberpunk trigger banner (`cursor-pointer`) displaying expand/collapse status arrows (`▼` / `▶`).
  - **Expandable Terminal Manifest (`TaskCard.tsx`)**: Created a nested dark terminal panel (`bg-void-card/95 border border-neon-magenta/60 rounded-none`) listing all matching sister node locations.
  - **Location & Progress Tracking Matrix**: Renders single-line entries for each duplicate node: `> [SWIMLANE_CATEGORY] / [STATUS_COLUMN] : PROGRESS -> [PERCENT]%`.
  - **Active Node Highlighting**: Highlights the current card's entry with a `▶` indicator arrow, `bg-neon-magenta/25` background, and bold neon text.

---

## [1.25.0] - 2026-08-01

### Fixed
- **Duplication Handshake & Immediate State Refresh**:
  - **Backend Model Alignment (`tasks.py`)**: Fixed `duplicate_task` endpoint in `backend/app/api/tasks.py` by mapping `previous_progress` instead of invalid kwarg `progress_percentage`.
  - **Backend & Frontend Logging**: Added explicit terminal prints (`[DPL_BACKEND]` & `[DPL_BACKEND_SUCCESS]`) and console readouts (`[DPL PAYLOAD SENT]` & `[DPL SUCCESS]`).
  - **Case-Insensitive Progress Calculation (`task.py`)**: Made `calculate_progress` model validator check `self.status.upper() == "DONE"`.
  - **Board State Synchronization (`App.tsx`)**: Updated `handleTaskCreated` callback to optimistically inject the cloned task and trigger an immediate re-fetch via `getTasks()`.

---

## [1.24.0] - 2026-08-01

### Fixed
- **React Portal Architecture for Duplicate Menu (`<TaskCard>`)**:
  - **Portal Target (`index.html`)**: Added `<div id="duplicate-menu-portal"></div>` directly beneath `<div id="root"></div>` in `index.html`.
  - **`createPortal` Implementation (`TaskCard.tsx`)**: Refactored `[SNAPSHOT_DUPLICATE]` menu popup rendering to use `createPortal`, injecting the DOM node directly into `#duplicate-menu-portal`.
  - **Dynamic Page Positioning**: Computed exact page coordinates (`rect.bottom + window.scrollY`, `rect.right + window.scrollX - 224`), eliminating any risk of parent overflow or stacking context clipping.

---

## [1.23.0] - 2026-08-01

### Fixed
- **Duplicate Menu Overflow & Clipping Fix (`<TaskCard>`)**:
  - **Fixed Viewport Positioning**: Replaced relative inline container popup layout with fixed viewport positioning using `getBoundingClientRect()` on the `[DPL]` button (`top: rect.bottom + 4`, `left: rect.right - 224`).
  - **Escaped Container Overflow & Stacking Contexts**: Assigned `z-[9999]` to the duplicate dropdown container and elevated the parent card z-index (`z-40`), ensuring the menu never clips under column borders or sibling task cards.
  - **Scroll & Window Event Listeners**: Added window scroll and resize event listeners to automatically close or re-anchor the dropdown when the board is scrolled.

---

## [1.22.0] - 2026-08-01

### Added
- **Path B: Snapshot Duplication & Cross-Lane Aggregate Progress**:
  - **Backend Duplication Endpoint (`POST /api/tasks/{id}/duplicate`)**: Added endpoint taking target `category` and `status`, creating an independent task record duplicating title, description, note, tags, priority, dates, and progress snapshot. Automatically applies 100% progress override if target status is "Done".
  - **HUD Display Toggle (`showCrossLaneStats`)**: Added `[x] Show Cross-Lane Stats` toggle option in the `[Y] DISPLAY_CONFIG` dropdown checklist.
  - **Cross-Lane Aggregate Progress Readout (`<TaskCard>`)**: Evaluates matching task titles across all swimlanes on the board, displaying `[SYS_AVG_PROGRESS] > {crossLaneAvgProgress}%` in neon magenta above progress bars when matching occurrences exist.
  - **Card Snapshot Duplicate Button (`[DPL]`)**: Added a Cyberpunk `[DPL]` button on `<TaskCard>` headers opening an in-card dropdown menu to select target swimlane & status and execute snapshot duplication.

---

## [1.21.0] - 2026-08-01

### Added
- **Smart Progress Override Rule for "Done" Status**:
  - **Edit & Create Terminal Modals**: Added reactive `useEffect` watching status selection to automatically snap progress to 100% when status is set to "Done" (case-insensitive check: `status.toUpperCase() === 'DONE'`).
  - **Manual Adjustment Flexibility**: Switching from "Done" back to another status keeps the slider at 100% allowing manual user adjustment.
  - **Drag-and-Drop Handler**: Updated `handleDragEnd` in `App.tsx` with case-insensitive `DONE` status checks (`isDestDone = destStatus.toUpperCase() === 'DONE'`), automatically setting task progress to 100% on column drop.

---

## [1.20.0] - 2026-08-01

### Added
- **Dynamic Column Average Progress Metric**:
  - Replaced static status default progress values with real-time average progress calculations (`averageProgress = Math.round(sum / tasks.length)`).
  - Handles empty columns cleanly (`0%` fallback) preventing `NaN` formatting errors.
  - Rendered formatted percentage `({averageProgress}%)` next to each status column title in Cyberpunk cyan styling (`text-neon-cyan/70`) with informative task count tooltips.

---

## [1.19.0] - 2026-08-01

### Added
- **Localized Task Creation & Empty Column Initiators**:
  - **Column Header Localized Add Button**: Added a Cyberpunk `[+]` button to each status column header in swimlanes to open `<CreateTaskTerminal>` pre-filled with that column's status and swimlane category.
  - **Clickable Empty Column Initiator**: Updated the `> EMPTY_LANE_` placeholder block into an interactive Cyberpunk trigger (`> EMPTY_LANE_ [ + INITIATE ]`) that opens task creation pre-filled for that specific location.
  - **Default Override Support in `<CreateTaskTerminal>`**: Updated `<CreateTaskTerminal>` with `defaultCategory` and `defaultStatus` props while preserving standard default behavior for the global `+ INITIATE_TASK` HUD button.

---

## [1.18.0] - 2026-08-01

### Added
- **FastAPI 422 Error Parsing Utility & Cyberpunk Terminal Alerts**:
  - Created `parseApiError` helper in `frontend/src/utils/errorParser.ts` to parse caught exception payloads, FastAPI 422 Pydantic validation error arrays, and stringified JSON detail payloads.
  - Formatted field validation failures into clean Cyberpunk terminal readouts: `[ERR_FIELD: FIELD_NAME] > MSG_TEXT`.
  - Updated `<CreateTaskTerminal>` and `<EditTaskTerminal>` to catch exceptions, parse validation errors into multiline string arrays, and render styled terminal alert banners (`bg-neon-red/10 border-neon-red/60 text-neon-red`).

---

## [1.17.0] - 2026-08-01

### Added
- **Phase 3: Global Board Search Engine, Tag Filter & Property Visibility Controls**:
  - **Cyberpunk Search Bar (`> SEARCH_SYS`)**: Added real-time text filter in top HUD searching task titles and descriptions with instant board updates.
  - **HUD Display Config Dropdown (`[Y] DISPLAY_CONFIG`)**: Built a custom absolute-positioned Cyberpunk dropdown menu with zero border radius, void background, and neon amber accent styling.
  - **Multi-Tag Filter Engine**: Filter tasks by toggling global tags (includes `[CLEAR_FILTERS]` button). Tasks match only if they contain all active filter tags.
  - **Dynamic Property Visibility Checklist**: Custom bracket toggles (`[x]` / `[ ]`) controlling visibility for Task ID (`#id`), Tag Pills, Temporal Dates (`START`, `SCHED`, `DUE`), and Progress Bars in `<TaskCard>`.

---

## [1.16.0] - 2026-08-01

### Added
- **Custom Cyberpunk React Tag Autocomplete Dropdown & Toggle Button**:
  - Replaced native browser `<datalist>` autocomplete with a custom Cyberpunk React dropdown in `<CreateTaskTerminal>` and `<EditTaskTerminal>`.
  - Added an in-input manual dropdown toggle button (`[▼]`) with Cyberpunk neon hover glow effects.
  - Implemented click-outside dismissal (`useRef` + `mousedown` listener) and input `onFocus` activation.
  - Renders unfiltered global tags when input is empty upon clicking `[▼]`, and dynamically filters matching suggestions while typing.
  - Zero border-radius (`rounded-none`), void background (`bg-void-card`), and custom neon tag text colors with hover highlight effects.

---

## [1.15.0] - 2026-08-01

### Added
- **Global Tag Management System & Custom Neon Color Palette**:
  - **Backend Tag Color Field & Delete Endpoint**: Added `color` column to `Hashtag` SQLModel with automated database migration check, updated `POST /api/hashtags` to accept custom colors, and added `DELETE /api/hashtags/{id}`.
  - **Global Tags Management Terminal (`<ManageTagsTerminal>`)**: Added `[#] GLOBAL_TAGS` button to top HUD. Built `<ManageTagsTerminal>` modal for creating tags with HTML5 color picker + neon presets, viewing global tags, and deleting tag entries.
  - **Dynamic Card Tag Colors (`<TaskCard>`)**: `<TaskCard>` dynamically matches task tags to global hashtags to apply custom tag text, border, and glow colors.

---

## [1.14.0] - 2026-08-01

### Added
- **Phase 2: Temporal Datelines & Tag Pill UI Upgrade**:
  - **Task Card Tag Pills & Temporal HUD (`<TaskCard>`)**: Added tag pill container with specialized Cyberpunk styling (`#bug` in neon red, standard tags in neon cyan) and temporal dateline metrics (`START_DATE`, `SCHEDULED_DATE`, `DUE_DATE`).
  - **Terminal Date Pickers & Tag Input System (`<CreateTaskTerminal>` & `<EditTaskTerminal>`)**:
    - Cyberpunk HTML5 `<input type="date">` fields for temporal tracking metrics.
    - Interactive tag input (`> INPUT_TAG`) with `Enter` key handling isolated from form submission.
    - Removable tag pills (`[x]`) and HTML `<datalist>` autocomplete connected to global hashtags registry (`getHashtags()`).

---

## [1.13.0] - 2026-08-01

### Added
- **Phase 1: Temporal Tracking & Global Hashtags Data Layer**:
  - **Temporal Tracking Fields (`Task` Model & DB)**: Added `created_date` (datetime), `start_date` (date), `scheduled_date` (date), `due_date` (date), and `completed_date` (date) to `Task` SQLModel with automated SQLite migration checks and `created_date` back-filling.
  - **Global Hashtag Registry**: Created `Hashtag` SQLModel table (`id`, `name`) and added `tags_json` array storage to `Task` model.
  - **Backend API Endpoints**: Added `GET /api/hashtags` and `POST /api/hashtags` endpoints. Updated `POST /api/tasks` and `PUT/PATCH /api/tasks/{task_id}` for date and tag parsing. Updated `GET /api/logs` to serialize explicit ISO-8601 timestamps.
  - **Frontend Types & Client**: Added `Hashtag` interface, updated `Task` and `CreateTaskPayload` types, and added `getHashtags()` and `createHashtag()` API client methods.

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
