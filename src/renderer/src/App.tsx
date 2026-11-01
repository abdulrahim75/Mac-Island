import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { MusicPlayer } from './components/MusicPlayer'
import { SoundBars } from './components/SoundBars'
import './island.css'

function App(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(true)
  const reduceMotion = useReducedMotion()

  const toggleIsland = async (): Promise<void> => {
    const nextState = !expanded

    setExpanded(nextState)
    await window.api.setExpanded(nextState)
  }

  return (
    <main className="island-container">
      <motion.section
        className={`island ${expanded ? 'expanded' : ''}`}
        animate={{
          minHeight: expanded ? 150 : 48,
          borderRadius: expanded ? 27 : 25
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }
        }
      >
        <div className="island-header" onClick={toggleIsland}>
          <div className="island-camera">
            <span className="camera-dot" />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {!expanded ? (
              <motion.div
                key="compact"
                className="compact-content"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
              >
                <span className="music-icon">♫</span>
                <SoundBars playing={playing} />
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.14 }}
              >
                <MusicPlayer playing={playing} onToggle={() => setPlaying((current) => !current)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className="island-footer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }
              }
            >
              <span>MAC ISLAND</span>
              <span>YOUR MAC, YOUR WAY.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </main>
  )
}

export default App
