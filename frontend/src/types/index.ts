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

export interface Task {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null // ISO-8601 string
  created_at: string      // ISO-8601 string
  subtasks: Subtask[]
  logs: ActivityLog[]
  progress_percentage: number
  previous_progress?: number
  category?: string
  note?: string | null
}
