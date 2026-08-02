import { useState, useRef, useEffect } from 'react'
import { X, Save, ChevronDown, Tag, Calendar, Trash2 } from 'lucide-react'
import type { Task, Hashtag } from '../types'
import { getHashtags, createHashtag, deleteTask, type StatusItem } from '../api/client'
import { parseApiError } from '../utils/errorParser'

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const DEFAULT_STATUSES: string[] = ['To Do', 'In Progress', 'Review', 'Done']
const DEFAULT_CATEGORIES: string[] = ['OpenCV & Software', 'Hardware Integration', 'General']

interface EditTaskTerminalProps {
  task: Task | null
  onClose: () => void
  onSave: (updatedTask: Task) => Promise<void> | void
  onDeleted?: (taskId: number) => void
  categories?: string[]
  statuses?: StatusItem[]
}

export default function EditTaskTerminal({ task, onClose, onSave, onDeleted, categories, statuses }: EditTaskTerminalProps) {
  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(task?.description || '')
  const [note, setNote] = useState(task?.note || '')
  const [category, setCategory] = useState<string>(task?.category || 'General')

  // Temporal Date States
  const [startDate, setStartDate] = useState(task?.start_date || '')
  const [scheduledDate, setScheduledDate] = useState(task?.scheduled_date || '')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [completedDate, setCompletedDate] = useState(task?.completed_date || '')

  // Tag System States
  const [tags, setTags] = useState<string[]>(task?.tags || [])
  const [currentTag, setCurrentTag] = useState('')
  const [globalHashtags, setGlobalHashtags] = useState<Hashtag[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const laneStatuses = statuses
    ? statuses.filter((s) => s.swimlane_name === category).map((s) => s.name)
    : []
  const availableStatuses = laneStatuses.length > 0 ? laneStatuses : DEFAULT_STATUSES

  const [status, setStatus] = useState<string>('To Do')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [progress, setProgress] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const titleRef = useRef<HTMLInputElement>(null)
  const tagDropdownRef = useRef<HTMLDivElement>(null)

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch global tags when modal opens
  useEffect(() => {
    if (task) {
      getHashtags()
        .then(setGlobalHashtags)
        .catch((err) => console.error('Failed to load global hashtags:', err))
    }
  }, [task])

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
      setStartDate(task.start_date || '')
      setScheduledDate(task.scheduled_date || '')
      setDueDate(task.due_date || '')
      setCompletedDate(task.completed_date || '')
      setTags(task.tags || [])
      setCurrentTag('')
      setIsDropdownOpen(false)
      setErrors([])

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

  // Tag addition handler
  const handleAddTag = async (overrideTag?: string) => {
    const rawTag = overrideTag !== undefined ? overrideTag : currentTag
    const trimmed = rawTag.trim()
    if (!trimmed) return

    const formattedTag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    if (!tags.includes(formattedTag)) {
      setTags((prev) => [...prev, formattedTag])
      try {
        await createHashtag(formattedTag)
      } catch {
        // Ignore registry duplicate or network error
      }
    }
    setCurrentTag('')
    setIsDropdownOpen(false)
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }

  // Filtered matching tags for custom dropdown (shows all if input empty)
  const filteredSuggestions = globalHashtags.filter((h) => {
    const isAlreadyAdded = tags.includes(h.name)
    if (isAlreadyAdded) return false
    if (!currentTag.trim()) return true
    return h.name.toLowerCase().includes(currentTag.trim().toLowerCase())
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrors(['[ERR_FIELD: TITLE] > TITLE FIELD REQUIRED'])
      return
    }

    const validProgress = Math.max(0, Math.min(100, Number(progress) || 0))

    setSubmitting(true)
    setErrors([])

    const finalProgress = validProgress
    let finalCompletedDate = completedDate || null

    // Date memory sync logic for Done status
    if (status.toUpperCase() === 'DONE') {
      if (!finalCompletedDate) {
        finalCompletedDate = new Date().toISOString().split('T')[0]
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
      previous_progress: finalProgress,
      start_date: startDate || null,
      scheduled_date: scheduledDate || null,
      due_date: dueDate || null,
      completed_date: finalCompletedDate,
      tags: tags,
    }

    try {
      await onSave(updatedTask)
      onClose()
    } catch (err: unknown) {
      const parsed = parseApiError(err)
      setErrors(parsed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    setSubmitting(true)
    setErrors([])

    try {
      await deleteTask(task.id)
      onClose()
      if (onDeleted) {
        onDeleted(task.id)
      }
    } catch (err: unknown) {
      const parsed = parseApiError(err)
      setErrors(parsed)
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
      <div className="cyber-chamfer relative mx-4 w-full max-w-xl border border-cyber-border bg-void-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-cyan" />

        {/* ── Title bar ──────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyber-border bg-void-card/95 px-4 py-2.5 backdrop-blur-md">
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
                  onChange={(e) => {
                    const nextStatus = e.target.value
                    setStatus(nextStatus)
                    if (nextStatus.toUpperCase() === 'DONE') {
                      setProgress(100)
                    }
                  }}
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

          {/* Temporal Date Pickers Grid */}
          <div className="border-t border-cyber-border/60 pt-3">
            <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-1">
              <Calendar className="h-3 w-3" /> TEMPORAL_DATELINE_METRICS
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Start Date */}
              <div>
                <label
                  htmlFor="edit-task-start-date"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
                >
                  START_DATE
                </label>
                <input
                  id="edit-task-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1.5 px-2.5 font-mono text-xs text-neon-cyan transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff30]"
                />
              </div>

              {/* Scheduled Date */}
              <div>
                <label
                  htmlFor="edit-task-scheduled-date"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
                >
                  SCHEDULED_DATE
                </label>
                <input
                  id="edit-task-scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1.5 px-2.5 font-mono text-xs text-neon-amber transition-all duration-200 focus:border-neon-amber focus:outline-none focus:shadow-[0_0_8px_#ffb00030]"
                />
              </div>

              {/* Due Date */}
              <div>
                <label
                  htmlFor="edit-task-due-date"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
                >
                  DUE_DATE
                </label>
                <input
                  id="edit-task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1.5 px-2.5 font-mono text-xs text-neon-red transition-all duration-200 focus:border-neon-red focus:outline-none focus:shadow-[0_0_8px_#ff336630]"
                />
              </div>
            </div>
          </div>

          {/* Tag Input System */}
          <div className="border-t border-cyber-border/60 pt-3">
            <label
              htmlFor="edit-task-tag-input"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-1"
            >
              <Tag className="h-3 w-3" /> {'>'} INPUT_TAG (Hit Enter to add)
            </label>

            <div className="relative flex items-center gap-2">
              <div ref={tagDropdownRef} className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan/60 z-10">
                  {'>'}
                </span>
                <input
                  id="edit-task-tag-input"
                  type="text"
                  value={currentTag}
                  onChange={(e) => {
                    setCurrentTag(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="type_hashtag (e.g. #bug, #feature)..."
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-2 pl-8 pr-10 font-mono text-xs text-neon-cyan placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff30]"
                />

                {/* Dropdown Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-neon-cyan/80 hover:text-neon-cyan hover:shadow-[0_0_8px_#00d4ff50] px-1 py-0.5 transition-all focus:outline-none"
                  title="Toggle global hashtags menu"
                >
                  [▼]
                </button>

                {/* Custom Cyberpunk Autocomplete Dropdown */}
                {isDropdownOpen && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-none border border-neon-cyan bg-void-card shadow-[0_0_10px_rgba(0,212,255,0.2)] max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => {
                      const hex = suggestion.color || '#00d4ff'
                      return (
                        <div
                          key={suggestion.id}
                          onClick={() => handleAddTag(suggestion.name)}
                          className="flex items-center justify-between px-3 py-2 border-b border-cyber-border/60 last:border-0 font-mono text-xs cursor-pointer transition-all hover:bg-neon-cyan/20 hover:text-neon-cyan text-fg"
                        >
                          <span className="font-bold" style={{ color: hex }}>
                            {suggestion.name}
                          </span>
                          <span className="text-[10px] text-fg-muted uppercase tracking-wider">
                            [SELECT]
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAddTag()}
                className="cyber-chamfer-sm shrink-0 border border-neon-cyan/60 bg-neon-cyan/10 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-neon-cyan hover:bg-neon-cyan hover:text-void transition-colors"
              >
                [ADD]
              </button>
            </div>

            {/* Removable Tag Pills */}
            {tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isBug = tag.toLowerCase() === '#bug' || tag.toLowerCase() === 'bug'
                  const style = isBug
                    ? 'border-neon-red/60 text-neon-red bg-neon-red/10'
                    : 'border-neon-cyan/60 text-neon-cyan bg-neon-cyan/10'
                  return (
                    <span
                      key={tag}
                      className={`cyber-chamfer-sm inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${style}`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:opacity-75 focus:outline-none"
                        title="Remove tag"
                      >
                        [x]
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
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

          {/* Parsed Cyberpunk Terminal Error Alerts */}
          {errors.length > 0 && (
            <div className="space-y-1 rounded-none border border-neon-red/60 bg-neon-red/10 p-2.5 font-mono text-xs text-neon-red shadow-[0_0_8px_#ff336630]">
              {errors.map((errStr, idx) => (
                <div key={idx} className="flex items-center gap-1.5 font-bold tracking-wide">
                  <span>{errStr}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-cyber-border pt-4">
            <div className="flex items-center gap-3">
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
                className="cyber-chamfer-sm border border-cyber-border px-5 py-2.5 font-label text-xs uppercase tracking-[0.2em] text-fg-muted transition-all duration-200 hover:border-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-card"
              >
                abort
              </button>
            </div>

            {/* Critical Delete / Purge Node Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteTask}
              className="cyber-chamfer-sm flex items-center gap-1.5 border border-neon-red/60 bg-neon-red/10 px-4 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.15em] text-neon-red shadow-[0_0_8px_rgba(239,68,68,0.2)] transition-all duration-200 hover:bg-neon-red hover:text-void hover:shadow-[0_0_14px_#ff3366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-red focus-visible:ring-offset-2 focus-visible:ring-offset-void-card disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Permanently purge task node from board"
            >
              <Trash2 className="h-3.5 w-3.5" />
              [❌ PURGE_NODE]
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
