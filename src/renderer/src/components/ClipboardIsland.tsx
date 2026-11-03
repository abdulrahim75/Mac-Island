import { motion, useReducedMotion } from 'motion/react'
import type { MacIslandClipboardItem } from '../clipboardTypes'
import { ClipboardHistory } from './ClipboardHistory'

interface ClipboardIslandProps {
  history: MacIslandClipboardItem[]
  paused: boolean
  compact?: boolean
  onPause: () => void
  onResume: () => void
  onCopy: (id: string) => void
  onDelete: (id: string) => void
  onClear: () => void
}

export function ClipboardIsland({
  history,
  paused,
  compact = false,
  onPause,
  onResume,
  onCopy,
  onDelete,
  onClear
}: ClipboardIslandProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  const latest = history[0]

  if (compact) {
    return (
      <motion.div
        className="clipboard-island-compact"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span>▧</span>
        <strong>{latest?.text || 'Clipboard'}</strong>
      </motion.div>
    )
  }

  return (
    <motion.section
      className="clipboard-island"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="clipboard-toolbar">
        <strong>{latest?.text || 'Clipboard history is empty'}</strong>
        <button type="button" onClick={paused ? onResume : onPause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <ClipboardHistory items={history.slice(0, 5)} onCopy={onCopy} onDelete={onDelete} />
      {history.length > 0 && (
        <button className="clipboard-clear" type="button" onClick={onClear}>
          Clear history
        </button>
      )}
    </motion.section>
  )
}
