import { useState, useRef, useEffect } from 'react'
import { X, Save, ChevronDown } from 'lucide-react'
import type { Task } from '../types'
import type { StatusItem } from '../api/client'

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const DEFAULT_STATUSES: string[] = ['To Do', 'In Progress', 'Review', 'Done']
const DEFAULT_CATEGORIES: string[] = ['OpenCV & Software', 'Hardware Integration', 'General']

interface EditTaskTerminalProps {
  task: Task | null
  onClose: () => void
  onSave: (updatedTask: Task) => Promise<void> | void
  categories?: string[]
  statuses?: StatusItem[]
}

export default function EditTaskTerminal({ task, onClose, onSave, categories, statuses }: EditTaskTerminalProps) {
  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(task?.description || '')
  const [note, setNote] = useState(task?.note || '')
  const [category, setCategory] = useState<string>(task?.category || 'General')

  const laneStatuses = statuses
    ? statuses.filter((s) => s.swimlane_name === category).map((s) => s.name)
    : []
  const availableStatuses = laneStatuses.length > 0 ? laneStatuses : DEFAULT_STATUSES

  const [status, setStatus] = useState<string>('To Do')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [progress, setProgress] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleRef = useRef<HTMLInputElement>(null)

  // Populate state when task prop changes or modal opens
  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setNote(task.note || '')
      setStatus(task.status || 'To Do')
      setPriority(task.priority || 'MEDIUM')
      setCategory(task.category || 'General')
      setProgress(Math.round(task.progress_percentage || 0))
      setError(null)

      const timer = setTimeout(() => titleRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [task])

  // Close on Escape key
  useEffect(() => {
    if (!task) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [task, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('[ERR] > title_field_required')
      return
    }

    const validProgress = Math.max(0, Math.min(100, Number(progress) || 0))

    setSubmitting(true)
    setError(null)

    let finalProgress = validProgress
    let prevProgress = task.previous_progress

    // Progress memory sync logic if status is changed to or from Done
    if (status === 'Done' && task.status !== 'Done') {
      prevProgress = Math.round(task.progress_percentage)
      finalProgress = 100
    } else if (task.status === 'Done' && status !== 'Done') {
      // If moving out of Done, restore previous_progress or user-entered progress
      if (validProgress === 100) {
        finalProgress = task.previous_progress ?? 0
      }
    }

    const updatedTask: Task = {
      ...task,
      title: trimmedTitle,
      description: description.trim() || null,
      note: note.trim() || null,
      status,
      priority,
      category,
      progress_percentage: finalProgress,
      previous_progress: prevProgress,
    }

    try {
      await onSave(updatedTask)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`[ERR_UPDATE] > ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!task) return null

  return (
    /* ── Backdrop ───────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit task terminal"
    >
      {/* ── Terminal Window ─────────────────────────────── */}
      <div className="cyber-chamfer relative mx-4 w-full max-w-lg border border-cyber-border bg-void-card shadow-2xl">

        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-cyan" />

        {/* ── Title bar ──────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-cyber-border px-4 py-2.5">
          {/* Traffic light dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neon-red/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-neon-amber/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-neon-cyan/80" />
            </div>
            <span className="font-label text-xs uppercase tracking-[0.2em] text-neon-cyan">
              edit_node_terminal #{task.id}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted transition-colors hover:text-neon-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
            aria-label="Close edit terminal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Form Body ──────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4">

          {/* Title field */}
          <div>
            <label
              htmlFor="edit-task-title"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
            >
              title *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan/60">
                {'>'}
              </span>
              <input
                ref={titleRef}
                id="edit-task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="enter_task_name..."
                className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-2.5 pl-8 pr-3 font-mono text-sm text-neon-cyan placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff,0_0_16px_#00d4ff30]"
              />
            </div>
          </div>

          {/* Description field */}
          <div>
            <label
              htmlFor="edit-task-description"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
            >
              description
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-3 font-mono text-sm text-neon-cyan/60">
                {'>'}
              </span>
              <textarea
                id="edit-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional_description..."
                rows={3}
                className="cyber-chamfer-sm w-full resize-none border border-cyber-border bg-void py-2.5 pl-8 pr-3 font-mono text-sm text-neon-cyan placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff,0_0_16px_#00d4ff30]"
              />
            </div>
          </div>

          {/* Note / Scratchpad field */}
          <div>
            <label
              htmlFor="edit-task-note"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-neon-amber/80"
            >
              {'>'} SCRATCHPAD_NOTE (CODE_SNIPPETS / PARAMS)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-3 font-mono text-sm text-neon-amber/60">
                {'>'}
              </span>
              <textarea
                id="edit-task-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="optional_code_snippets_or_heavy_parameters..."
                rows={2}
                className="cyber-chamfer-sm w-full resize-none border border-cyber-border bg-void py-2.5 pl-8 pr-3 font-mono text-xs text-neon-amber placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-amber focus:outline-none focus:shadow-[0_0_8px_#ffb000,0_0_16px_#ffb00030]"
              />
            </div>
          </div>

          {/* Status, Priority & Category Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Status select */}
            <div>
              <label
                htmlFor="edit-task-status"
                className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
              >
                status
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan/60">
                  {'>'}
                </span>
                <select
                  id="edit-task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="cyber-chamfer-sm w-full appearance-none border border-cyber-border bg-void py-2.5 pl-8 pr-10 font-mono text-sm uppercase text-neon-cyan transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff,0_0_16px_#00d4ff30]"
                >
                  {availableStatuses.map((s) => (
                    <option key={s} value={s} className="bg-void-card text-fg">
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              </div>
            </div>

            {/* Priority select */}
            <div>
              <label
                htmlFor="edit-task-priority"
                className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
              >
                priority
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan/60">
                  {'>'}
                </span>
                <select
                  id="edit-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="cyber-chamfer-sm w-full appearance-none border border-cyber-border bg-void py-2.5 pl-8 pr-10 font-mono text-sm uppercase text-neon-cyan transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff,0_0_16px_#00d4ff30]"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-void-card text-fg">
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              </div>
            </div>
          </div>

          {/* Category select */}
          <div>
            <label
              htmlFor="edit-task-category"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
            >
              category_swimlane
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan/60">
                {'>'}
              </span>
              <select
                id="edit-task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="cyber-chamfer-sm w-full appearance-none border border-cyber-border bg-void py-2.5 pl-8 pr-10 font-mono text-sm uppercase text-neon-cyan transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff,0_0_16px_#00d4ff30]"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c} className="bg-void-card text-fg">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            </div>
          </div>

          {/* Progress Percentage Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted">
              <label htmlFor="edit-task-progress">progress_override (0-100)</label>
              <span className="tabular-nums text-neon-cyan">{progress}%</span>
            </div>
            <div className="relative flex items-center gap-3">
              <span className="pointer-events-none font-mono text-sm text-neon-cyan/60">
                {'>'}
              </span>
              <input
                id="edit-task-progress"
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-cyber-border accent-neon-cyan"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setProgress(Math.max(0, Math.min(100, val)))
                  } else if (e.target.value === '') {
                    setProgress(0)
                  }
                }}
                className="cyber-chamfer-sm w-16 border border-cyber-border bg-void py-1 px-2 text-center font-mono text-xs text-neon-cyan focus:border-neon-cyan focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="font-label text-xs uppercase tracking-wider text-neon-red">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 border-t border-cyber-border pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="cyber-chamfer-sm flex items-center gap-2 border-2 border-neon-cyan bg-neon-cyan/10 px-5 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan transition-all duration-200 hover:bg-neon-cyan hover:text-void hover:shadow-[0_0_10px_#00d4ff,0_0_20px_#00d4ff60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-card disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? 'saving...' : 'update_node'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cyber-chamfer-sm border border-cyber-border px-5 py-2.5 font-label text-xs uppercase tracking-[0.2em] text-fg-muted transition-all duration-200 hover:border-neon-red/50 hover:text-neon-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-card"
            >
              abort
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
