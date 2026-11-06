/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { MacIslandSettings } from './settingsTypes'
import './settings.css'

const defaults: MacIslandSettings = {
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

function Toggle({
  label,
  checked,
  onChange,
  disabled = false
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <label className={`settings-row ${disabled ? 'disabled' : ''}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function Settings(): React.JSX.Element {
  const [settings, setSettings] = useState(defaults)

  useEffect(() => {
    void window.api.getSettings().then((value) => {
      if (value) setSettings(value)
    })
    return window.api.onSettingsUpdate(setSettings)
  }, [])

  const update = (patch: Partial<MacIslandSettings>): void => {
    setSettings((current) => ({ ...current, ...patch }))
    void window.api.setSettings(patch)
  }

  return (
    <main className={`settings-app appearance-${settings.appearance}`}>
      <header>
        <h1>Settings</h1>
        <p>Customize MacIsland</p>
      </header>

      <section>
        <h2>General</h2>
        <Toggle
          label="Launch at login"
          checked={settings.launchAtLogin}
          onChange={(launchAtLogin) => update({ launchAtLogin })}
        />
        <Toggle
          label="Automatic island expansion"
          checked={settings.automaticExpansion}
          onChange={(automaticExpansion) => update({ automaticExpansion })}
        />
        <Toggle
          label="Enable animations"
          checked={settings.animationsEnabled}
          onChange={(animationsEnabled) => update({ animationsEnabled })}
        />
        <label className="settings-row">
          <span>Appearance</span>
          <select
            value={settings.appearance}
            onChange={(event) =>
              update({ appearance: event.target.value as MacIslandSettings['appearance'] })
            }
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </section>

      <section>
        <h2>Islands</h2>
        <Toggle
          label="Music Island"
          checked={settings.musicEnabled}
          onChange={(musicEnabled) => update({ musicEnabled })}
        />
        <Toggle
          label="Battery Island"
          checked={settings.batteryEnabled}
          onChange={(batteryEnabled) => update({ batteryEnabled })}
        />
        <Toggle
          label="Low battery alerts"
          checked={settings.lowBatteryAlerts}
          onChange={(lowBatteryAlerts) => update({ lowBatteryAlerts })}
        />
        <Toggle
          label="Clipboard Island"
          checked={settings.clipboardEnabled}
          onChange={(clipboardEnabled) => update({ clipboardEnabled })}
        />
        <Toggle
          label="Pause clipboard monitoring"
          checked={settings.clipboardPaused}
          disabled={!settings.clipboardEnabled}
          onChange={(clipboardPaused) => update({ clipboardPaused })}
        />
        <label className="settings-row">
          <span>Maximum history size</span>
          <select
            value={settings.clipboardHistorySize}
            disabled={!settings.clipboardEnabled}
            onChange={(event) =>
              update({ clipboardHistorySize: Math.min(50, Number(event.target.value)) })
            }
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          className="settings-clear-button"
          type="button"
          disabled={!settings.clipboardEnabled}
          onClick={() => void window.api.clearClipboardHistory()}
        >
          Clear clipboard history
        </button>
        <Toggle
          label="File Island"
          checked={settings.fileEnabled}
          onChange={(fileEnabled) => update({ fileEnabled })}
        />
        <label className="settings-row">
          <span>File shelf maximum</span>
          <select
            value={settings.fileShelfSize}
            disabled={!settings.fileEnabled}
            onChange={(event) =>
              update({ fileShelfSize: Math.min(50, Number(event.target.value)) })
            }
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          className="settings-clear-button"
          type="button"
          disabled={!settings.fileEnabled}
          onClick={() => void window.api.clearFileShelf()}
        >
          Clear file shelf
        </button>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Settings />
  </StrictMode>
)
