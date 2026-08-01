// ── Types that mirror the backend Pydantic schemas exactly ──

export interface Subtask {
  id: number
  title: string
  is_completed: boolean
  task_id: number
}

export interface ActivityLog {
  id: number
  task_id?: number | null
  task_title?: string
  description?: string
  action?: string
  details?: string
  timestamp: string // ISO-8601 string from JSON serialisation
}

export interface Hashtag {
  id: number
  name: string // e.g. "#bug"
  color?: string // Hex string e.g. "#ff3366"
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  category?: string
  note?: string | null
  previous_progress?: number
  is_archived?: boolean

  // ── Legacy timestamp ──
  created_at: string      // ISO-8601 string

  // ── Temporal tracking ──
  created_date: string    // ISO-8601 string
  start_date: string | null
  scheduled_date: string | null
  due_date: string | null // ISO-8601 string
  completed_date: string | null

  // ── Tags ──
  tags: string[]

  subtasks: Subtask[]
  logs: ActivityLog[]
  progress_percentage: number
}
