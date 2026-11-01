import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { BatteryIsland } from './components/BatteryIsland'
import { MusicPlayer } from './components/MusicPlayer'
import { SoundBars } from './components/SoundBars'
import type { MacIslandBatteryState } from './batteryTypes'
import './island.css'

type ActiveIsland = 'music' | 'battery'

function App(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [batteryState, setBatteryState] = useState<MacIslandBatteryState | null>(null)
  const [activeIsland, setActiveIsland] = useState<ActiveIsland>('music')
  const reduceMotion = useReducedMotion()
  const previousBatteryState = useRef<MacIslandBatteryState | null>(null)

  useEffect(() => {
    void window.api.getBatteryState().then((state) => {
      setBatteryState(state)
      previousBatteryState.current = state

      if (
        state &&
        (state.percentage < 20 ||
          state.chargingState === 'charging' ||
          state.chargingState === 'full')
      ) {
        setActiveIsland('battery')
      }
    })

    return window.api.onBatteryUpdate((nextState) => {
      const previousState = previousBatteryState.current
      setBatteryState(nextState)
      previousBatteryState.current = nextState

      if (!previousState) return

      const adapterChanged = previousState.adapterConnected !== nextState.adapterConnected
      const chargingChanged = previousState.chargingState !== nextState.chargingState
      const crossedLowThreshold =
        (previousState.percentage >= 20 && nextState.percentage < 20) ||
        (previousState.percentage < 20 && nextState.percentage >= 20)
      const crossedBatteryThreshold = [20, 50, 80].some(
        (threshold) =>
          (previousState.percentage >= threshold && nextState.percentage < threshold) ||
          (previousState.percentage < threshold && nextState.percentage >= threshold)
      )

      if (adapterChanged || chargingChanged || crossedLowThreshold || crossedBatteryThreshold) {
        setActiveIsland('battery')
        setExpanded(true)
        void window.api.setExpanded(true)
      }
    })
  }, [])

  const toggleIsland = async (): Promise<void> => {
    const nextState = !expanded

    setExpanded(nextState)
    await window.api.setExpanded(nextState)
  }

  const selectIsland = (island: ActiveIsland): void => {
    setActiveIsland(island)
  }

  return (
    <main className="island-container">
      <motion.section
        className={`island ${expanded ? 'expanded' : ''}`}
        animate={{
          minHeight: expanded ? 168 : 48,
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
                {activeIsland === 'music' ? (
                  <>
                    <span className="music-icon">♫</span>
                    <SoundBars playing={playing} />
                  </>
                ) : (
                  <BatteryIsland state={batteryState} compact />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.14 }}
              >
                {activeIsland === 'music' ? (
                  <MusicPlayer
                    playing={playing}
                    onToggle={() => setPlaying((current) => !current)}
                  />
                ) : (
                  <BatteryIsland state={batteryState} />
                )}
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
              <div className="island-feature-switcher">
                <button
                  type="button"
                  className={activeIsland === 'music' ? 'active' : ''}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectIsland('music')
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-pressed={activeIsland === 'music'}
                >
                  Music
                </button>
                <button
                  type="button"
                  className={activeIsland === 'battery' ? 'active' : ''}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectIsland('battery')
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-pressed={activeIsland === 'battery'}
                  disabled={!batteryState}
                >
                  Battery
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </main>
  )
}

export default App
