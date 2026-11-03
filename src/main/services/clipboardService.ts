import { clipboard } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'

export interface ClipboardItem {
  id: string
  text: string
  createdAt: string
}

export class ClipboardService {
  private timer: ReturnType<typeof setInterval> | null = null
  private paused = false
  private lastText = ''
  private history: ClipboardItem[] = []
  private readonly filePath: string
  private maxItems: number

  constructor(
    maxItems: number,
    private readonly onUpdate: (history: ClipboardItem[]) => void
  ) {
    this.maxItems = Math.max(1, Math.min(50, maxItems))
    this.filePath = join(app.getPath('userData'), 'macisland-clipboard.json')
    this.history = this.readHistory().slice(0, maxItems)
  }

  start(): void {
    if (this.timer) return
    this.lastText = ''
    void Promise.resolve(clipboard.readText()).then((text) => {
      this.lastText = text
    })
    this.timer = setInterval(() => {
      void this.poll()
    }, 1000)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    if (!paused) {
      void Promise.resolve(clipboard.readText()).then((text) => {
        this.lastText = text
      })
    }
  }

  isPaused(): boolean {
    return this.paused
  }

  getHistory(): ClipboardItem[] {
    return [...this.history]
  }

  copy(id: string): void {
    const item = this.history.find((entry) => entry.id === id)
    if (!item) return
    clipboard.writeText(item.text)
    this.lastText = item.text
  }

  delete(id: string): void {
    this.history = this.history.filter((entry) => entry.id !== id)
    this.persist()
    this.publish()
  }

  clear(): void {
    this.history = []
    this.persist()
    this.publish()
  }

  setMaxItems(maxItems: number): void {
    this.history = this.history.slice(0, Math.max(1, Math.min(50, maxItems)))
    this.persist()
  }

  private async poll(): Promise<void> {
    if (this.paused) return

    const text = await Promise.resolve(clipboard.readText())
    if (!text || text === this.lastText) return
    this.lastText = text

    this.history = [
      { id: randomUUID(), text, createdAt: new Date().toISOString() },
      ...this.history.filter((entry) => entry.text !== text)
    ].slice(0, Math.max(1, Math.min(50, this.maxItems)))
    this.persist()
    this.publish()
  }

  private publish(): void {
    this.onUpdate(this.getHistory())
  }

  private readHistory(): ClipboardItem[] {
    if (!existsSync(this.filePath)) return []
    try {
      const value = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown
      if (!Array.isArray(value)) return []
      return value.filter(
        (entry): entry is ClipboardItem =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as ClipboardItem).id === 'string' &&
          typeof (entry as ClipboardItem).text === 'string' &&
          typeof (entry as ClipboardItem).createdAt === 'string'
      )
    } catch (error) {
      console.error('Unable to read local clipboard history:', error)
      return []
    }
  }

  private persist(): void {
    const directory = dirname(this.filePath)
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(this.history, null, 2), 'utf8')
  }
}
