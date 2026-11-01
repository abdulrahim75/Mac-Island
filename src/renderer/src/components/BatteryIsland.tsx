import { motion, useReducedMotion } from 'motion/react'
import { BatteryIcon } from './BatteryIcon'
import type { MacIslandBatteryState } from '../batteryTypes'

interface BatteryIslandProps {
  state: MacIslandBatteryState | null
  compact?: boolean
}

function formatTimeRemaining(minutes: number | null): string {
  if (minutes === null) return 'Calculating'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes} min left`
  return `${hours} hr ${remainingMinutes} min left`
}

export function BatteryIsland({
  state,
  compact = false
}: BatteryIslandProps): React.JSX.Element | null {
  const reduceMotion = useReducedMotion()
  if (!state) return null

  const charging = state.chargingState === 'charging'

  return (
    <motion.div
      className={`battery-island ${compact ? 'battery-island-compact' : ''}`}
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, x: 5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <BatteryIcon percentage={state.percentage} charging={charging} />
      <span className="battery-percentage">{state.percentage}%</span>
      {!compact && (
        <div className="battery-details">
          <strong>
            {charging ? 'Charging' : state.chargingState === 'full' ? 'Full' : 'Battery'}
          </strong>
          <span>
            {state.adapterConnected
              ? formatTimeRemaining(state.timeRemainingMinutes)
              : 'On battery'}
          </span>
        </div>
      )}
    </motion.div>
  )
}
