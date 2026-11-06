import { app, shell } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname, extname, isAbsolute, join, resolve } from 'path'

export interface ShelfFileRecord {
  id: string
  name: string
  extension: string
  size: number
  addedAt: string
  originalPath: string
  exists: boolean
}

export interface ShelfFileView {
  id: string
  name: string
  extension: string
  size: number
  addedAt: string
  exists: boolean
}

export class FileService {
  private readonly filePath: string
  private files: ShelfFileRecord[] = []

  constructor(private maxItems: number) {
    this.filePath = join(app.getPath('userData'), 'macisland-file-shelf.json')
    this.files = this.readShelf()
    this.syncAvailability()
  }

  getShelf(): ShelfFileView[] {
    return this.files.map(({ id, name, extension, size, addedAt, exists }) => ({
      id,
      name,
      extension,
      size,
      addedAt,
      exists
    }))
  }

  addPaths(paths: string[]): ShelfFileView[] {
    let accepted = 0
    for (const inputPath of paths) {
      if (typeof inputPath !== 'string' || !isAbsolute(inputPath)) continue

      const safePath = resolve(inputPath)
      if (!existsSync(safePath) || this.isDuplicate(safePath)) continue

      try {
        const metadata = statSync(safePath)
        if (!metadata.isFile()) continue

        const name = safePath.split('/').pop() || safePath
        const extension = extname(name).replace(/^\./, '').toLowerCase()
        this.files.unshift({
          id: randomUUID(),
          name,
          extension,
          size: metadata.size,
          addedAt: new Date().toISOString(),
          originalPath: safePath,
          exists: true
        })
        accepted += 1
      } catch (error) {
        console.error('Unable to inspect a dropped file:', error)
      }
    }

    this.files = this.files.slice(0, this.maxItems)
    this.persist()
    console.info(`File Island accepted ${accepted} file(s)`)
    return this.getShelf()
  }

  open(id: string): boolean {
    const file = this.files.find((entry) => entry.id === id)
    if (!file || !existsSync(file.originalPath)) return false

    void shell.openPath(file.originalPath)
    return true
  }

  remove(id: string): ShelfFileView[] {
    this.files = this.files.filter((entry) => entry.id !== id)
    this.persist()
    return this.getShelf()
  }

  clear(): ShelfFileView[] {
    this.files = []
    this.persist()
    return this.getShelf()
  }

  setMaxItems(maxItems: number): void {
    this.maxItems = Math.max(1, Math.min(50, maxItems))
    this.files = this.files.slice(0, this.maxItems)
    this.persist()
  }

  syncAvailability(): void {
    this.files = this.files.map((file) => ({
      ...file,
      exists: existsSync(file.originalPath)
    }))
    this.persist()
  }

  private isDuplicate(path: string): boolean {
    return this.files.some((file) => file.originalPath === path)
  }

  private readShelf(): ShelfFileRecord[] {
    if (!existsSync(this.filePath)) return []

    try {
      const value = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown
      if (!Array.isArray(value)) return []
      return value.filter(
        (entry): entry is ShelfFileRecord =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as ShelfFileRecord).id === 'string' &&
          typeof (entry as ShelfFileRecord).name === 'string' &&
          typeof (entry as ShelfFileRecord).originalPath === 'string'
      )
    } catch (error) {
      console.error('Unable to read local File Island shelf:', error)
      return []
    }
  }

  private persist(): void {
    const directory = dirname(this.filePath)
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(this.files, null, 2), 'utf8')
  }
}
