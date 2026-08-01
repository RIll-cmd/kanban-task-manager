import type { Task, ActivityLog } from '../types'

const API_BASE = 'http://127.0.0.1:8000/api'

/**
 * Fetch all tasks from the backend.
 * Returns the parsed JSON array of Task objects.
 */
export async function getTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks`)

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<Task[]>
}

/**
 * Payload shape for creating a new task.
 * Matches the backend's TaskCreate Pydantic schema.
 */
export interface CreateTaskPayload {
  title: string
  description?: string | null
  status?: string
  priority?: string
  category?: string
  note?: string | null
}

/**
 * Create a new task on the backend.
 * Returns the fully hydrated Task (with id, timestamps, etc.).
 */
export async function createTask(taskData: CreateTaskPayload): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to create task: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<Task>
}

/**
 * Update an existing task on the backend.
 * Returns the updated Task.
 */
export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to update task ${taskId}: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<Task>
}

export interface Swimlane {
  id: number
  name: string
}

/**
 * Fetch all swimlanes from backend.
 */
export async function getSwimlanes(): Promise<Swimlane[]> {
  const response = await fetch(`${API_BASE}/swimlanes`)

  if (!response.ok) {
    throw new Error(`Failed to fetch swimlanes: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<Swimlane[]>
}

/**
 * Create a new swimlane.
 */
export async function createSwimlane(name: string, useDefaults: boolean = true): Promise<Swimlane> {
  const response = await fetch(`${API_BASE}/swimlanes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, use_defaults: useDefaults }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to create swimlane: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<Swimlane>
}

export interface Swimlane {
  id: number
  name: string
  order?: number
}

/**
 * Rename an existing swimlane and bulk update associated tasks.
 */
export async function updateSwimlane(oldName: string, newName: string): Promise<Swimlane> {
  const response = await fetch(`${API_BASE}/swimlanes/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName, new_name: newName }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to update swimlane ${oldName}: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<Swimlane>
}

/**
 * Bulk reorder swimlanes.
 */
export async function reorderSwimlanes(
  items: { name: string; order: number }[]
): Promise<Swimlane[]> {
  const response = await fetch(`${API_BASE}/swimlanes/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to reorder swimlanes: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<Swimlane[]>
}

/**
 * Delete a swimlane.
 */
export async function deleteSwimlane(
  name: string
): Promise<{ message: string; fallback: string }> {
  const response = await fetch(`${API_BASE}/swimlanes/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to delete swimlane ${name}: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<{ message: string; fallback: string }>
}

export interface StatusItem {
  id: number
  name: string
  swimlane_name: string
  order: number
  default_progress?: number | null
}

/**
 * Fetch all statuses from backend sorted by order.
 */
export async function getStatuses(swimlaneName?: string): Promise<StatusItem[]> {
  const url = swimlaneName
    ? `${API_BASE}/statuses?swimlane_name=${encodeURIComponent(swimlaneName)}`
    : `${API_BASE}/statuses`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch statuses: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<StatusItem[]>
}

/**
 * Create a new status for a swimlane.
 */
export async function createStatus(
  name: string,
  swimlaneName: string,
  defaultProgress?: number | null
): Promise<StatusItem> {
  const response = await fetch(`${API_BASE}/statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      swimlane_name: swimlaneName,
      default_progress: defaultProgress,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to create status: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<StatusItem>
}

/**
 * Rename an existing status or update default_progress for a swimlane.
 */
export async function updateStatus(
  oldName: string,
  newName: string,
  swimlaneName?: string,
  defaultProgress?: number | null
): Promise<StatusItem> {
  const response = await fetch(`${API_BASE}/statuses/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: newName,
      new_name: newName,
      swimlane_name: swimlaneName,
      default_progress: defaultProgress,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to update status ${oldName}: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<StatusItem>
}

/**
 * Delete a status. Reassigns existing tasks in swimlane to fallback status.
 */
export async function deleteStatus(
  name: string,
  swimlaneName?: string
): Promise<{ message: string; fallback: string }> {
  const url = swimlaneName
    ? `${API_BASE}/statuses/${encodeURIComponent(name)}?swimlane_name=${encodeURIComponent(swimlaneName)}`
    : `${API_BASE}/statuses/${encodeURIComponent(name)}`
  const response = await fetch(url, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to delete status ${name}: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<{ message: string; fallback: string }>
}

/**
 * Fetch top 50 recent activity logs.
 */
export async function getActivityLogs(): Promise<ActivityLog[]> {
  const response = await fetch(`${API_BASE}/logs`)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Failed to fetch activity logs: ${response.status} ${response.statusText} ${errorBody}`)
  }

  return response.json() as Promise<ActivityLog[]>
}

