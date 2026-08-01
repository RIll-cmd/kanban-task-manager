import { useState, useRef, useEffect } from 'react'
import { X, Send, ChevronDown } from 'lucide-react'
import { createTask, type StatusItem } from '../api/client'
import type { CreateTaskPayload } from '../api/client'
import type { Task } from '../types'

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const DEFAULT_CATEGORIES: string[] = ['OpenCV & Software', 'Hardware Integration', 'General']
const DEFAULT_STATUSES: string[] = ['To Do', 'In Progress', 'Review', 'Done']

interface CreateTaskTerminalProps {
  open: boolean
  onClose: () => void
  onCreated: (task: Task) => void
  categories?: string[]
  statuses?: StatusItem[]
}

export default function CreateTaskTerminal({ open, onClose, onCreated, categories, statuses }: CreateTaskTerminalProps) {
  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [category, setCategory] = useState<string>(availableCategories[0] || 'General')

  const laneStatuses = statuses
    ? statuses.filter((s) => s.swimlane_name === category).map((s) => s.name)
    : []
  const availableStatuses = laneStatuses.length > 0 ? laneStatuses : DEFAULT_STATUSES

  const [taskStatus, setTaskStatus] = useState<string>(availableStatuses[0] || 'To Do')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleRef = useRef<HTMLInputElement>(null)

  // Ensure selected category & status are valid when props update
  useEffect(() => {
    if (open) {
      if (!availableCategories.includes(category)) {
        setCategory(availableCategories[0] || 'General')
      }
      if (!availableStatuses.includes(taskStatus)) {
        setTaskStatus(availableStatuses[0] || 'To Do')
      }
    }
  }, [open, availableCategories, availableStatuses, category, taskStatus])

  // Auto-focus title field when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to allow the DOM to render
      const timer = setTimeout(() => titleRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setNote('')
    setPriority('MEDIUM')
    setCategory(availableCategories[0] || 'General')
    setTaskStatus(availableStatuses[0] || 'To Do')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('[ERR] > title_field_required')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload: CreateTaskPayload = {
      title: trimmedTitle,
      description: description.trim() || null,
      note: note.trim() || null,
      priority,
      category,
      status: taskStatus,
    }

    try {
      const newTask = await createTask(payload)
      onCreated(newTask)
      resetForm()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`[ERR_SUBMIT] > ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    /* ── Backdrop ───────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Create new task"
    >
      {/* ── Terminal Window ─────────────────────────────── */}
      <div className="cyber-chamfer relative mx-4 w-full max-w-lg border border-cyber-border bg-void-card shadow-2xl">

        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-green" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-green" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-green" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-green" />

        {/* ── Title bar ──────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-cyber-border px-4 py-2.5">
          {/* Traffic light dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neon-red/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-neon-amber/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-neon-green/80" />
            </div>
            <span className="font-label text-xs uppercase tracking-[0.2em] text-fg-muted">
              new_task_terminal
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted transition-colors hover:text-neon-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green"
            aria-label="Close terminal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Form Body ──────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4">

          {/* Title field */}
          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
            >
              title *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-green/60">
                {'>'}
              </span>
              <input
                ref={titleRef}
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="enter_task_name..."
                className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-2.5 pl-8 pr-3 font-mono text-sm text-neon-green placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-green focus:outline-none focus:shadow-[0_0_8px_#00ff88,0_0_16px_#00ff8830]"
              />
            </div>
          </div>

          {/* Description field */}
          <div>
            <label
              htmlFor="task-description"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
            >
              description
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-3 font-mono text-sm text-neon-green/60">
                {'>'}
              </span>
              <textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional_description..."
                rows={3}
                className="cyber-chamfer-sm w-full resize-none border border-cyber-border bg-void py-2.5 pl-8 pr-3 font-mono text-sm text-neon-green placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-green focus:outline-none focus:shadow-[0_0_8px_#00ff88,0_0_16px_#00ff8830]"
              />
            </div>
          </div>

          {/* Note / Scratchpad field */}
          <div>
            <label
              htmlFor="task-note"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-neon-amber/80"
            >
              {'>'} SCRATCHPAD_NOTE (CODE_SNIPPETS / PARAMS)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-3 font-mono text-sm text-neon-amber/60">
                {'>'}
              </span>
              <textarea
                id="task-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="optional_code_snippets_or_heavy_parameters..."
                rows={2}
                className="cyber-chamfer-sm w-full resize-none border border-cyber-border bg-void py-2.5 pl-8 pr-3 font-mono text-xs text-neon-amber placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-amber focus:outline-none focus:shadow-[0_0_8px_#ffb000,0_0_16px_#ffb00030]"
              />
            </div>
          </div>

          {/* Status, Priority & Category Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Status select */}
            <div>
              <label
                htmlFor="task-status"
                className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
              >
                initial_status
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-green/60">
                  {'>'}
                </span>
                <select
                  id="task-status"
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="cyber-chamfer-sm w-full appearance-none border border-cyber-border bg-void py-2.5 pl-8 pr-8 font-mono text-xs uppercase text-neon-green transition-all duration-200 focus:border-neon-green focus:outline-none focus:shadow-[0_0_8px_#00ff88,0_0_16px_#00ff8830]"
                >
                  {availableStatuses.map((s) => (
                    <option key={s} value={s} className="bg-void-card text-fg">
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
              </div>
            </div>

            {/* Priority select */}
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
              >
                priority_level
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-green/60">
                  {'>'}
                </span>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="cyber-chamfer-sm w-full appearance-none border border-cyber-border bg-void py-2.5 pl-8 pr-8 font-mono text-xs uppercase text-neon-green transition-all duration-200 focus:border-neon-green focus:outline-none focus:shadow-[0_0_8px_#00ff88,0_0_16px_#00ff8830]"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-void-card text-fg">
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
              </div>
            </div>

            {/* Category select */}
            <div>
              <label
                htmlFor="task-category"
                className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted"
              >
                category_swimlane
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-green/60">
                  {'>'}
                </span>
                <select
                  id="task-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="cyber-chamfer-sm w-full appearance-none border border-cyber-border bg-void py-2.5 pl-8 pr-8 font-mono text-xs uppercase text-neon-green transition-all duration-200 focus:border-neon-green focus:outline-none focus:shadow-[0_0_8px_#00ff88,0_0_16px_#00ff8830]"
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c} className="bg-void-card text-fg">
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
              </div>
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
              className="cyber-chamfer-sm flex items-center gap-2 border-2 border-neon-green bg-neon-green/10 px-5 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.2em] text-neon-green transition-all duration-200 hover:bg-neon-green hover:text-void hover:shadow-[0_0_10px_#00ff88,0_0_20px_#00ff8860] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green focus-visible:ring-offset-2 focus-visible:ring-offset-void-card disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'transmitting...' : 'execute'}
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); onClose() }}
              className="cyber-chamfer-sm border border-cyber-border px-5 py-2.5 font-label text-xs uppercase tracking-[0.2em] text-fg-muted transition-all duration-200 hover:border-neon-red/50 hover:text-neon-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green focus-visible:ring-offset-2 focus-visible:ring-offset-void-card"
            >
              abort
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
