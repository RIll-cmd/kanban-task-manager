import { useState, useRef, useEffect } from 'react'
import { X, Sparkles, LayoutGrid } from 'lucide-react'

interface SwimlaneCreationTerminalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, useDefaults: boolean) => void | Promise<void>
}

export default function SwimlaneCreationTerminal({
  isOpen,
  onClose,
  onSubmit,
}: SwimlaneCreationTerminalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setName('')
      const timer = setTimeout(() => nameRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleAction = async (useDefaults: boolean) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('[ERR_VALIDATION] > Swimlane name cannot be empty')
      nameRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(trimmed, useDefaults)
      setName('')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize swimlane'
      setError(`[ERR_SUBMIT] > ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    /* ── Backdrop ───────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Initiate new swimlane"
    >
      {/* ── Terminal Window ─────────────────────────────── */}
      <div className="cyber-chamfer relative mx-4 w-full max-w-md border border-cyber-border bg-void-card shadow-2xl">
        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-cyan" />

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-cyber-border px-5 py-3.5 bg-void-muted/50">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 bg-neon-cyan shadow-[0_0_6px_#00d4ff]"
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
            />
            <h2 className="font-heading text-base font-bold uppercase tracking-widest text-neon-cyan">
              {'>'} INITIATE_NEW_LANE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted transition-colors hover:text-neon-red focus-visible:outline-none"
            aria-label="Close terminal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Form Body ───────────────────────────────────── */}
        <div className="space-y-5 p-5">
          {/* Error Message */}
          {error && (
            <div className="cyber-chamfer-sm border border-neon-red/50 bg-neon-red/10 p-2.5 font-label text-xs uppercase tracking-wider text-neon-red">
              {error}
            </div>
          )}

          {/* Swimlane Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="swimlane-name-input"
              className="block font-label text-xs uppercase tracking-[0.15em] text-fg-muted"
            >
              SWIMLANE_NAME <span className="text-neon-cyan">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan">
                {'>'}
              </span>
              <input
                id="swimlane-name-input"
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAction(true)
                  }
                }}
                placeholder="e.g. AI Models / Frontend Infrastructure"
                disabled={submitting}
                className="cyber-chamfer-sm w-full border border-cyber-border bg-void-muted py-2 pr-3 pl-8 font-mono text-sm text-fg placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-cyan focus:shadow-[0_0_8px_#00d4ff40] focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <p className="font-label text-[11px] text-fg-muted/70 leading-relaxed">
            Select initialization mode: populated with standard columns (To Do, In Progress, Review, Done) or a completely clean slate.
          </p>

          {/* ── Actions Footer ────────────────────────────── */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction(true)}
              className="cyber-chamfer-sm flex items-center justify-center gap-2 border border-neon-cyan/60 bg-neon-cyan/10 px-4 py-2.5 font-label text-xs uppercase tracking-[0.15em] text-neon-cyan transition-all duration-200 hover:bg-neon-cyan hover:text-void hover:shadow-[0_0_12px_#00d4ff50] focus-visible:outline-none disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              [INIT_WITH_DEFAULTS]
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction(false)}
              className="cyber-chamfer-sm flex items-center justify-center gap-2 border border-cyber-border bg-void-muted px-4 py-2.5 font-label text-xs uppercase tracking-[0.15em] text-fg-muted transition-all duration-200 hover:border-fg-muted hover:text-fg focus-visible:outline-none disabled:opacity-50"
            >
              <LayoutGrid className="h-4 w-4" />
              [INIT_CLEAN_SLATE]
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="mt-1 font-label text-[11px] uppercase tracking-wider text-fg-muted/60 transition-colors hover:text-neon-red"
            >
              [CANCEL]
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
