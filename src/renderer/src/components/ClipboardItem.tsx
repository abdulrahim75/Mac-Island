import { motion, useReducedMotion } from 'motion/react'
import type { MacIslandClipboardItem } from '../clipboardTypes'

interface ClipboardItemProps {
  item: MacIslandClipboardItem
  onCopy: (id: string) => void
  onDelete: (id: string) => void
}

export function ClipboardItem({ item, onCopy, onDelete }: ClipboardItemProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()

  return (
    <motion.li
      className="clipboard-item"
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: 12 }}
    >
      <span className="clipboard-item-text">{item.text}</span>
      <div className="clipboard-item-actions">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCopy(item.id)
          }}
          aria-label="Copy again"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(item.id)
          }}
          aria-label="Delete clipboard item"
        >
          Delete
        </button>
      </div>
    </motion.li>
  )
}
