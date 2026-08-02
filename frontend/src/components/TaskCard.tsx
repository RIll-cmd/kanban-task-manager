import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Draggable } from '@hello-pangea/dnd'
import type { Task, Hashtag } from '../types'
import { Calendar, Copy } from 'lucide-react'
import { duplicateTask, updateTask, type StatusItem } from '../api/client'

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'border-neon-red/60 text-neon-red bg-neon-red/10',
  MEDIUM: 'border-neon-amber/60 text-neon-amber bg-neon-amber/10',
  LOW: 'border-neon-green/60 text-neon-green bg-neon-green/10',
}

const PRIORITY_GLOW: Record<string, string> = {
  HIGH: '0 0 4px #ff3366, 0 0 8px #ff336640',
  MEDIUM: '0 0 4px #ffaa00, 0 0 8px #ffaa0040',
  LOW: '0 0 4px #00ff88, 0 0 8px #00ff8840',
}

export interface VisibleProps {
  showId: boolean
  showTags: boolean
  showDates: boolean
  showProgress: boolean
  showCrossLaneStats: boolean
  showArchived: boolean
}

interface TaskCardProps {
  task: Task
  index: number
  onEdit: (task: Task) => void
  isMinimalHUD?: boolean
  globalHashtags?: Hashtag[]
  visibleProps?: VisibleProps
  allTasks?: Task[]
  categories?: string[]
  statuses?: StatusItem[]
  onDuplicated?: (newTask: Task) => void
  onTaskUpdated?: (updatedTask: Task) => void
}

export default function TaskCard({
  task,
  index,
  onEdit,
  isMinimalHUD = false,
  globalHashtags = [],
  visibleProps = {
    showId: true,
    showTags: true,
    showDates: true,
    showProgress: true,
    showCrossLaneStats: true,
    showArchived: false,
  },
  allTasks = [],
  categories = [],
  statuses = [],
  onDuplicated,
  onTaskUpdated,
}: TaskCardProps) {
  const priorityStyle =
    PRIORITY_STYLES[task.priority] ?? 'border-cyber-border text-fg-muted bg-void-muted/30'
  const priorityGlow =
    PRIORITY_GLOW[task.priority] ?? 'none'

  // Archive & Duplicate states
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [isManifestOpen, setIsManifestOpen] = useState(false)
  const [targetCategory, setTargetCategory] = useState(categories[0] || task.category || 'General')
  const [targetStatus, setTargetStatus] = useState('To Do')
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null)

  const duplicateRef = useRef<HTMLDivElement>(null)
  const dplBtnRef = useRef<HTMLButtonElement>(null)

  const handleToggleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsArchiving(true)
    const nextArchived = !task.is_archived
    try {
      const updated = await updateTask(task.id, { is_archived: nextArchived })
      if (onTaskUpdated) {
        onTaskUpdated(updated)
      }
    } catch (err) {
      console.error(`Failed to toggle archive state for task #${task.id}:`, err)
    } finally {
      setIsArchiving(false)
    }
  }

  // Compute available statuses for selected target category
  const laneStatuses = statuses.filter((s) => s.swimlane_name === targetCategory).map((s) => s.name)
  const availableStatuses = laneStatuses.length > 0 ? laneStatuses : ['To Do', 'In Progress', 'Review', 'Done']

  useEffect(() => {
    if (!availableStatuses.includes(targetStatus)) {
      setTargetStatus(availableStatuses[0] || 'To Do')
    }
  }, [targetCategory, availableStatuses, targetStatus])

  // Click outside to close duplicate menu
  useEffect(() => {
    if (!isDuplicateOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        duplicateRef.current &&
        !duplicateRef.current.contains(e.target as Node) &&
        dplBtnRef.current &&
        !dplBtnRef.current.contains(e.target as Node)
      ) {
        setIsDuplicateOpen(false)
      }
    }
    const handleScrollOrResize = () => setIsDuplicateOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isDuplicateOpen])

  const handleToggleDuplicate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuCoords({
      top: rect.bottom + window.scrollY + 4,
      left: Math.max(10, rect.right + window.scrollX - 224), // 224px (w-56)
    })
    setIsDuplicateOpen((prev) => !prev)
  }

  const handleExecuteDuplicate = async () => {
    setIsDuplicating(true)
    const payload = { category: targetCategory, status: targetStatus }
    console.log(`[DPL PAYLOAD SENT] Task #${task.id} ->`, payload)

    try {
      const newClonedTask = await duplicateTask(task.id, targetCategory, targetStatus)
      console.log(`[DPL SUCCESS] Received cloned task from API:`, newClonedTask)
      setIsDuplicateOpen(false)
      if (onDuplicated) {
        onDuplicated(newClonedTask)
      }
    } catch (err) {
      console.error(`[DPL FAILURE] Failed to duplicate task #${task.id}:`, err)
    } finally {
      setIsDuplicating(false)
    }
  }

  // Cross-Lane occurrences calculation (match title case-insensitively across distinct locations)
  const matchingTitleTasks = allTasks.filter(
    (t) => t.title.trim().toLowerCase() === task.title.trim().toLowerCase()
  )
  const uniqueLocationsSet = new Set(
    matchingTitleTasks.map((t) => `${(t.category || 'General').toLowerCase()}-${(t.status || 'To Do').toLowerCase()}`)
  )
  const uniqueLocationsCount = uniqueLocationsSet.size
  const hasCrossLaneMatches = uniqueLocationsCount > 1
  const crossLaneAvgProgress = matchingTitleTasks.length > 0
    ? Math.round(
        matchingTitleTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
          matchingTitleTasks.length
      )
    : 0

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onEdit(task)
          }}
          className={`group relative cyber-chamfer-sm border border-cyber-border p-3.5 transition-all duration-200 hover:border-neon-green/50 hover:neon-glow-green ${
            snapshot.isDragging
              ? 'bg-void-card border-neon-green neon-glow-green scale-[1.02] shadow-2xl z-50'
              : isDuplicateOpen
              ? 'bg-void/90 z-40 border-neon-magenta/60'
              : 'bg-void/80'
          }`}
        >
          {/* Scanline texture on card */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,136,0.03) 3px, rgba(0,255,136,0.03) 4px)',
            }}
          />

          {/* Corner accent marks */}
          <div className="pointer-events-none absolute top-0 left-0 h-2 w-2 border-t border-l border-neon-green/40 transition-colors group-hover:border-neon-green" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-neon-green/40 transition-colors group-hover:border-neon-green" />

          {/* Tags Pill Container */}
          {visibleProps.showTags && task.tags && task.tags.length > 0 && (
            <div className="relative mb-2 flex flex-wrap gap-1">
              {task.tags.map((tag, i) => {
                const formatted = tag.startsWith('#') ? tag : `#${tag}`
                const matchedGlobal = globalHashtags.find(
                  (h) => h.name.toLowerCase() === formatted.toLowerCase()
                )
                const hex = matchedGlobal?.color || (formatted.toLowerCase() === '#bug' ? '#ff3366' : '#00d4ff')

                return (
                  <span
                    key={`${tag}-${i}`}
                    className="cyber-chamfer-sm border px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider uppercase transition-colors"
                    style={{
                      color: hex,
                      borderColor: `${hex}80`,
                      backgroundColor: `${hex}15`,
                      boxShadow: `0 0 3px ${hex}30`,
                    }}
                  >
                    {formatted}
                  </span>
                )
              })}
            </div>
          )}

          {/* Title + ID + Priority + Action Buttons row */}
          <div className={`relative flex items-start justify-between gap-2 ${isMinimalHUD ? '' : 'mb-2'}`}>
            <h3 className="font-label text-sm font-medium uppercase leading-snug tracking-wide text-fg flex items-center gap-1.5">
              {visibleProps.showId && (
                <span className="font-mono text-[11px] font-bold text-neon-cyan/90">
                  #{task.id}
                </span>
              )}
              {task.title}
            </h3>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Archive / Restore Button */}
              {task.is_archived ? (
                <button
                  type="button"
                  disabled={isArchiving}
                  onClick={handleToggleArchive}
                  className="cyber-chamfer-sm border border-neon-green/60 bg-neon-green/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-neon-green transition-colors hover:bg-neon-green hover:text-void focus-visible:outline-none disabled:opacity-50"
                  title="Restore task node to active board"
                >
                  [RESTORE]
                </button>
              ) : (
                Math.round(task.progress_percentage || 0) === 100 && (
                  <button
                    type="button"
                    disabled={isArchiving}
                    onClick={handleToggleArchive}
                    className="cyber-chamfer-sm border border-neon-amber/60 bg-neon-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-neon-amber transition-colors hover:bg-neon-amber hover:text-void focus-visible:outline-none disabled:opacity-50"
                    title="Archive 100% completed task node"
                  >
                    [ARCHIVE]
                  </button>
                )
              )}

              <span
                className={`cyber-chamfer-sm border px-2 py-0.5 font-label text-[9px] font-semibold uppercase tracking-[0.2em] ${priorityStyle}`}
                style={{ boxShadow: priorityGlow }}
              >
                {task.priority}
              </span>

              {/* Edit Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                }}
                className="cyber-chamfer-sm border border-cyber-border bg-void-muted/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted transition-colors hover:border-neon-cyan/60 hover:text-neon-cyan focus-visible:outline-none"
                title="Edit task (or double-click card)"
              >
                [EDIT]
              </button>

              {/* Duplicate Button Container */}
              <div className="relative">
                <button
                  ref={dplBtnRef}
                  type="button"
                  onClick={handleToggleDuplicate}
                  className="cyber-chamfer-sm border border-cyber-border bg-void-muted/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted transition-colors hover:border-neon-magenta/60 hover:text-neon-magenta focus-visible:outline-none"
                  title="Duplicate task snapshot to swimlane"
                >
                  [DPL]
                </button>

                {/* Duplicate Menu Dropdown (React Portal into #duplicate-menu-portal) */}
                {isDuplicateOpen &&
                  menuCoords &&
                  createPortal(
                    <div
                      ref={duplicateRef}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: `${menuCoords.top}px`,
                        left: `${menuCoords.left}px`,
                      }}
                      className="z-[9999] w-56 rounded-none border border-neon-magenta bg-void-card shadow-[0_0_20px_rgba(255,0,255,0.4)] p-2.5 space-y-2 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-cyber-border/60 pb-1">
                        <span className="font-label text-[10px] uppercase text-neon-magenta font-bold flex items-center gap-1">
                          <Copy className="h-3 w-3" /> [SNAPSHOT_DUPLICATE]
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDuplicateOpen(false)}
                          className="text-fg-muted hover:text-neon-red text-xs font-bold"
                        >
                          ×
                        </button>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase text-fg-muted mb-0.5">
                          TARGET_SWIMLANE
                        </label>
                        <select
                          value={targetCategory}
                          onChange={(e) => setTargetCategory(e.target.value)}
                          className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1 px-1.5 font-mono text-xs text-neon-magenta focus:border-neon-magenta focus:outline-none"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c} className="bg-void-card text-fg">
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase text-fg-muted mb-0.5">
                          TARGET_STATUS
                        </label>
                        <select
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value)}
                          className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1 px-1.5 font-mono text-xs text-neon-magenta focus:border-neon-magenta focus:outline-none"
                        >
                          {availableStatuses.map((s) => (
                            <option key={s} value={s} className="bg-void-card text-fg">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isDuplicating}
                        onClick={handleExecuteDuplicate}
                        className="cyber-chamfer-sm w-full border border-neon-magenta bg-neon-magenta/20 py-1 font-label text-[10px] uppercase tracking-wider text-neon-magenta hover:bg-neon-magenta hover:text-void transition-colors disabled:opacity-50"
                      >
                        {isDuplicating ? 'DUPLICATING...' : '[CONFIRM_DUPLICATE]'}
                      </button>
                    </div>,
                    document.getElementById('duplicate-menu-portal') || document.body
                  )}
              </div>
            </div>
          </div>

          {/* Detailed View Only Properties */}
          {!isMinimalHUD && (
            <>
              {/* Temporal Dates HUD */}
              {visibleProps.showDates && (task.due_date || task.start_date || task.scheduled_date) && (
                <div className="relative mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-fg-muted">
                  {task.start_date && (
                    <span className="flex items-center gap-1 text-neon-cyan/80">
                      <Calendar className="h-3 w-3" />
                      START: {task.start_date}
                    </span>
                  )}
                  {task.scheduled_date && (
                    <span className="flex items-center gap-1 text-neon-amber/80">
                      <Calendar className="h-3 w-3" />
                      SCHED: {task.scheduled_date}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-neon-red/80 font-semibold">
                      <Calendar className="h-3 w-3" />
                      DUE: {task.due_date}
                    </span>
                  )}
                </div>
              )}

              {/* Description snippet */}
              {task.description && (
                <p className="relative mb-3 line-clamp-2 font-mono text-xs leading-relaxed text-fg-muted">
                  <span className="text-neon-green/60">{'> '}</span>
                  {task.description}
                </p>
              )}

              {/* Heavy Scratchpad / Note Snippet */}
              {task.note && (
                <div className="relative mb-3 border border-neon-amber/50 bg-neon-amber/5 p-2 font-mono text-[11px] text-neon-amber leading-relaxed cyber-chamfer-sm">
                  <span className="font-bold text-neon-amber/80 block mb-0.5">{'> '}SCRATCHPAD_NOTE:</span>
                  <p className="whitespace-pre-wrap break-all opacity-90 line-clamp-3">{task.note}</p>
                </div>
              )}

              {/* Cross-Lane Aggregate Progress Readout & Node Manifest */}
              {visibleProps.showCrossLaneStats && hasCrossLaneMatches && (
                <div className="relative mb-2">
                  {/* Clickable Banner Container */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsManifestOpen((prev) => !prev)
                    }}
                    className={`flex items-center justify-between font-mono text-[10px] text-neon-magenta px-2 py-1 cyber-chamfer-sm cursor-pointer transition-all ${
                      isManifestOpen
                        ? 'border border-neon-magenta bg-neon-magenta/20 shadow-[0_0_8px_rgba(255,0,255,0.3)]'
                        : 'border border-neon-magenta/40 bg-neon-magenta/10 hover:border-neon-magenta hover:bg-neon-magenta/15'
                    }`}
                    title="Click to inspect cross-lane node locations and statuses"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Copy className="h-3 w-3" /> [SYS_AVG_PROGRESS] {isManifestOpen ? '▼' : '▶'}
                    </span>
                    <span className="font-bold tabular-nums flex items-center gap-1">
                      <span>{crossLaneAvgProgress}%</span>
                      <span className="text-[9px] text-fg-muted font-normal">
                        ({matchingTitleTasks.length} NODES)
                      </span>
                    </span>
                  </div>

                  {/* Expandable Cross-Lane Node Manifest Panel */}
                  {isManifestOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 border border-neon-magenta/60 bg-void-card/95 p-2 font-mono text-[10px] space-y-1 rounded-none shadow-[0_0_12px_rgba(255,0,255,0.2)]"
                    >
                      <div className="flex items-center justify-between border-b border-neon-magenta/30 pb-1 text-[9px] text-neon-magenta font-bold uppercase tracking-wider mb-1">
                        <span>[NODE_MANIFEST] :: {matchingTitleTasks.length} TRACKED_LOCATIONS</span>
                        <button
                          type="button"
                          onClick={() => setIsManifestOpen(false)}
                          className="text-fg-muted hover:text-neon-magenta text-[9px]"
                        >
                          [HIDE]
                        </button>
                      </div>

                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {matchingTitleTasks.map((t) => {
                          const isCurrentCard = t.id === task.id
                          const taskCategory = (t.category || 'General').toUpperCase()
                          const taskStatus = (t.status || 'To Do').toUpperCase()
                          const taskProgress = Math.round(t.progress_percentage || 0)

                          return (
                            <div
                              key={t.id}
                              className={`flex items-center justify-between px-1.5 py-0.5 rounded-none transition-colors ${
                                isCurrentCard
                                  ? 'bg-neon-magenta/25 text-neon-magenta font-bold border-l-2 border-neon-magenta'
                                  : 'text-fg-muted/90 hover:text-fg hover:bg-void-muted/40'
                              }`}
                            >
                              <span className="truncate max-w-[170px] flex items-center gap-1">
                                {isCurrentCard ? '▶' : '>'}
                                <span>[{taskCategory}] / [{taskStatus}]</span>
                              </span>
                              <span className="tabular-nums shrink-0 font-semibold text-neon-cyan">
                                {taskProgress}%
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {visibleProps.showProgress && (
                <div className="relative mt-auto">
                  <div className="mb-1 flex items-center justify-between font-label text-[10px] uppercase tracking-[0.15em] text-fg-muted">
                    <span>progress</span>
                    <span className="tabular-nums text-neon-cyan">{task.progress_percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-cyber-border">
                    <div
                      className="progress-neon h-full transition-all duration-300"
                      style={{ width: `${task.progress_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Subtask count */}
              {task.subtasks && task.subtasks.length > 0 && (
                <p className="relative mt-2 font-label text-[10px] uppercase tracking-[0.15em] text-fg-muted">
                  [{task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}] subtasks_complete
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Draggable>
  )
}
