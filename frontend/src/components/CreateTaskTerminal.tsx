import { useState, useRef, useEffect } from 'react'
import { X, Send, ChevronDown, Tag, Calendar } from 'lucide-react'
import { createTask, getHashtags, createHashtag, type StatusItem } from '../api/client'
import type { CreateTaskPayload } from '../api/client'
import type { Task, Hashtag } from '../types'
import { parseApiError } from '../utils/errorParser'

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const DEFAULT_CATEGORIES: string[] = ['OpenCV & Software', 'Hardware Integration', 'General']
const DEFAULT_STATUSES: string[] = ['To Do', 'In Progress', 'Review', 'Done']

interface CreateTaskTerminalProps {
  open: boolean
  onClose: () => void
  onCreated: (task: Task) => void
  categories?: string[]
  statuses?: StatusItem[]
  defaultCategory?: string
  defaultStatus?: string
}

export default function CreateTaskTerminal({
  open,
  onClose,
  onCreated,
  categories,
  statuses,
  defaultCategory,
  defaultStatus,
}: CreateTaskTerminalProps) {
  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [category, setCategory] = useState<string>(
    defaultCategory || availableCategories[0] || 'General'
  )

  // Temporal Date States
  const [startDate, setStartDate] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Tag System States
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [globalHashtags, setGlobalHashtags] = useState<Hashtag[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const laneStatuses = statuses
    ? statuses.filter((s) => s.swimlane_name === category).map((s) => s.name)
    : []
  const availableStatuses = laneStatuses.length > 0 ? laneStatuses : DEFAULT_STATUSES

  const [taskStatus, setTaskStatus] = useState<string>(
    defaultStatus || availableStatuses[0] || 'To Do'
  )
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

  // Fetch global tags on mount or when modal opens
  useEffect(() => {
    if (open) {
      getHashtags()
        .then(setGlobalHashtags)
        .catch((err) => console.error('Failed to load global hashtags:', err))
    }
  }, [open])

  // Sync default category and status when modal opens or defaults change
  useEffect(() => {
    if (open) {
      if (defaultCategory && availableCategories.includes(defaultCategory)) {
        setCategory(defaultCategory)
      } else if (!availableCategories.includes(category)) {
        setCategory(availableCategories[0] || 'General')
      }

      if (defaultStatus) {
        setTaskStatus(defaultStatus)
      } else if (!availableStatuses.includes(taskStatus)) {
        setTaskStatus(availableStatuses[0] || 'To Do')
      }
    }
  }, [open, defaultCategory, defaultStatus, availableCategories, availableStatuses, category, taskStatus])

  // Auto-focus title field when modal opens
  useEffect(() => {
    if (open) {
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
    setCategory(defaultCategory || availableCategories[0] || 'General')
    setTaskStatus(defaultStatus || availableStatuses[0] || 'To Do')
    setProgress(0)
    setStartDate('')
    setScheduledDate('')
    setDueDate('')
    setTags([])
    setCurrentTag('')
    setIsDropdownOpen(false)
    setErrors([])
  }

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

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrors(['[ERR_FIELD: TITLE] > TITLE FIELD REQUIRED'])
      return
    }

    setSubmitting(true)
    setErrors([])

    const payload: CreateTaskPayload = {
      title: trimmedTitle,
      description: description.trim() || null,
      note: note.trim() || null,
      priority,
      category,
      status: taskStatus,
      previous_progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      progress_percentage: Math.max(0, Math.min(100, Number(progress) || 0)),
      start_date: startDate || null,
      scheduled_date: scheduledDate || null,
      due_date: dueDate || null,
      tags: tags,
    }

    try {
      const newTask = await createTask(payload)
      onCreated(newTask)
      resetForm()
      onClose()
    } catch (err: unknown) {
      const parsed = parseApiError(err)
      setErrors(parsed)
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
      <div className="cyber-chamfer relative mx-4 w-full max-w-xl border border-cyber-border bg-void-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-green" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-green" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-green" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-green" />

        {/* ── Title bar ──────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyber-border bg-void-card/95 px-4 py-2.5 backdrop-blur-md">
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
                  onChange={(e) => {
                    const nextStatus = e.target.value
                    setTaskStatus(nextStatus)
                    if (nextStatus.toUpperCase() === 'DONE') {
                      setProgress(100)
                    }
                  }}
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

          {/* Temporal Date Pickers Grid */}
          <div className="border-t border-cyber-border/60 pt-3">
            <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-1">
              <Calendar className="h-3 w-3" /> TEMPORAL_DATELINE_METRICS
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Start Date */}
              <div>
                <label
                  htmlFor="task-start-date"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
                >
                  START_DATE
                </label>
                <input
                  id="task-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1.5 px-2.5 font-mono text-xs text-neon-cyan transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff30]"
                />
              </div>

              {/* Scheduled Date */}
              <div>
                <label
                  htmlFor="task-scheduled-date"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
                >
                  SCHEDULED_DATE
                </label>
                <input
                  id="task-scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-1.5 px-2.5 font-mono text-xs text-neon-amber transition-all duration-200 focus:border-neon-amber focus:outline-none focus:shadow-[0_0_8px_#ffb00030]"
                />
              </div>

              {/* Due Date */}
              <div>
                <label
                  htmlFor="task-due-date"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg-muted"
                >
                  DUE_DATE
                </label>
                <input
                  id="task-due-date"
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
              htmlFor="task-tag-input"
              className="mb-1.5 block font-label text-[10px] uppercase tracking-[0.2em] text-neon-green flex items-center gap-1"
            >
              <Tag className="h-3 w-3" /> {'>'} INPUT_TAG (Hit Enter to add)
            </label>
            
            <div className="relative flex items-center gap-2">
              <div ref={tagDropdownRef} className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-green/60 z-10">
                  {'>'}
                </span>
                <input
                  id="task-tag-input"
                  type="text"
                  value={currentTag}
                  onChange={(e) => {
                    setCurrentTag(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="type_hashtag (e.g. #bug, #feature)..."
                  className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-2 pl-8 pr-10 font-mono text-xs text-neon-green placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-green focus:outline-none focus:shadow-[0_0_8px_#00ff8830]"
                />

                {/* Dropdown Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-neon-green/80 hover:text-neon-green hover:shadow-[0_0_8px_#00ff8850] px-1 py-0.5 transition-all focus:outline-none"
                  title="Toggle global hashtags menu"
                >
                  [▼]
                </button>

                {/* Custom Cyberpunk Autocomplete Dropdown */}
                {isDropdownOpen && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-none border border-neon-green bg-void-card shadow-[0_0_10px_rgba(0,255,136,0.2)] max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => {
                      const hex = suggestion.color || '#00ff88'
                      return (
                        <div
                          key={suggestion.id}
                          onClick={() => handleAddTag(suggestion.name)}
                          className="flex items-center justify-between px-3 py-2 border-b border-cyber-border/60 last:border-0 font-mono text-xs cursor-pointer transition-all hover:bg-neon-green/20 hover:text-neon-green text-fg"
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
                className="cyber-chamfer-sm shrink-0 border border-neon-green/60 bg-neon-green/10 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-neon-green hover:bg-neon-green hover:text-void transition-colors"
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

          {/* Initial Progress Percentage Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted">
              <label htmlFor="create-task-progress">initial_progress (0-100)</label>
              <span className="tabular-nums text-neon-cyan">{progress}%</span>
            </div>
            <div className="relative flex items-center gap-3">
              <span className="pointer-events-none font-mono text-sm text-neon-cyan/60">
                {'>'}
              </span>
              <input
                id="create-task-progress"
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
