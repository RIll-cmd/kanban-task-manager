import { Draggable } from '@hello-pangea/dnd'
import type { Task } from '../types'

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

interface TaskCardProps {
  task: Task
  index: number
  onEdit: (task: Task) => void
  isMinimalHUD?: boolean
}

export default function TaskCard({ task, index, onEdit, isMinimalHUD = false }: TaskCardProps) {
  const priorityStyle =
    PRIORITY_STYLES[task.priority] ?? 'border-cyber-border text-fg-muted bg-void-muted/30'
  const priorityGlow =
    PRIORITY_GLOW[task.priority] ?? 'none'

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

          {/* Title + Priority + Edit Button row */}
          <div className={`relative flex items-start justify-between gap-2 ${isMinimalHUD ? '' : 'mb-2'}`}>
            <h3 className="font-label text-sm font-medium uppercase leading-snug tracking-wide text-fg">
              {task.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`cyber-chamfer-sm border px-2 py-0.5 font-label text-[9px] font-semibold uppercase tracking-[0.2em] ${priorityStyle}`}
                style={{ boxShadow: priorityGlow }}
              >
                {task.priority}
              </span>
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
            </div>
          </div>

          {/* Detailed View Only Properties */}
          {!isMinimalHUD && (
            <>
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

              {/* Progress bar */}
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
