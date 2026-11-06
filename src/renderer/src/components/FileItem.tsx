import { motion, useReducedMotion } from 'motion/react'
import type { MacIslandFileItem } from '../fileTypes'

interface FileItemProps {
  item: MacIslandFileItem
  onOpen: (id: string) => void
  onRemove: (id: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAddedDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()
}

export function FileItem({ item, onOpen, onRemove }: FileItemProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()

  return (
    <motion.li
      className={`file-item ${item.exists ? '' : 'missing'}`}
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
    >
      <button
        className="file-open"
        type="button"
        disabled={!item.exists}
        onClick={(event) => {
          event.stopPropagation()
          onOpen(item.id)
        }}
      >
        <strong>{item.name}</strong>
        <span>
          {item.extension ? item.extension.toUpperCase() : 'FILE'} · {formatSize(item.size)} ·{' '}
          {formatAddedDate(item.addedAt)}
          {!item.exists && ' · unavailable'}
        </span>
      </button>
      <button
        className="file-remove"
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onRemove(item.id)
        }}
        aria-label={`Remove ${item.name}`}
      >
        ×
      </button>
    </motion.li>
  )
}
