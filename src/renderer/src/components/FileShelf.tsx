import { AnimatePresence } from 'motion/react'
import type { MacIslandFileItem } from '../fileTypes'
import { FileItem } from './FileItem'

interface FileShelfProps {
  files: MacIslandFileItem[]
  onOpen: (id: string) => void
  onRemove: (id: string) => void
}

export function FileShelf({ files, onOpen, onRemove }: FileShelfProps): React.JSX.Element {
  return (
    <ul className="file-shelf">
      <AnimatePresence initial={false}>
        {files.map((file) => (
          <FileItem key={file.id} item={file} onOpen={onOpen} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </ul>
  )
}
