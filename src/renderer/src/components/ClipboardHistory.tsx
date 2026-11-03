import { AnimatePresence } from 'motion/react'
import type { MacIslandClipboardItem } from '../clipboardTypes'
import { ClipboardItem } from './ClipboardItem'

interface ClipboardHistoryProps {
  items: MacIslandClipboardItem[]
  onCopy: (id: string) => void
  onDelete: (id: string) => void
}

export function ClipboardHistory({
  items,
  onCopy,
  onDelete
}: ClipboardHistoryProps): React.JSX.Element {
  return (
    <ul className="clipboard-history">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ClipboardItem key={item.id} item={item} onCopy={onCopy} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </ul>
  )
}
