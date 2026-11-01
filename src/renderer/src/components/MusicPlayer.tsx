import { motion, useReducedMotion } from 'motion/react'

interface MusicPlayerProps {
  playing: boolean
  onToggle: () => void
}

export function MusicPlayer({ playing, onToggle }: MusicPlayerProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="expanded-content"
      initial={{ y: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : 0.98 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 330, damping: 26 }}
    >
      <motion.div
        className="album-art"
        animate={playing && !reduceMotion ? { rotate: [0, 2, 0, -2, 0] } : { rotate: 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        ♫
      </motion.div>

      <div className="track-info">
        <strong>Now Playing</strong>
        <span>Your favorite music</span>
      </div>

      <div className="music-controls">
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          whileHover={reduceMotion ? undefined : { scale: 1.06 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        >
          {playing ? 'Ⅱ' : '▶'}
        </motion.button>
      </div>
    </motion.div>
  )
}
