import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { BatteryIsland } from './components/BatteryIsland'
import { ClipboardIsland } from './components/ClipboardIsland'
import { FileIsland } from './components/FileIsland'
import { MusicPlayer } from './components/MusicPlayer'
import { SoundBars } from './components/SoundBars'
import type { MacIslandBatteryState } from './batteryTypes'
import type { MacIslandSettings } from './settingsTypes'
import type { MacIslandClipboardItem } from './clipboardTypes'
import type { MacIslandFileItem } from './fileTypes'
import './island.css'

type ActiveIsland = 'idle' | 'music' | 'battery' | 'clipboard' | 'file'

const defaultSettings: MacIslandSettings = {
  launchAtLogin: false,
  musicEnabled: true,
  batteryEnabled: true,
  clipboardEnabled: false,
  clipboardHistorySize: 50,
  clipboardPaused: false,
  fileEnabled: false,
  fileShelfSize: 20,
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
  const [fileShelf, setFileShelf] = useState<MacIslandFileItem[]>([])
  const [activeIsland, setActiveIsland] = useState<ActiveIsland>('idle')
  const [settings, setSettings] = useState(defaultSettings)
  const [dragActive, setDragActive] = useState(false)
  const reduceMotion = useReducedMotion()
  const previousBatteryState = useRef<MacIslandBatteryState | null>(null)
  const settingsRef = useRef(settings)
  const activeIslandRef = useRef(activeIsland)

  useEffect(() => {
    void window.api.getSettings().then((value) => {
      if (value) {
        settingsRef.current = value
        setSettings(value)
        if (
          activeIslandRef.current !== 'idle' &&
          ((activeIslandRef.current === 'music' && !value.musicEnabled) ||
            (activeIslandRef.current === 'battery' && !value.batteryEnabled) ||
            (activeIslandRef.current === 'clipboard' && !value.clipboardEnabled) ||
            (activeIslandRef.current === 'file' && !value.fileEnabled))
        ) {
          setActiveIsland('idle')
        }
      }
    })

    void window.api.getBatteryState().then((state) => {
      setBatteryState(state)
      previousBatteryState.current = state
    })

    void window.api.getClipboardHistory().then(setClipboardHistory)
    void window.api.getFileShelf().then(setFileShelf)

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
        settingsRef.current.batteryEnabled &&
        settingsRef.current.automaticExpansion &&
        (adapterChanged || chargingChanged || crossedLowThreshold || crossedBatteryThreshold)
      ) {
        setActiveIsland('battery')
        setExpanded(true)
        void window.api.setExpanded(true)
      }
    })
  }, [])

  useEffect(() => {
    activeIslandRef.current = activeIsland
  }, [activeIsland])

  useEffect(() => {
    return window.api.onSettingsUpdate((nextSettings) => {
      settingsRef.current = nextSettings
      setSettings(nextSettings)

      if (
        (activeIslandRef.current === 'music' && !nextSettings.musicEnabled) ||
        (activeIslandRef.current === 'battery' && !nextSettings.batteryEnabled) ||
        (activeIslandRef.current === 'clipboard' && !nextSettings.clipboardEnabled) ||
        (activeIslandRef.current === 'file' && !nextSettings.fileEnabled)
      ) {
        setActiveIsland('idle')
      }
    })
  }, [])

  useEffect(() => window.api.onClipboardUpdate(setClipboardHistory), [])
  useEffect(() => window.api.onFileShelfUpdate(setFileShelf), [])

  useEffect(() => {
    const handleDragOver = (event: DragEvent): void => {
      event.preventDefault()
    }

    document.addEventListener('dragover', handleDragOver, true)

    return () => {
      document.removeEventListener('dragover', handleDragOver, true)
    }
  }, [])

  const handleFileDrop = (event: React.DragEvent<HTMLElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    if (!settingsRef.current.fileEnabled) return

    const files = Array.from(event.dataTransfer.files)
    if (files.length === 0) {
      files.push(
        ...Array.from(event.dataTransfer.items)
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
      )
    }

    if (files.length === 0) return

    void window.api
      .addFilesToShelf(files)
      .then((files) => {
        setFileShelf(files)
        setActiveIsland('file')
        setExpanded(true)
        void window.api.setExpanded(true)
      })
      .catch(() => {
        console.error('Unable to add dropped files to the File Island shelf')
      })
  }

  const toggleIsland = async (): Promise<void> => {
    const nextState = !expanded

    setExpanded(nextState)
    await window.api.setExpanded(nextState)
  }

  const selectIsland = (island: ActiveIsland): void => {
    if (island === 'music' && !settings.musicEnabled) return
    if (island === 'battery' && !settings.batteryEnabled) return
    if (island === 'clipboard' && !settings.clipboardEnabled) return
    if (island === 'file' && !settings.fileEnabled) return
    setActiveIsland(island)
  }

  return (
    <main className="island-container">
      <motion.section
        className={`island ${expanded ? 'expanded' : 'compact-notch'} ${
          dragActive ? 'is-dragging-file' : ''
        } appearance-${settings.appearance}`}
        style={
          expanded
            ? undefined
            : {
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))'
              }
        }
        onDragEnter={(event) => {
          event.preventDefault()
          if (settingsRef.current.fileEnabled && event.dataTransfer.types.includes('Files')) {
            setDragActive(true)
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragActive(false)
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (settingsRef.current.fileEnabled) {
            event.dataTransfer.dropEffect = 'copy'
          } else {
            event.dataTransfer.dropEffect = 'none'
          }
        }}
        onDrop={handleFileDrop}
        animate={{
          minHeight: expanded ? 268 : 30
        }}
        transition={
          reduceMotion || !settings.animationsEnabled
            ? { duration: 0 }
            : { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }
        }
      >
        {!expanded && (
          <svg
            className="compact-notch-surface"
            viewBox="0 0 170 30"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M 0 0 H 170 V 28 Q 170 30 168 30 H 2 Q 0 30 0 28 Z" />
          </svg>
        )}
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
                {activeIsland === 'idle' ? null : activeIsland === 'music' ? (
                  <>
                    <span className="music-icon">♫</span>
                    <SoundBars playing={playing} />
                  </>
                ) : activeIsland === 'battery' ? (
                  <BatteryIsland state={batteryState} compact />
                ) : activeIsland === 'clipboard' ? (
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
                ) : (
                  <FileIsland
                    files={fileShelf}
                    compact
                    onOpen={() => undefined}
                    onRemove={() => undefined}
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
                {activeIsland === 'idle' ? null : activeIsland === 'music' ? (
                  <MusicPlayer
                    playing={playing}
                    onToggle={() => setPlaying((current) => !current)}
                  />
                ) : activeIsland === 'battery' ? (
                  <BatteryIsland state={batteryState} />
                ) : activeIsland === 'clipboard' ? (
                  <ClipboardIsland
                    history={clipboardHistory}
                    paused={settings.clipboardPaused}
                    onPause={() => void window.api.pauseClipboardMonitoring()}
                    onResume={() => void window.api.resumeClipboardMonitoring()}
                    onCopy={(id) => void window.api.copyClipboardItem(id)}
                    onDelete={(id) => void window.api.deleteClipboardItem(id)}
                    onClear={() => void window.api.clearClipboardHistory()}
                  />
                ) : (
                  <FileIsland
                    files={fileShelf}
                    onOpen={(id) => void window.api.openShelfFile(id)}
                    onRemove={(id) => void window.api.removeShelfFile(id)}
                    onClear={() => void window.api.clearFileShelf()}
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
                  className={activeIsland === 'file' ? 'active' : ''}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectIsland('file')
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-pressed={activeIsland === 'file'}
                  disabled={!settings.fileEnabled}
                >
                  File
                </button>
                <button
                  type="button"
                  className="settings-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setExpanded(false)
                    void window.api.setExpanded(false)
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
