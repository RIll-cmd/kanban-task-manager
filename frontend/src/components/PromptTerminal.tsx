import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, X, Check } from 'lucide-react'

interface PromptTerminalProps {
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
  onCancel: () => void
  onSubmit: (value: string, secondaryValue?: string, colorValue?: string) => void | Promise<void>
}

export default function PromptTerminal({
  isOpen,
  title,
  message,
  inputLabel = 'INPUT_VALUE',
  placeholder = 'Type here...',
  initialValue = '',
  isNumeric = false,
  secondaryInputLabel,
  secondaryPlaceholder,
  secondaryInitialValue = '',
  secondaryIsNumeric = false,
  secondaryAllowNoOverride = false,
  colorInputLabel,
  colorPlaceholder = '#00ffff',
  colorInitialValue = '#00ffff',
  submitText = '[SUBMIT]',
  onCancel,
  onSubmit,
}: PromptTerminalProps) {
  const [value, setValue] = useState('')
  const [secondaryValue, setSecondaryValue] = useState('')
  const [colorValue, setColorValue] = useState('#00ffff')
  const [isNoOverride, setIsNoOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
      setColorValue(colorInitialValue || '#00ffff')
      const isInitialNone =
        secondaryInitialValue === 'none' ||
        secondaryInitialValue === 'null' ||
        secondaryInitialValue === '' ||
        secondaryInitialValue === undefined
      
      setSecondaryValue(isInitialNone ? '' : secondaryInitialValue)
      setIsNoOverride(secondaryAllowNoOverride ? isInitialNone : false)
      setError(null)
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialValue, secondaryInitialValue, secondaryAllowNoOverride, colorInitialValue])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) {
      setError('> ERR: INVALID_DATA_TYPE - VALUE REQUIRED')
      inputRef.current?.focus()
      return
    }

    if (isNumeric) {
      const parsed = parseInt(value.trim(), 10)
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        setError('> ERR: INVALID_DATA_TYPE - NUMERIC REQUIRED (0-100)')
        inputRef.current?.focus()
        return
      }
    }

    let secValToSubmit: string | undefined = undefined

    if (secondaryInputLabel) {
      if (secondaryAllowNoOverride && isNoOverride) {
        secValToSubmit = 'none'
      } else if (secondaryIsNumeric && secondaryValue.trim() !== '') {
        const parsed = parseInt(secondaryValue.trim(), 10)
        if (isNaN(parsed) || parsed < 0 || parsed > 100) {
          setError('> ERR: INVALID_DATA_TYPE - NUMERIC REQUIRED (0-100)')
          return
        }
        secValToSubmit = String(parsed)
      } else {
        secValToSubmit = secondaryValue.trim()
      }
    }

    onSubmit(value.trim(), secValToSubmit, colorInputLabel ? (colorValue.trim() || '#00ffff') : undefined)
  }

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
      <div className="cyber-chamfer relative mx-4 w-full max-w-md border border-neon-cyan/60 bg-void-card shadow-2xl">
        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-cyan" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyber-border px-5 py-3.5 bg-void-muted/50">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4 text-neon-cyan" />
            <h2 className="font-heading text-base font-bold uppercase tracking-widest text-neon-cyan">
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {message && (
            <p className="font-mono text-xs text-fg-muted leading-relaxed">
              {message}
            </p>
          )}

          {error && (
            <div className="cyber-chamfer-sm border border-neon-red/60 bg-neon-red/10 p-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-neon-red drop-shadow-[0_0_6px_#ff0055]">
              {error}
            </div>
          )}

          {/* Primary Input */}
          <div className="space-y-1.5">
            <label className="block font-label text-xs uppercase tracking-[0.15em] text-fg-muted">
              {inputLabel} <span className="text-neon-cyan">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan">
                {'>'}
              </span>
              <input
                ref={inputRef}
                type={isNumeric ? 'number' : 'text'}
                min={isNumeric ? 0 : undefined}
                max={isNumeric ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={`cyber-chamfer-sm w-full border border-cyber-border bg-void-muted py-2 pr-3 pl-8 font-mono text-sm text-fg placeholder:text-fg-muted/40 transition-all focus:border-neon-cyan focus:shadow-[0_0_8px_#00d4ff40] focus:outline-none ${
                  isNumeric ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''
                }`}
              />
            </div>
          </div>

          {/* Optional Secondary Input (e.g. default progress percentage) */}
          {secondaryInputLabel && (
            <div className="space-y-2 pt-1">
              <label className="block font-label text-xs uppercase tracking-[0.15em] text-fg-muted">
                {secondaryInputLabel}
              </label>
              <div className="relative">
                <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm ${isNoOverride ? 'text-fg-muted/30' : 'text-neon-cyan'}`}>
                  %
                </span>
                <input
                  type={secondaryIsNumeric ? 'number' : 'text'}
                  min={secondaryIsNumeric ? 0 : undefined}
                  max={secondaryIsNumeric ? 100 : undefined}
                  disabled={isNoOverride}
                  value={isNoOverride ? '' : secondaryValue}
                  onChange={(e) => setSecondaryValue(e.target.value)}
                  placeholder={isNoOverride ? 'NO_OVERRIDE_ACTIVE' : (secondaryPlaceholder || '0-100')}
                  className={`cyber-chamfer-sm w-full border border-cyber-border bg-void-muted py-2 pr-3 pl-8 font-mono text-sm transition-all focus:border-neon-cyan focus:shadow-[0_0_8px_#00d4ff40] focus:outline-none ${
                    isNoOverride
                      ? 'opacity-40 cursor-not-allowed text-fg-muted/40 border-cyber-border/40'
                      : 'text-fg placeholder:text-fg-muted/40'
                  } ${secondaryIsNumeric ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}`}
                />
              </div>

              {/* Cyberpunk No Override Toggle */}
              {secondaryAllowNoOverride && (
                <div
                  onClick={() => setIsNoOverride(!isNoOverride)}
                  className="flex items-center gap-2.5 cursor-pointer pt-1 group select-none"
                >
                  <div
                    className={`cyber-chamfer-sm flex h-4 w-4 items-center justify-center border font-mono text-xs transition-all ${
                      isNoOverride
                        ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan shadow-[0_0_8px_#00d4ff40]'
                        : 'border-cyber-border bg-void-muted text-transparent group-hover:border-fg-muted'
                    }`}
                  >
                    X
                  </div>
                  <span
                    className={`font-mono text-xs uppercase tracking-wider transition-colors ${
                      isNoOverride ? 'text-neon-cyan font-bold drop-shadow-[0_0_5px_#00d4ff60]' : 'text-fg-muted group-hover:text-fg'
                    }`}
                  >
                    [ ] DISABLE_PROGRESS_OVERRIDE (NO OVERRIDE)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Optional Color Hex Input */}
          {colorInputLabel && (
            <div className="space-y-1.5 pt-1">
              <label className="block font-label text-xs uppercase tracking-[0.15em] text-fg-muted">
                {colorInputLabel.startsWith('>') ? colorInputLabel : `> ${colorInputLabel}`}
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 shrink-0 border border-cyber-border rounded-none shadow-sm transition-colors"
                  style={{ backgroundColor: colorValue || '#00ffff' }}
                  title="Active color accent preview"
                />
                <div className="relative w-full">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan">
                    {'>'}
                  </span>
                  <input
                    type="text"
                    value={colorValue}
                    onChange={(e) => setColorValue(e.target.value)}
                    placeholder={colorPlaceholder || '#00ffff'}
                    className="cyber-chamfer-sm w-full border border-cyber-border bg-void-muted py-2 pr-3 pl-8 font-mono text-sm text-fg placeholder:text-fg-muted/40 transition-all focus:border-neon-cyan focus:shadow-[0_0_8px_#00d4ff40] focus:outline-none uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="cyber-chamfer-sm border border-cyber-border bg-void-muted px-4 py-2 font-label text-xs uppercase tracking-[0.15em] text-fg-muted transition-all hover:border-fg-muted hover:text-fg focus-visible:outline-none"
            >
              [CANCEL]
            </button>
            <button
              type="submit"
              className="cyber-chamfer-sm flex items-center gap-1.5 border border-neon-cyan/60 bg-neon-cyan/10 px-4 py-2 font-label text-xs uppercase tracking-[0.15em] text-neon-cyan transition-all duration-200 hover:bg-neon-cyan hover:text-void hover:shadow-[0_0_12px_#00d4ff50] focus-visible:outline-none"
            >
              <Check className="h-3.5 w-3.5" />
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
