import { execFile } from 'child_process'

export interface BatteryState {
  percentage: number
  chargingState: 'charging' | 'discharging' | 'full' | 'unknown'
  adapterConnected: boolean
  timeRemainingMinutes: number | null
}

function parseTimeRemaining(output: string): number | null {
  const match = output.match(/(\d+):(\d{2})\s+remaining/i)
  if (!match) return null

  return Number(match[1]) * 60 + Number(match[2])
}

export function parsePmsetBattery(output: string): BatteryState | null {
  const batteryLine = output.match(/^.*InternalBattery-\d.*$/m)?.[0]
  if (!batteryLine) return null

  const percentageMatch = batteryLine.match(/(\d{1,3})%/)
  if (!percentageMatch) return null

  const percentage = Number(percentageMatch[1])
  const lowerLine = batteryLine.toLowerCase()
  let chargingState: BatteryState['chargingState'] = 'unknown'

  if (lowerLine.includes('charging')) {
    chargingState = 'charging'
  } else if (lowerLine.includes('charged')) {
    chargingState = 'full'
  } else if (lowerLine.includes('discharging')) {
    chargingState = 'discharging'
  }

  const adapterConnected =
    /^Now drawing from ['"]AC Power['"]/im.test(output) ||
    chargingState === 'charging' ||
    chargingState === 'full'

  return {
    percentage: Math.min(100, Math.max(0, percentage)),
    chargingState,
    adapterConnected,
    timeRemainingMinutes: parseTimeRemaining(output)
  }
}

export class BatteryService {
  private timer: ReturnType<typeof setInterval> | null = null
  private refreshInProgress = false
  private currentState: BatteryState | null = null

  constructor(private readonly onUpdate: (state: BatteryState) => void) {}

  getState(): BatteryState | null {
    return this.currentState
  }

  start(): void {
    if (this.timer) return

    void this.refresh()
    this.timer = setInterval(() => {
      void this.refresh()
    }, 30_000)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async refresh(): Promise<void> {
    if (this.refreshInProgress) return
    this.refreshInProgress = true

    try {
      const output = await new Promise<string>((resolve, reject) => {
        execFile('pmset', ['-g', 'batt'], { timeout: 10_000 }, (error, stdout) => {
          if (error) {
            reject(error)
            return
          }
          resolve(stdout)
        })
      })

      const state = parsePmsetBattery(output)
      if (!state) return

      this.currentState = state
      this.onUpdate(state)
    } catch (error) {
      console.error('Unable to read Mac battery state:', error)
    } finally {
      this.refreshInProgress = false
    }
  }
}
