import { useEffect, useState, useCallback, useRef } from 'react'
import {
  KanbanSquare,
  Loader2,
  Terminal,
  Wifi,
  Plus,
  Edit3,
  Trash2,
  GripVertical,
  SlidersHorizontal,
  Eye,
  ListFilter,
  X,
  Tag,
  Search,
  Copy,
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  getTasks,
  updateTask,
  getSwimlanes,
  createSwimlane,
  updateSwimlane,
  reorderSwimlanes,
  deleteSwimlane,
  duplicateSwimlane,
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  getActivityLogs,
  getHashtags,
  type Swimlane,
  type StatusItem,
} from './api/client'
import TaskCard, { type VisibleProps } from './components/TaskCard'
import CreateTaskTerminal from './components/CreateTaskTerminal'
import EditTaskTerminal from './components/EditTaskTerminal'
import SwimlaneCreationTerminal from './components/SwimlaneCreationTerminal'
import ConfirmTerminal from './components/ConfirmTerminal'
import PromptTerminal from './components/PromptTerminal'
import ManageTagsTerminal from './components/ManageTagsTerminal'
import type { Task, ActivityLog, Hashtag } from './types'

const COLOR_PALETTE = [
  { color: 'bg-neon-green', glowClass: 'neon-glow-green' },
  { color: 'bg-neon-cyan', glowClass: 'neon-glow-cyan' },
  { color: 'bg-neon-magenta', glowClass: 'neon-glow-magenta' },
  { color: 'bg-neon-amber', glowClass: 'neon-glow-amber' },
]

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([])
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSwimlaneModalOpen, setIsSwimlaneModalOpen] = useState(false)
  const [sortMode, setSortMode] = useState<'custom' | 'volume' | 'az'>('custom')
  const [isMinimalHUD, setIsMinimalHUD] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [globalHashtags, setGlobalHashtags] = useState<Hashtag[]>([])
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false)
  const [includeUnstarted, setIncludeUnstarted] = useState(false)

  // Phase 3 States: Search, Filter Engine & Property Visibility
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [visibleProps, setVisibleProps] = useState<VisibleProps>({
    showId: true,
    showTags: true,
    showDates: true,
    showProgress: true,
    showCrossLaneStats: true,
    showArchived: false,
  })
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const configRef = useRef<HTMLDivElement>(null)

  // Localized Task Creation Defaults State
  const [createTaskDefaults, setCreateTaskDefaults] = useState<{
    category?: string
    status?: string
  }>({})

  const handleOpenCreateTerminalGlobal = () => {
    setCreateTaskDefaults({})
    setShowTerminal(true)
  }

  const handleOpenCreateTerminalForColumn = (category: string, status: string) => {
    setCreateTaskDefaults({ category, status })
    setShowTerminal(true)
  }

  // Click outside to close Config Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(e.target as Node)) {
        setIsConfigOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchActivityLogs = async () => {
    try {
      const fetched = await getActivityLogs()
      setLogs(fetched)
    } catch (err: unknown) {
      console.error('Failed to fetch activity logs', err)
    }
  }

  // Universal Modals State
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean
    title: string
    message?: string
    inputLabel?: string
    placeholder?: string
    initialValue?: string
    isNumeric?: boolean
    secondaryInputLabel?: string
    secondaryPlaceholder?: string
    secondaryInitialValue?: string
    secondaryIsNumeric?: boolean
    secondaryAllowNoOverride?: boolean
    colorInputLabel?: string
    colorPlaceholder?: string
    colorInitialValue?: string
    submitText?: string
    onSubmit: (val: string, secVal?: string, colorVal?: string) => void
  }>({
    isOpen: false,
    title: '',
    onSubmit: () => {},
  })

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const openPrompt = (config: Omit<typeof promptConfig, 'isOpen'>) => {
    setPromptConfig({ ...config, isOpen: true })
  }

  const closePrompt = () => {
    setPromptConfig((prev) => ({ ...prev, isOpen: false }))
  }

  const openConfirm = (config: Omit<typeof confirmConfig, 'isOpen'>) => {
    setConfirmConfig({ ...config, isOpen: true })
  }

  const closeConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
  }

  // Phase 3 Filtering Engine: Search Query, Tag Filters & Archive View
  const filteredTasks = tasks.filter((task) => {
    // Archive View Filter Rule:
    if (visibleProps.showArchived) {
      if (!task.is_archived) return false
    } else {
      if (task.is_archived) return false
    }

    // Search Query filter (matches title or description case-insensitively)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const titleMatches = task.title.toLowerCase().includes(q)
      const descMatches = task.description ? task.description.toLowerCase().includes(q) : false
      if (!titleMatches && !descMatches) return false
    }

    // Tag filter: task must contain ALL activeFilters
    if (activeFilters.length > 0) {
      if (!task.tags || task.tags.length === 0) return false
      const normalizedTaskTags = task.tags.map((t) => (t.startsWith('#') ? t : `#${t}`).toLowerCase())
      const hasAll = activeFilters.every((filterTag) =>
        normalizedTaskTags.includes(filterTag.toLowerCase())
      )
      if (!hasAll) return false
    }

    return true
  })

  const swimlaneNames = Array.from(
    new Set([
      ...swimlanes.map((s) => s.name),
      ...tasks.map((t) => t.category || 'General'),
    ])
  )

  const sortedSwimlaneNames = [...swimlaneNames].sort((a, b) => {
    if (sortMode === 'az') {
      return a.localeCompare(b)
    }
    if (sortMode === 'volume') {
      const countA = filteredTasks.filter((t) => (t.category || 'General') === a).length
      const countB = filteredTasks.filter((t) => (t.category || 'General') === b).length
      return countB - countA
    }
    // 'custom' order
    const objA = swimlanes.find((s) => s.name === a)
    const objB = swimlanes.find((s) => s.name === b)
    return (objA?.order ?? 0) - (objB?.order ?? 0)
  })

  const handleTaskCreated = useCallback((newTask: Task) => {
    setTasks((prev) => [...prev.filter((t) => t.id !== newTask.id), newTask])
    getTasks()
      .then((updatedTasks) => setTasks(updatedTasks))
      .catch((err) => console.error('Failed to re-fetch board tasks:', err))
  }, [])

  useEffect(() => {
    Promise.all([getTasks(), getSwimlanes(), getStatuses(), getHashtags()])
      .then(([fetchedTasks, fetchedSwimlanes, fetchedStatuses, fetchedHashtags]) => {
        setTasks(fetchedTasks)
        setSwimlanes(fetchedSwimlanes)
        setStatuses(fetchedStatuses)
        setGlobalHashtags(fetchedHashtags)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSwimlaneSubmit = async (name: string, useDefaults: boolean) => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    try {
      const newLane = await createSwimlane(trimmedName, useDefaults)
      setSwimlanes((prev) => [...prev.filter((s) => s.name !== newLane.name), newLane])

      // Re-fetch statuses so newly generated columns render instantly
      const updatedStatuses = await getStatuses()
      setStatuses(updatedStatuses)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create swimlane'
      setError(`[ERR_CREATE_SWIMLANE] > ${message}`)
    }
  }

  const handleEditSwimlane = (oldName: string) => {
    const laneObj = swimlanes.find((s) => s.name === oldName)
    openPrompt({
      title: 'EDIT_SWIMLANE',
      message: `Configure swimlane '${oldName}'. Linked tasks and columns will be updated.`,
      inputLabel: 'SWIMLANE_NAME',
      initialValue: oldName,
      colorInputLabel: 'COLOR_HEX (E.G. #00FFFF)',
      colorPlaceholder: '#00ffff',
      colorInitialValue: laneObj?.color || '#00ffff',
      submitText: '[UPDATE_SWIMLANE]',
      onSubmit: async (newName, _sec, colorHex) => {
        closePrompt()
        if (!newName) return
        const trimmedNewName = newName.trim()
        const newColor = colorHex?.trim() || laneObj?.color || '#00ffff'
        const oldColor = laneObj?.color || '#00ffff'

        setSwimlanes((prev) =>
          prev.map((s) => (s.name === oldName ? { ...s, name: trimmedNewName, color: newColor } : s))
        )

        if (trimmedNewName !== oldName) {
          setTasks((prev) =>
            prev.map((t) =>
              (t.category || 'General') === oldName ? { ...t, category: trimmedNewName } : t
            )
          )
          setStatuses((prev) =>
            prev.map((s) =>
              s.swimlane_name === oldName ? { ...s, swimlane_name: trimmedNewName } : s
            )
          )
        }

        try {
          await updateSwimlane(oldName, trimmedNewName, newColor)
        } catch (err: unknown) {
          setSwimlanes((prev) =>
            prev.map((s) => (s.name === trimmedNewName ? { ...s, name: oldName, color: oldColor } : s))
          )
          if (trimmedNewName !== oldName) {
            setTasks((prev) =>
              prev.map((t) =>
                (t.category || 'General') === trimmedNewName ? { ...t, category: oldName } : t
              )
            )
            setStatuses((prev) =>
              prev.map((s) =>
                s.swimlane_name === trimmedNewName ? { ...s, swimlane_name: oldName } : s
              )
            )
          }
          const message = err instanceof Error ? err.message : 'Failed to update swimlane'
          setError(`[ERR_RENAME_SWIMLANE] > ${message}`)
        }
      },
    })
  }

  const handleDeleteSwimlane = (laneName: string) => {
    if (swimlaneNames.length <= 1) {
      setError('[ERR_DELETE_SWIMLANE] > Cannot delete the last remaining swimlane')
      return
    }

    openConfirm({
      title: 'CONFIRM_DELETE_SWIMLANE',
      message: `Are you sure you want to delete swimlane '${laneName}'?\nAll associated tasks will be reassigned to the default lane.`,
      confirmText: '[DELETE_SWIMLANE]',
      onConfirm: async () => {
        closeConfirm()
        const fallbackLane = swimlaneNames.find((n) => n !== laneName) || 'General'

        setSwimlanes((prev) => prev.filter((s) => s.name !== laneName))
        setTasks((prev) =>
          prev.map((t) =>
            (t.category || 'General') === laneName ? { ...t, category: fallbackLane } : t
          )
        )
        setStatuses((prev) => prev.filter((s) => s.swimlane_name !== laneName))

        try {
          const res = await deleteSwimlane(laneName)
          if (res.fallback) {
            setTasks((prev) =>
              prev.map((t) =>
                (t.category || 'General') === laneName ? { ...t, category: res.fallback } : t
              )
            )
          }
        } catch (err: unknown) {
          Promise.all([getTasks(), getSwimlanes(), getStatuses()])
            .then(([t, sw, st]) => {
              setTasks(t)
              setSwimlanes(sw)
              setStatuses(st)
            })
            .catch(() => {})
          const message = err instanceof Error ? err.message : 'Failed to delete swimlane'
          setError(`[ERR_DELETE_SWIMLANE] > ${message}`)
        }
      },
    })
  }

  const handleDuplicateSwimlane = async (laneName: string) => {
    try {
      await duplicateSwimlane(laneName)
      const [t, sw, st] = await Promise.all([getTasks(), getSwimlanes(), getStatuses()])
      setTasks(t)
      setSwimlanes(sw)
      setStatuses(st)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate swimlane'
      setError(`[ERR_DUPLICATE_SWIMLANE] > ${message}`)
    }
  }

  const handleCreateStatus = (swimlaneName: string) => {
    openPrompt({
      title: 'ADD_STATUS_COLUMN',
      message: `Add custom status column to swimlane '${swimlaneName}'.`,
      inputLabel: 'STATUS_NAME',
      placeholder: 'e.g. In Testing / In Review',
      secondaryInputLabel: 'DEFAULT_PROGRESS_PERCENTAGE',
      secondaryPlaceholder: '0-100',
      secondaryInitialValue: '0',
      secondaryIsNumeric: true,
      secondaryAllowNoOverride: true,
      colorInputLabel: 'COLOR_HEX (E.G. #00FFFF)',
      colorPlaceholder: '#00ffff',
      colorInitialValue: '#00ffff',
      submitText: '[CREATE_STATUS]',
      onSubmit: async (name, progStr, colorHex) => {
        closePrompt()
        if (!name.trim()) return

        let defaultProgress: number | null = null
        if (
          progStr !== undefined &&
          progStr.trim() !== '' &&
          progStr.trim().toLowerCase() !== 'none' &&
          progStr.trim().toLowerCase() !== 'null'
        ) {
          const parsed = parseInt(progStr.trim(), 10)
          if (!isNaN(parsed)) {
            defaultProgress = Math.max(0, Math.min(100, parsed))
          }
        }

        const trimmedName = name.trim()
        const colorVal = colorHex?.trim() || '#00ffff'
        try {
          const newStatusObj = await createStatus(trimmedName, swimlaneName, defaultProgress, colorVal)
          setStatuses((prev) => [...prev, newStatusObj])
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create status'
          setError(`[ERR_CREATE_STATUS] > ${message}`)
        }
      },
    })
  }

  const handleEditStatus = (statusObj: StatusItem) => {
    const oldName = statusObj.name
    const swimlaneName = statusObj.swimlane_name
    const initialProg =
      statusObj.default_progress !== null && statusObj.default_progress !== undefined
        ? String(statusObj.default_progress)
        : 'none'

    openPrompt({
      title: 'EDIT_STATUS_COLUMN',
      message: `Configure status column in '${swimlaneName}'.`,
      inputLabel: 'STATUS_NAME',
      initialValue: oldName,
      secondaryInputLabel: 'DEFAULT_PROGRESS_PERCENTAGE',
      secondaryPlaceholder: '0-100',
      secondaryInitialValue: initialProg,
      secondaryIsNumeric: true,
      secondaryAllowNoOverride: true,
      colorInputLabel: 'ACCENT_COLOR_HEX (E.G. #00FFFF)',
      colorPlaceholder: '#00ffff',
      colorInitialValue: statusObj.color || '#00ffff',
      submitText: '[UPDATE_STATUS]',
      onSubmit: async (newName, progStr, colorHex) => {
        closePrompt()

        let newDefaultProgress: number | null = null
        if (
          progStr !== undefined &&
          progStr.trim() !== '' &&
          progStr.trim().toLowerCase() !== 'none' &&
          progStr.trim().toLowerCase() !== 'null'
        ) {
          const parsed = parseInt(progStr.trim(), 10)
          if (!isNaN(parsed)) {
            newDefaultProgress = Math.max(0, Math.min(100, parsed))
          }
        }

        const trimmedNewName = newName.trim() || oldName
        const newColor = colorHex?.trim() || statusObj.color || '#00ffff'

        // Optimistically update statuses state & task status
        setStatuses((prev) =>
          prev.map((s) =>
            s.id === statusObj.id || (s.name === oldName && s.swimlane_name === swimlaneName)
              ? { ...s, name: trimmedNewName, default_progress: newDefaultProgress, color: newColor }
              : s
          )
        )

        if (trimmedNewName !== oldName) {
          setTasks((prev) =>
            prev.map((t) =>
              t.status === oldName && (t.category || 'General') === swimlaneName
                ? { ...t, status: trimmedNewName }
                : t
            )
          )
        }

        try {
          await updateStatus(oldName, trimmedNewName, swimlaneName, newDefaultProgress, newColor)
        } catch (err: unknown) {
          // Revert state
          setStatuses((prev) =>
            prev.map((s) =>
              s.id === statusObj.id || (s.name === trimmedNewName && s.swimlane_name === swimlaneName)
                ? { ...s, name: oldName, default_progress: statusObj.default_progress, color: statusObj.color }
                : s
            )
          )
          if (trimmedNewName !== oldName) {
            setTasks((prev) =>
              prev.map((t) =>
                t.status === trimmedNewName && (t.category || 'General') === swimlaneName
                  ? { ...t, status: oldName }
                  : t
              )
            )
          }
          const message = err instanceof Error ? err.message : 'Failed to edit status'
          setError(`[ERR_EDIT_STATUS] > ${message}`)
        }
      },
    })
  }

  const handleDeleteStatus = (statusObj: StatusItem) => {
    const nameToDelete = statusObj.name
    const swimlaneName = statusObj.swimlane_name

    const laneStatuses = statuses.filter((s) => s.swimlane_name === swimlaneName)
    if (laneStatuses.length <= 1) {
      setError(`[ERR_DELETE_STATUS] > Cannot delete the last remaining status in [${swimlaneName}]`)
      return
    }

    openConfirm({
      title: 'CONFIRM_DELETE_STATUS',
      message: `Delete status column '${nameToDelete}' in '${swimlaneName}'?\nExisting tasks will be reassigned to the fallback status column.`,
      confirmText: '[DELETE_STATUS]',
      onConfirm: async () => {
        closeConfirm()
        const fallbackStatus = laneStatuses.find((s) => s.name !== nameToDelete)?.name || 'To Do'

        // Optimistic update
        setStatuses((prev) => prev.filter((s) => s.id !== statusObj.id))
        setTasks((prev) =>
          prev.map((t) =>
            t.status === nameToDelete && (t.category || 'General') === swimlaneName
              ? { ...t, status: fallbackStatus }
              : t
          )
        )

        try {
          const res = await deleteStatus(nameToDelete, swimlaneName)
          if (res.fallback) {
            setTasks((prev) =>
              prev.map((t) =>
                t.status === nameToDelete && (t.category || 'General') === swimlaneName
                  ? { ...t, status: res.fallback }
                  : t
              )
            )
          }
        } catch (err: unknown) {
          Promise.all([getTasks(), getStatuses()])
            .then(([t, s]) => {
              setTasks(t)
              setStatuses(s)
            })
            .catch(() => {})
          const message = err instanceof Error ? err.message : 'Failed to delete status'
          setError(`[ERR_DELETE_STATUS] > ${message}`)
        }
      },
    })
  }

  const handleUpdateTask = async (updatedTask: Task) => {
    const originalTask = tasks.find((t) => t.id === updatedTask.id)
    if (!originalTask) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
    setEditingTask(null)

    try {
      const { id, subtasks: _subtasks, logs: _logs, created_at: _created_at, ...updates } = updatedTask
      const updated = await updateTask(id, updates)
      // Merge returned backend task
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      )
    } catch (err: unknown) {
      // Revert state on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? originalTask : t))
      )
      const message = err instanceof Error ? err.message : 'Failed to update task'
      setError(`[ERR_TASK_UPDATE] > ${message}`)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result

    if (!destination) return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Handle Swimlane vertical drag and drop
    if (type === 'SWIMLANE') {
      if (sortMode !== 'custom') return

      const reorderedNames = Array.from(sortedSwimlaneNames)
      const [movedName] = reorderedNames.splice(source.index, 1)
      reorderedNames.splice(destination.index, 0, movedName)

      const itemsToSave = reorderedNames.map((name, idx) => ({ name, order: idx }))

      // Optimistically update swimlanes order state
      setSwimlanes((prev) => {
        const next = [...prev]
        itemsToSave.forEach((item) => {
          const existing = next.find((s) => s.name === item.name)
          if (existing) {
            existing.order = item.order
          } else {
            next.push({ id: Date.now(), name: item.name, order: item.order })
          }
        })
        return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      })

      try {
        await reorderSwimlanes(itemsToSave)
      } catch (err: unknown) {
        getSwimlanes()
          .then((sw) => setSwimlanes(sw))
          .catch(() => {})
        const message = err instanceof Error ? err.message : 'Failed to reorder swimlanes'
        setError(`[ERR_SWIMLANE_REORDER] > ${message}`)
      }
      return
    }

    // Handle Task drag and drop across columns/swimlanes
    const taskId = Number(draggableId)
    const targetTask = tasks.find((t) => t.id === taskId)
    if (!targetTask) return

    // Parse source & destination composite droppableIds: `${category}|${status}`
    const [destCategory, destStatus] = destination.droppableId.split('|')

    const oldCategory = targetTask.category || 'General'
    const oldStatus = targetTask.status
    const oldProgress = targetTask.progress_percentage
    const oldPrevProgress = targetTask.previous_progress

    const updates: Partial<Task> = {
      category: destCategory || oldCategory,
      status: destStatus || oldStatus,
    }

    // Progress memory logic & case-insensitive status override:
    const isDestDone = destStatus && destStatus.toUpperCase() === 'DONE'

    if (isDestDone) {
      updates.previous_progress = Math.round(targetTask.progress_percentage)
      updates.progress_percentage = 100
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    )

    try {
      await updateTask(taskId, updates)
    } catch (err: unknown) {
      // Revert state on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                category: oldCategory,
                status: oldStatus,
                progress_percentage: oldProgress,
                previous_progress: oldPrevProgress,
              }
            : t
        )
      )
      const message = err instanceof Error ? err.message : 'Failed to update task position'
      setError(`[ERR_POSITION_UPDATE] > ${message}`)
    }
  }

  // Real-time aggregate global completion percentage across active or raw tasks
  const tasksToCalculate = includeUnstarted
    ? tasks
    : tasks.filter((t) => (t.progress_percentage || 0) > 0)

  const totalCount = tasksToCalculate.length
  const globalCompletionPercentage =
    totalCount > 0
      ? Math.round(
          tasksToCalculate.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) / totalCount
        )
      : 0

  return (
    <div className="scanlines min-h-screen bg-void circuit-grid text-fg">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="relative border-b border-cyber-border bg-void-card/80 px-6 py-4 backdrop-blur-sm">
        {/* HUD corner accents on header */}
        <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-neon-green" />
        <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-neon-green" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-neon-green" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-neon-green" />

        {/* Title row */}
        <div className="flex items-center gap-3">
          <KanbanSquare className="h-8 w-8 text-neon-green drop-shadow-[0_0_8px_#00ff88] md:h-9 md:w-9 shrink-0" />
          <div className="relative inline-block">
            <h1
              data-text="> Project_Board"
              className="true-cyber-glitch font-heading text-2xl font-black uppercase tracking-[0.25em] text-neon-green md:text-3xl"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0 100%)',
              }}
            >
              {'>'} Project_Board
            </h1>
            {/* Horizontal scanline split accent overlay cut */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-void/90 shadow-[0_0_4px_#0a0a0f]" />
          </div>
        </div>

        {/* Status indicator row */}
        <div className="mt-1.5 flex items-center gap-4 pl-11 md:pl-12">
          <div className="hidden items-center gap-2 sm:flex">
            <Wifi className="h-3.5 w-3.5 text-neon-green" />
            <span className="font-label text-xs uppercase tracking-[0.2em] text-neon-green">
              sys_online
            </span>
          </div>
          <div className="font-label text-xs uppercase tracking-[0.2em] text-fg-muted">
            v1.0.0
          </div>
        </div>
      </header>

      {/* ── System status bar & Controls ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-border bg-void-card/40 px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Terminal className="h-4 w-4 text-neon-green" />
          <span className="font-label text-sm uppercase tracking-[0.15em] text-fg-muted md:text-base">
            task_manager {'>'} swimlanes_view {'>'} {tasks.length} nodes_loaded
          </span>
          <span className="font-mono text-sm text-fg-muted/60">|</span>
          <button
            type="button"
            onClick={() => setIncludeUnstarted(!includeUnstarted)}
            className="font-mono text-xs uppercase tracking-[0.15em] text-fg-muted md:text-sm flex items-center gap-1 cursor-pointer select-none hover:text-fg transition-colors focus:outline-none"
            title="Click to toggle between RAW (includes 0% tasks) and ACTIVE (skips 0% tasks) telemetry modes"
          >
            GLOBAL_COMPLETION:{' '}
            <span className="font-bold text-neon-green drop-shadow-[0_0_6px_#00ff8880]">
              {globalCompletionPercentage}%
            </span>{' '}
            <span className="text-[10px] font-bold text-neon-cyan border border-neon-cyan/40 bg-neon-cyan/10 px-1 py-0.2 tracking-wider">
              [{includeUnstarted ? 'RAW' : 'ACTIVE'}]
            </span>
          </button>
          <span className="cursor-blink font-label text-sm text-neon-green ml-0.5" />
        </div>

        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Cyberpunk Search Bar */}
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neon-cyan/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH_SYS..."
              className="cyber-chamfer-sm w-36 sm:w-44 border border-cyber-border bg-void py-1 pl-8 pr-7 font-mono text-xs text-neon-cyan placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_8px_#00d4ff30]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 font-mono text-xs text-fg-muted hover:text-neon-red focus:outline-none"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 border border-cyber-border/80 bg-void-muted/60 px-2.5 py-1 cyber-chamfer-sm">
            <SlidersHorizontal className="h-3.5 w-3.5 text-neon-cyan" />
            <span className="font-label text-xs uppercase tracking-wider text-fg-muted hidden sm:inline">
              Sort Lanes:
            </span>
            <div className="flex items-center gap-1 font-label text-xs uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setSortMode('custom')}
                className={`px-2 py-0.5 transition-colors ${
                  sortMode === 'custom'
                    ? 'bg-neon-cyan/20 text-neon-cyan font-bold border border-neon-cyan/50'
                    : 'text-fg-muted hover:text-fg'
                }`}
                title="Order driven by Drag-and-Drop"
              >
                Custom
              </button>
              <button
                type="button"
                onClick={() => setSortMode('volume')}
                className={`px-2 py-0.5 transition-colors ${
                  sortMode === 'volume'
                    ? 'bg-neon-cyan/20 text-neon-cyan font-bold border border-neon-cyan/50'
                    : 'text-fg-muted hover:text-fg'
                }`}
                title="Sort by Task Volume (High to Low)"
              >
                Volume
              </button>
              <button
                type="button"
                onClick={() => setSortMode('az')}
                className={`px-2 py-0.5 transition-colors ${
                  sortMode === 'az'
                    ? 'bg-neon-cyan/20 text-neon-cyan font-bold border border-neon-cyan/50'
                    : 'text-fg-muted hover:text-fg'
                }`}
                title="Sort Alphabetically (A-Z)"
              >
                A-Z
              </button>
            </div>
          </div>

          {/* Display & Tag Config Menu */}
          <div ref={configRef} className="relative">
            <button
              type="button"
              onClick={() => setIsConfigOpen((prev) => !prev)}
              className={`cyber-chamfer-sm flex items-center gap-1.5 border px-2.5 py-1 font-label text-xs uppercase tracking-wider transition-all ${
                isConfigOpen || activeFilters.length > 0
                  ? 'border-neon-amber/80 bg-neon-amber/20 text-neon-amber shadow-[0_0_10px_#ffb00040]'
                  : 'border-cyber-border bg-void-muted/60 text-fg-muted hover:border-fg-muted hover:text-fg'
              }`}
              title="Display Configuration & Tag Filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              [Y] DISPLAY_CONFIG {activeFilters.length > 0 ? `(${activeFilters.length})` : ''}
            </button>

            {/* Custom Cyberpunk Config Dropdown */}
            {isConfigOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-none border border-neon-amber bg-void-card shadow-[0_0_12px_rgba(255,176,0,0.2)] p-3 space-y-3 font-mono text-xs">
                {/* Property Visibility Checklist */}
                <div>
                  <span className="block font-label text-[10px] uppercase tracking-[0.2em] text-neon-amber mb-1.5">
                    {'>'} HUD_PROPERTY_VISIBILITY
                  </span>
                  <div className="space-y-1">
                    {[
                      { key: 'showId', label: 'Show Task ID' },
                      { key: 'showTags', label: 'Show Tags' },
                      { key: 'showDates', label: 'Show Temporal Dates' },
                      { key: 'showProgress', label: 'Show Progress Bar' },
                      { key: 'showCrossLaneStats', label: 'Show Cross-Lane Stats' },
                      { key: 'showArchived', label: 'View Archive Mode' },
                    ].map((item) => {
                      const isChecked = visibleProps[item.key as keyof VisibleProps]
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setVisibleProps((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key as keyof VisibleProps],
                            }))
                          }
                          className="flex items-center gap-2 w-full text-left py-0.5 hover:text-neon-amber transition-colors cursor-pointer"
                        >
                          <span className={isChecked ? 'text-neon-amber font-bold' : 'text-fg-muted'}>
                            {isChecked ? '[x]' : '[ ]'}
                          </span>
                          <span className={isChecked ? 'text-fg' : 'text-fg-muted/70'}>
                            {item.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Global Tag Filters */}
                <div className="border-t border-cyber-border pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-neon-amber">
                      {'>'} FILTER_BY_GLOBAL_TAGS
                    </span>
                    {activeFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveFilters([])}
                        className="text-[9px] text-neon-red hover:underline"
                      >
                        [CLEAR_FILTERS]
                      </button>
                    )}
                  </div>
                  {globalHashtags.length === 0 ? (
                    <p className="text-[10px] text-fg-muted/60 py-1">No global tags registered</p>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 border border-cyber-border/40 bg-void/50">
                      {globalHashtags.map((tag) => {
                        const isSelected = activeFilters.includes(tag.name)
                        const hex = tag.color || '#00d4ff'
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setActiveFilters((prev) => prev.filter((t) => t !== tag.name))
                              } else {
                                setActiveFilters((prev) => [...prev, tag.name])
                              }
                            }}
                            className={`cyber-chamfer-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase transition-all ${
                              isSelected ? 'font-bold ring-1 ring-white' : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{
                              color: hex,
                              borderColor: `${hex}80`,
                              backgroundColor: isSelected ? `${hex}30` : `${hex}10`,
                            }}
                          >
                            {isSelected ? `✓ ${tag.name}` : tag.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HUD Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsMinimalHUD(!isMinimalHUD)}
            className={`cyber-chamfer-sm flex items-center gap-1.5 border px-2.5 py-1 font-label text-xs uppercase tracking-wider transition-all ${
              isMinimalHUD
                ? 'border-neon-magenta/60 bg-neon-magenta/10 text-neon-magenta shadow-[0_0_8px_#ff00ff40]'
                : 'border-cyber-border bg-void-muted/60 text-fg-muted hover:border-fg-muted hover:text-fg'
            }`}
            title="Toggle between Minimal and Detailed Task Cards"
          >
            <Eye className="h-3.5 w-3.5" />
            [O] HUD: {isMinimalHUD ? 'MINIMAL' : 'DETAILED'}
          </button>

          {/* System Activity Logs Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isLogOpen
              setIsLogOpen(next)
              if (next) fetchActivityLogs()
            }}
            className={`cyber-chamfer-sm flex items-center gap-1.5 border px-2.5 py-1 font-label text-xs uppercase tracking-wider transition-all ${
              isLogOpen
                ? 'border-neon-cyan/80 bg-neon-cyan/20 text-neon-cyan shadow-[0_0_10px_#00d4ff40]'
                : 'border-cyber-border bg-void-muted/60 text-fg-muted hover:border-fg-muted hover:text-fg'
            }`}
            title="Toggle Activity Logs Sidebar"
          >
            <ListFilter className="h-3.5 w-3.5" />
            [≡] SYSTEM_LOGS
          </button>

          {/* Global Hashtags Registry Button */}
          <button
            type="button"
            onClick={() => setIsManageTagsOpen(true)}
            className="cyber-chamfer-sm flex items-center gap-1.5 border border-neon-cyan/60 bg-neon-cyan/10 px-2.5 py-1 font-label text-xs uppercase tracking-wider text-neon-cyan hover:bg-neon-cyan/20 transition-all shadow-[0_0_6px_#00d4ff30]"
            title="Manage Global Tags Registry & Colors"
          >
            <Tag className="h-3.5 w-3.5" />
            [#] GLOBAL_TAGS
          </button>

          {/* Create task button */}
          <button
            type="button"
            onClick={handleOpenCreateTerminalGlobal}
            className="cyber-chamfer-sm flex items-center gap-1.5 border border-neon-green/60 bg-neon-green/5 px-3 py-1.5 font-label text-[11px] uppercase tracking-[0.2em] text-neon-green transition-all duration-200 hover:bg-neon-green hover:text-void hover:shadow-[0_0_8px_#00ff88,0_0_16px_#00ff8830] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green"
          >
            <Plus className="h-3.5 w-3.5" />
            initiate_task
          </button>
        </div>
      </div>

      {/* ── Loading / Error states ────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-24 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-neon-green" />
          <span className="font-label text-sm uppercase tracking-[0.2em]">
            {'>'} initializing_data_stream...
          </span>
        </div>
      )}

      {error && (
        <div className="cyber-chamfer-sm mx-6 mt-6 flex items-center justify-between border-2 border-neon-red/50 bg-neon-red/10 px-4 py-3">
          <span className="font-label text-sm uppercase tracking-wider text-neon-red">
            [ERR_CONNECTION] {'>'} {error}
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-label text-xs uppercase tracking-wider text-neon-red hover:underline"
          >
            [dismiss]
          </button>
        </div>
      )}

      {/* ── Kanban Swimlanes Board ────────────────────────── */}
      {!loading && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="all-swimlanes" type="SWIMLANE">
            {(droppableProvided) => (
              <main
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className="space-y-6 p-5"
              >
                {sortedSwimlaneNames.map((category, index) => {
                  const categoryTasks = filteredTasks.filter(
                    (t) => (t.category || 'General') === category
                  )
                  const swimlaneStatuses = statuses.filter(
                    (s) => s.swimlane_name === category
                  )
                  const laneObj = swimlanes.find((s) => s.name === category)
                  const laneColor = laneObj?.color || '#00ffff'

                  return (
                    <Draggable
                      key={category}
                      draggableId={`swimlane-${category}`}
                      index={index}
                      isDragDisabled={sortMode !== 'custom'}
                    >
                      {(draggableProvided, draggableSnapshot) => (
                        <section
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={`cyber-chamfer border border-cyber-border bg-void-card/60 p-4 shadow-xl transition-shadow ${
                            draggableSnapshot.isDragging
                              ? 'shadow-[0_0_25px_#00d4ff60] border-neon-cyan/80 z-40'
                              : ''
                          }`}
                        >
                          {/* ── Swimlane Header ──────────────────────────── */}
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-cyber-border/80 pb-3">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle */}
                              <div
                                {...draggableProvided.dragHandleProps}
                                className={`cyber-chamfer-sm p-1 transition-colors ${
                                  sortMode === 'custom'
                                    ? 'cursor-grab hover:bg-neon-cyan/20 active:cursor-grabbing text-neon-cyan'
                                    : 'cursor-not-allowed opacity-30 text-fg-muted'
                                }`}
                                title={
                                  sortMode === 'custom'
                                    ? 'Drag to reorder swimlane'
                                    : 'Switch sort mode to Custom to reorder'
                                }
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>

                              <span
                                className="h-3 w-3 shadow-[0_0_8px_currentColor]"
                                style={{
                                  backgroundColor: laneColor,
                                  color: laneColor,
                                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                                }}
                              />
                              <h2
                                className="font-heading text-lg font-bold uppercase tracking-[0.2em] drop-shadow-[0_0_6px_currentColor]"
                                style={{ color: laneColor }}
                              >
                                {'>'} {category.toUpperCase()}
                              </h2>
                              <button
                                type="button"
                                onClick={() => handleEditSwimlane(category)}
                                className="cyber-chamfer-sm border border-cyber-border bg-void-muted/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:border-neon-cyan/60 hover:text-neon-cyan focus-visible:outline-none flex items-center gap-1"
                                title="Rename Swimlane"
                              >
                                <Edit3 className="h-3 w-3" />
                                [EDIT]
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateSwimlane(category)}
                                className="cyber-chamfer-sm border border-cyber-border bg-void-muted/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:border-neon-magenta/60 hover:text-neon-magenta focus-visible:outline-none flex items-center gap-1"
                                title="Duplicate Swimlane & Reset Cloned Task Progress to 0%"
                              >
                                <Copy className="h-3 w-3" />
                                [DUPLICATE]
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSwimlane(category)}
                                className="cyber-chamfer-sm border border-cyber-border bg-void-muted/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:border-neon-red/60 hover:text-neon-red focus-visible:outline-none flex items-center gap-1"
                                title="Delete Swimlane"
                              >
                                <Trash2 className="h-3 w-3" />
                                [DELETE]
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleCreateStatus(category)}
                                className="cyber-chamfer-sm border border-neon-cyan/60 bg-neon-cyan/10 px-2.5 py-1 font-label text-[11px] font-semibold uppercase tracking-wider text-neon-cyan transition-all duration-200 hover:bg-neon-cyan hover:text-void flex items-center gap-1 focus-visible:outline-none"
                                title="Add Custom Status Column to this Swimlane"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                [+] ADD STATUS
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="font-label text-xs uppercase tracking-wider text-fg-muted">
                                  nodes:
                                </span>
                                <span className="cyber-chamfer-sm border border-neon-cyan/50 bg-neon-cyan/10 px-2.5 py-0.5 font-label text-xs tabular-nums text-neon-cyan">
                                  {categoryTasks.length}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ── Status Columns inside Swimlane ─────────── */}
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {swimlaneStatuses.length > 0 ? (
                              swimlaneStatuses.map((statusObj, idx) => {
                                const palette = COLOR_PALETTE[idx % COLOR_PALETTE.length]
                                const statusColor = statusObj.color || palette.color || '#00ffff'
                                const columnTasks = categoryTasks.filter(
                                  (t) => t.status === statusObj.name
                                )
                                const averageProgress =
                                  columnTasks.length > 0
                                    ? Math.round(
                                        columnTasks.reduce(
                                          (sum, task) => sum + (task.progress_percentage || 0),
                                          0
                                        ) / columnTasks.length
                                      )
                                    : 0
                                const compositeDroppableId = `${category}|${statusObj.name}`

                                return (
                                  <div
                                    key={statusObj.id || `${category}-${statusObj.name}`}
                                    className="cyber-chamfer-sm flex flex-col border border-cyber-border/60 bg-void/70 p-3"
                                  >
                                    {/* Column header inside swimlane */}
                                    <div className="mb-3 flex items-center gap-2 border-b border-cyber-border/40 pb-2">
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 shadow-[0_0_6px_currentColor]"
                                        style={{
                                          backgroundColor: statusColor,
                                          color: statusColor,
                                          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                                        }}
                                      />
                                      <div className="flex items-baseline gap-1 truncate max-w-[110px]">
                                        <h3
                                          className="font-label text-xs font-semibold uppercase tracking-[0.15em] truncate"
                                          style={{ color: statusColor }}
                                        >
                                          {statusObj.name}
                                        </h3>
                                        <span
                                          className="font-mono text-[9px] font-semibold shrink-0"
                                          style={{ color: statusColor }}
                                          title={`Average column task progress: ${averageProgress}% (${columnTasks.length} tasks)`}
                                        >
                                          ({averageProgress}%)
                                        </span>
                                      </div>
                                      <div className="ml-auto flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCreateTerminalForColumn(category, statusObj.name)}
                                          className="cyber-chamfer-sm border border-neon-cyan/60 bg-neon-cyan/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neon-cyan hover:bg-neon-cyan hover:text-void transition-all flex items-center gap-0.5"
                                          title={`Add task to ${category} -> ${statusObj.name}`}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleEditStatus(statusObj)}
                                          className="text-fg-muted transition-colors hover:text-neon-cyan"
                                          title="Edit Status & Default Progress"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteStatus(statusObj)}
                                          className="text-fg-muted transition-colors hover:text-neon-red"
                                          title="Delete Status"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                        <span className="cyber-chamfer-sm border border-cyber-border bg-void-muted px-1.5 py-0.5 font-label text-[10px] tabular-nums text-neon-green">
                                          {columnTasks.length}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Droppable area */}
                                    <Droppable droppableId={compositeDroppableId} type="TASK">
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          className={`flex flex-1 flex-col gap-3 min-h-[140px] transition-colors rounded p-1 ${
                                            snapshot.isDraggingOver
                                              ? 'bg-void-muted/40 border border-dashed border-neon-cyan/40'
                                              : ''
                                          }`}
                                        >
                                          {columnTasks.length > 0 ? (
                                            columnTasks.map((task, taskIndex) => (
                                              <TaskCard
                                                key={task.id}
                                                task={task}
                                                index={taskIndex}
                                                onEdit={(taskToEdit) => setEditingTask(taskToEdit)}
                                                isMinimalHUD={isMinimalHUD}
                                                globalHashtags={globalHashtags}
                                                visibleProps={visibleProps}
                                                allTasks={tasks}
                                                categories={sortedSwimlaneNames}
                                                statuses={statuses}
                                                onDuplicated={handleTaskCreated}
                                                onTaskUpdated={handleTaskCreated}
                                              />
                                            ))
                                          ) : (
                                            <div
                                              onClick={() => handleOpenCreateTerminalForColumn(category, statusObj.name)}
                                              className="flex flex-1 cursor-pointer flex-col items-center justify-center border border-dashed border-cyber-border/40 py-8 transition-colors hover:border-neon-cyan/60 hover:bg-neon-cyan/5 group"
                                              title={`Click to initiate task in ${category} -> ${statusObj.name}`}
                                            >
                                              <span className="font-label text-[11px] uppercase tracking-[0.15em] text-fg-muted/60 transition-colors group-hover:text-neon-cyan flex items-center gap-1.5">
                                                <span>{'>'} EMPTY_LANE_</span>
                                                <span className="font-bold text-neon-cyan">[ + INITIATE ]</span>
                                              </span>
                                            </div>
                                          )}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </div>
                                )
                              })
                            ) : (
                              <div className="col-span-full flex flex-col items-center justify-center border border-dashed border-cyber-border/40 bg-void/30 p-8 text-center">
                                <span className="font-label text-xs uppercase tracking-[0.2em] text-fg-muted mb-3">
                                  {'>'} CLEAN_SWIMLANE :: NO STATUS COLUMNS REGISTERED
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCreateStatus(category)}
                                  className="cyber-chamfer-sm border border-neon-cyan/60 bg-neon-cyan/10 px-3 py-1.5 font-label text-xs uppercase tracking-wider text-neon-cyan transition-all duration-200 hover:bg-neon-cyan hover:text-void flex items-center gap-1.5"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  [+] ADD STATUS COLUMN
                                </button>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </Draggable>
                  )
                })}
                {droppableProvided.placeholder}

                {/* ── Initiate Swimlane Button ─────────────────────── */}
                <div className="mt-8 flex justify-center pb-8">
                  <button
                    type="button"
                    onClick={() => setIsSwimlaneModalOpen(true)}
                    className="cyber-chamfer flex items-center gap-2 border-2 border-neon-cyan bg-neon-cyan/10 px-6 py-3 font-label text-xs font-bold uppercase tracking-[0.2em] text-neon-cyan shadow-[0_0_15px_#00d4ff30] transition-all duration-200 hover:bg-neon-cyan hover:text-void hover:shadow-[0_0_20px_#00d4ff,0_0_40px_#00d4ff60] focus-visible:outline-none"
                  >
                    <Plus className="h-4 w-4" />
                    [+] INITIATE_LANE
                  </button>
                </div>
              </main>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* ── Create Task Terminal Modal ─────────────────── */}
      <CreateTaskTerminal
        open={showTerminal}
        onClose={() => {
          setShowTerminal(false)
          setCreateTaskDefaults({})
        }}
        onCreated={handleTaskCreated}
        categories={swimlaneNames}
        statuses={statuses}
        defaultCategory={createTaskDefaults.category}
        defaultStatus={createTaskDefaults.status}
      />

      {/* ── Edit Task Terminal Modal ───────────────────── */}
      {editingTask && (
        <EditTaskTerminal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
          onDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
            getTasks().then(setTasks).catch(() => {})
          }}
          categories={swimlaneNames}
          statuses={statuses}
        />
      )}

      {/* ── Swimlane Creation Terminal Modal ────────────── */}
      <SwimlaneCreationTerminal
        isOpen={isSwimlaneModalOpen}
        onClose={() => setIsSwimlaneModalOpen(false)}
        onSubmit={handleSwimlaneSubmit}
      />

      {/* ── Universal Prompt Terminal Modal ──────────────── */}
      <PromptTerminal
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        message={promptConfig.message}
        inputLabel={promptConfig.inputLabel}
        placeholder={promptConfig.placeholder}
        initialValue={promptConfig.initialValue}
        isNumeric={promptConfig.isNumeric}
        secondaryInputLabel={promptConfig.secondaryInputLabel}
        secondaryPlaceholder={promptConfig.secondaryPlaceholder}
        secondaryInitialValue={promptConfig.secondaryInitialValue}
        secondaryIsNumeric={promptConfig.secondaryIsNumeric}
        secondaryAllowNoOverride={promptConfig.secondaryAllowNoOverride}
        colorInputLabel={promptConfig.colorInputLabel}
        colorPlaceholder={promptConfig.colorPlaceholder}
        colorInitialValue={promptConfig.colorInitialValue}
        submitText={promptConfig.submitText}
        onCancel={closePrompt}
        onSubmit={promptConfig.onSubmit}
      />

      {/* ── Universal Confirm Terminal Modal ─────────────── */}
      <ConfirmTerminal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        onCancel={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
      />

      {/* ── Global Tags Management Terminal Modal ─────────── */}
      <ManageTagsTerminal
        open={isManageTagsOpen}
        onClose={() => setIsManageTagsOpen(false)}
        onTagsUpdated={(updated) => setGlobalHashtags(updated)}
      />

      {/* ── Activity Logs Cyberpunk Sidebar ──────────── */}
      {isLogOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neon-cyan/60 bg-void-card/95 backdrop-blur-md shadow-2xl transition-all duration-300">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-cyber-border px-5 py-4 bg-void-muted/60">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-neon-cyan animate-pulse" />
              <h2 className="font-heading text-base font-bold uppercase tracking-widest text-neon-cyan">
                {'>'} SYSTEM_ACTIVITY_LOGS
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsLogOpen(false)}
              className="text-fg-muted transition-colors hover:text-neon-red focus-visible:outline-none"
              aria-label="Close logs sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Logs List Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="cyber-chamfer-sm border border-cyber-border/60 bg-void/80 p-3 space-y-1 transition-all hover:border-neon-cyan/40"
                >
                  <div className="flex items-center justify-between text-[10px] text-fg-muted/70">
                    <span className="text-neon-cyan font-bold">{log.task_title || '[SYSTEM]'}</span>
                    <span className="tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-fg leading-relaxed">
                    <span className="text-neon-green">{'> '}</span>
                    {log.description || log.details || log.action}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex h-48 items-center justify-center border border-dashed border-cyber-border/40 text-fg-muted">
                <span>{'>'} NO_ACTIVITY_LOGS_FOUND</span>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-cyber-border p-3 text-center">
            <button
              type="button"
              onClick={fetchActivityLogs}
              className="cyber-chamfer-sm w-full border border-neon-cyan/40 bg-neon-cyan/10 py-1.5 font-label text-xs uppercase tracking-wider text-neon-cyan transition-all hover:bg-neon-cyan hover:text-void"
            >
              [REFRESH_LOGS]
            </button>
          </div>
        </div>
      )}

      {/* ── Footer status line ────────────────────────────── */}
      <footer className="mt-auto border-t border-cyber-border px-6 py-2">
        <div className="flex items-center justify-between font-label text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          <span>kanban_sys::v1.0</span>
          <span className="text-neon-green/60">
            ■ connected
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
