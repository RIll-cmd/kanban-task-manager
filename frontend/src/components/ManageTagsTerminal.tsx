import { useState, useEffect } from 'react'
import { X, Tag, Plus, Trash2 } from 'lucide-react'
import type { Hashtag } from '../types'
import { getHashtags, createHashtag, deleteHashtag } from '../api/client'

const PRESET_NEON_COLORS = [
  { label: 'Cyan', hex: '#00d4ff' },
  { label: 'Green', hex: '#00ff88' },
  { label: 'Amber', hex: '#ffb000' },
  { label: 'Red', hex: '#ff3366' },
  { label: 'Purple', hex: '#b026ff' },
  { label: 'Pink', hex: '#ff007f' },
  { label: 'Yellow', hex: '#ffee00' },
]

interface ManageTagsTerminalProps {
  open: boolean
  onClose: () => void
  onTagsUpdated?: (tags: Hashtag[]) => void
}

export default function ManageTagsTerminal({ open, onClose, onTagsUpdated }: ManageTagsTerminalProps) {
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#00d4ff')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTags = async () => {
    try {
      const data = await getHashtags()
      setHashtags(data)
      if (onTagsUpdated) onTagsUpdated(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tags'
      setError(`[ERR] > ${message}`)
    }
  }

  useEffect(() => {
    if (open) {
      loadTags()
      setTagName('')
      setError(null)
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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = tagName.trim()
    if (!trimmed) {
      setError('[ERR] > tag_name_required')
      return
    }

    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    setSubmitting(true)
    setError(null)

    try {
      await createHashtag(formatted, tagColor)
      setTagName('')
      await loadTags()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Creation failed'
      setError(`[ERR_CREATE] > ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTag = async (id: number, name: string) => {
    try {
      await deleteHashtag(id)
      await loadTags()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to delete ${name}`
      setError(`[ERR_DELETE] > ${message}`)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Manage global hashtags terminal"
    >
      <div className="cyber-chamfer relative mx-4 w-full max-w-lg border border-cyber-border bg-void-card shadow-2xl">
        {/* Corner accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-cyan" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-cyan" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyber-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neon-red/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-neon-amber/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-neon-cyan/80" />
            </div>
            <span className="font-label text-xs uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> global_hashtags_registry
            </span>
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

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Current Hashtags Registry List */}
          <div>
            <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.2em] text-fg-muted">
              REGISTERED_GLOBAL_TAGS ({hashtags.length})
            </span>
            {hashtags.length === 0 ? (
              <p className="font-mono text-xs text-fg-muted/60 py-3 text-center border border-dashed border-cyber-border">
                {'>'} NO_GLOBAL_TAGS_REGISTERED
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 border border-cyber-border/40 bg-void/50 cyber-chamfer-sm">
                {hashtags.map((tag) => {
                  const hex = tag.color || '#00d4ff'
                  return (
                    <span
                      key={tag.id}
                      className="cyber-chamfer-sm inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-xs uppercase tracking-wider transition-all"
                      style={{
                        color: hex,
                        borderColor: `${hex}80`,
                        backgroundColor: `${hex}15`,
                        boxShadow: `0 0 4px ${hex}30`,
                      }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="hover:opacity-100 opacity-70 transition-opacity text-neon-red ml-0.5 focus:outline-none"
                        title={`Delete ${tag.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Create New Tag Form */}
          <form onSubmit={handleCreateTag} className="border-t border-cyber-border pt-3 space-y-3">
            <span className="block font-label text-[10px] uppercase tracking-[0.2em] text-neon-cyan">
              {'>'} REGISTER_NEW_TAG
            </span>

            {/* Tag Name Input */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neon-cyan/60">
                {'>'}
              </span>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="tag_name (e.g. #hardware, #bug)..."
                className="cyber-chamfer-sm w-full border border-cyber-border bg-void py-2 pl-8 pr-3 font-mono text-xs text-neon-cyan placeholder:text-fg-muted/40 transition-all duration-200 focus:border-neon-cyan focus:outline-none"
              />
            </div>

            {/* Color Selector Controls */}
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                TAG_NEON_COLOR
              </label>
              <div className="flex items-center gap-2">
                {/* Custom Color Input */}
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-cyber-border bg-void p-0.5"
                  title="Choose custom color"
                />

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_NEON_COLORS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setTagColor(preset.hex)}
                      className={`h-6 w-6 rounded-full border transition-all ${
                        tagColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'border-white scale-110 shadow-[0_0_8px_currentColor]'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.hex, color: preset.hex }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="font-label text-xs uppercase tracking-wider text-neon-red">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="cyber-chamfer-sm border border-cyber-border px-4 py-2 font-label text-xs uppercase tracking-[0.2em] text-fg-muted hover:border-neon-red/50 hover:text-neon-red transition-all"
              >
                close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="cyber-chamfer-sm flex items-center gap-1.5 border-2 border-neon-cyan bg-neon-cyan/10 px-5 py-2 font-label text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan hover:bg-neon-cyan hover:text-void transition-all disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                {submitting ? 'registering...' : 'register_tag'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
