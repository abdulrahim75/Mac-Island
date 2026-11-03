import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { BatteryIsland } from './components/BatteryIsland'
import { ClipboardIsland } from './components/ClipboardIsland'
import { MusicPlayer } from './components/MusicPlayer'
import { SoundBars } from './components/SoundBars'
import type { MacIslandBatteryState } from './batteryTypes'
import type { MacIslandSettings } from './settingsTypes'
import type { MacIslandClipboardItem } from './clipboardTypes'
import './island.css'

type ActiveIsland = 'music' | 'battery' | 'clipboard'

const defaultSettings: MacIslandSettings = {
  launchAtLogin: false,
  musicEnabled: true,
  batteryEnabled: true,
  clipboardEnabled: false,
  clipboardHistorySize: 50,
  clipboardPaused: false,
  automaticExpansion: true,
  lowBatteryAlerts: true,
  animationsEnabled: true,
  appearance: 'system'
}

function App(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [batteryState, setBatteryState] = useState<MacIslandBatteryState | null>(null)
  const [clipboardHistory, setClipboardHistory] = useState<MacIslandClipboardItem[]>([])
  const [activeIsland, setActiveIsland] = useState<ActiveIsland>('music')
  const [settings, setSettings] = useState(defaultSettings)
  const reduceMotion = useReducedMotion()
  const previousBatteryState = useRef<MacIslandBatteryState | null>(null)

  useEffect(() => {
    void window.api.getSettings().then((value) => {
      if (value) setSettings(value)
    })

    void window.api.getBatteryState().then((state) => {
      setBatteryState(state)
      previousBatteryState.current = state

      if (
        state &&
        settings.batteryEnabled &&
        (state.percentage < 20 ||
          state.chargingState === 'charging' ||
          state.chargingState === 'full')
      ) {
        setActiveIsland('battery')
      }
    })

    void window.api.getClipboardHistory().then(setClipboardHistory)

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

      if (
        settings.batteryEnabled &&
        settings.automaticExpansion &&
        (adapterChanged || chargingChanged || crossedLowThreshold || crossedBatteryThreshold)
      ) {
        setActiveIsland('battery')
        setExpanded(true)
        void window.api.setExpanded(true)
      }
    })
  }, [settings])

  useEffect(() => {
    return window.api.onSettingsUpdate((nextSettings) => {
      setSettings(nextSettings)

      if (!nextSettings.musicEnabled && activeIsland === 'music') {
        setActiveIsland(nextSettings.batteryEnabled ? 'battery' : 'music')
      }
      if (!nextSettings.batteryEnabled && activeIsland === 'battery') {
        setActiveIsland(nextSettings.musicEnabled ? 'music' : 'music')
      }
      if (!nextSettings.clipboardEnabled && activeIsland === 'clipboard') {
        setActiveIsland(nextSettings.musicEnabled ? 'music' : 'battery')
      }
    })
  }, [activeIsland])

  useEffect(() => window.api.onClipboardUpdate(setClipboardHistory), [])

  const toggleIsland = async (): Promise<void> => {
    const nextState = !expanded

    setExpanded(nextState)
    await window.api.setExpanded(nextState)
  }

  const selectIsland = (island: ActiveIsland): void => {
    if (island === 'music' && !settings.musicEnabled) return
    if (island === 'battery' && !settings.batteryEnabled) return
    if (island === 'clipboard' && !settings.clipboardEnabled) return
    setActiveIsland(island)
  }

  return (
    <main className="island-container">
      <motion.section
        className={`island ${expanded ? 'expanded' : ''} appearance-${settings.appearance}`}
        animate={{
          minHeight: expanded ? 268 : 48,
          borderRadius: expanded ? 27 : 25
        }}
        transition={
          reduceMotion || !settings.animationsEnabled
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
                ) : activeIsland === 'battery' ? (
                  <BatteryIsland state={batteryState} compact />
                ) : (
                  <ClipboardIsland
                    history={clipboardHistory}
                    paused={settings.clipboardPaused}
                    compact
                    onPause={() => undefined}
                    onResume={() => undefined}
                    onCopy={() => undefined}
                    onDelete={() => undefined}
                    onClear={() => undefined}
                  />
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
                ) : activeIsland === 'battery' ? (
                  <BatteryIsland state={batteryState} />
                ) : (
                  <ClipboardIsland
                    history={clipboardHistory}
                    paused={settings.clipboardPaused}
                    onPause={() => void window.api.pauseClipboardMonitoring()}
                    onResume={() => void window.api.resumeClipboardMonitoring()}
                    onCopy={(id) => void window.api.copyClipboardItem(id)}
                    onDelete={(id) => void window.api.deleteClipboardItem(id)}
                    onClear={() => void window.api.clearClipboardHistory()}
                  />
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
                  className={activeIsland === 'clipboard' ? 'active' : ''}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectIsland('clipboard')
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-pressed={activeIsland === 'clipboard'}
                  disabled={!settings.clipboardEnabled}
                >
                  Clipboard
                </button>
                <button
                  type="button"
                  className={activeIsland === 'music' ? 'active' : ''}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectIsland('music')
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-pressed={activeIsland === 'music'}
                  disabled={!settings.musicEnabled}
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
                  disabled={!batteryState || !settings.batteryEnabled}
                >
                  Battery
                </button>
                <button
                  type="button"
                  className="settings-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void window.api.openSettings()
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label="Open Settings"
                >
                  Settings
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
