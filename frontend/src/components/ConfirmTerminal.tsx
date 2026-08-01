import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmTerminalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export default function ConfirmTerminal({
  isOpen,
  title,
  message,
  confirmText = '[CONFIRM]',
  cancelText = '[CANCEL]',
  onConfirm,
  onCancel,
}: ConfirmTerminalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="cyber-chamfer relative mx-4 w-full max-w-md border border-neon-red/60 bg-void-card shadow-2xl">
        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-red" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-red" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-red" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-red" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyber-border px-5 py-3.5 bg-void-muted/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-neon-red animate-pulse" />
            <h2 className="font-heading text-base font-bold uppercase tracking-widest text-neon-red">
              {'>'} {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-fg-muted transition-colors hover:text-neon-red focus-visible:outline-none"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-5">
          <p className="font-mono text-sm text-fg-muted leading-relaxed whitespace-pre-wrap">
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="cyber-chamfer-sm border border-cyber-border bg-void-muted px-4 py-2 font-label text-xs uppercase tracking-[0.15em] text-fg-muted transition-all hover:border-fg-muted hover:text-fg focus-visible:outline-none"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="cyber-chamfer-sm border border-neon-red/60 bg-neon-red/10 px-4 py-2 font-label text-xs uppercase tracking-[0.15em] text-neon-red transition-all duration-200 hover:bg-neon-red hover:text-void hover:shadow-[0_0_12px_#ff005550] focus-visible:outline-none"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
