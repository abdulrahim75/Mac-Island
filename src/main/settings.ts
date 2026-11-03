import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

export interface MacIslandSettings {
  launchAtLogin: boolean
  musicEnabled: boolean
  batteryEnabled: boolean
  clipboardEnabled: boolean
  clipboardHistorySize: number
  clipboardPaused: boolean
  fileEnabled: boolean
  fileShelfSize: number
  automaticExpansion: boolean
  lowBatteryAlerts: boolean
  animationsEnabled: boolean
  appearance: 'system' | 'dark' | 'light'
}

export const defaultSettings: MacIslandSettings = {
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

export class SettingsStore {
  private readonly filePath: string
  private settings: MacIslandSettings

  constructor() {
    this.filePath = join(app.getPath('userData'), 'macisland-settings.json')
    this.settings = this.read()
  }

  get(): MacIslandSettings {
    return { ...this.settings }
  }

  update(patch: Partial<MacIslandSettings>): MacIslandSettings {
    const next = {
      ...this.settings,
      ...patch
    }

    this.settings = this.validate(next)
    if (this.settings.launchAtLogin !== this.readLoginAtStartup()) {
      this.applyLoginAtStartup(this.settings.launchAtLogin)
    }
    this.write()
    return this.get()
  }

  private read(): MacIslandSettings {
    if (!existsSync(this.filePath)) return { ...defaultSettings }

    try {
      return this.validate(JSON.parse(readFileSync(this.filePath, 'utf8')) as MacIslandSettings)
    } catch (error) {
      console.error('Unable to read MacIsland settings:', error)
      return { ...defaultSettings }
    }
  }

  private validate(value: MacIslandSettings): MacIslandSettings {
    const appearance = ['system', 'dark', 'light'].includes(value.appearance)
      ? value.appearance
      : defaultSettings.appearance

    return {
      launchAtLogin: Boolean(value.launchAtLogin),
      musicEnabled: Boolean(value.musicEnabled),
      batteryEnabled: Boolean(value.batteryEnabled),
      clipboardEnabled: Boolean(value.clipboardEnabled),
      clipboardHistorySize: Math.max(1, Math.min(50, Number(value.clipboardHistorySize) || 50)),
      clipboardPaused: Boolean(value.clipboardPaused),
      fileEnabled: Boolean(value.fileEnabled),
      fileShelfSize: Math.max(1, Math.min(50, Number(value.fileShelfSize) || 20)),
      automaticExpansion: Boolean(value.automaticExpansion),
      lowBatteryAlerts: Boolean(value.lowBatteryAlerts),
      animationsEnabled: Boolean(value.animationsEnabled),
      appearance
    }
  }

  private write(): void {
    const directory = dirname(this.filePath)
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8')
  }

  private readLoginAtStartup(): boolean {
    return app.getLoginItemSettings().openAtLogin
  }

  private applyLoginAtStartup(enabled: boolean): void {
    app.setLoginItemSettings({
      openAtLogin: enabled
    })
  }
}
