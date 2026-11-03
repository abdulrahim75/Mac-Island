import { motion, useReducedMotion } from 'motion/react'
import type { MacIslandFileItem } from '../fileTypes'
import { FileShelf } from './FileShelf'

interface FileIslandProps {
  files: MacIslandFileItem[]
  compact?: boolean
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function FileIsland({
  files,
  compact = false,
  onOpen,
  onRemove,
  onClear
}: FileIslandProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()

  if (compact) {
    return (
      <motion.div className="file-island-compact" animate={{ opacity: 1 }}>
        <span>▱</span>
        <strong>{files.length} {files.length === 1 ? 'file' : 'files'}</strong>
      </motion.div>
    )
  }

  return (
    <motion.section
      className="file-island"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="file-island-header">
        <strong>{files.length} {files.length === 1 ? 'file' : 'files'}</strong>
        <button
          type="button"
          disabled={files.length === 0}
          onClick={(event) => {
            event.stopPropagation()
            onClear()
          }}
        >
          Clear shelf
        </button>
      </div>
      <FileShelf files={files} onOpen={onOpen} onRemove={onRemove} />
      {files.length === 0 && <p className="file-empty">Drop files here</p>}
    </motion.section>
  )
}
