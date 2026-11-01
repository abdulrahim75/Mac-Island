import { motion, useReducedMotion } from 'motion/react'

interface BatteryIconProps {
  percentage: number
  charging: boolean
}

export function BatteryIcon({ percentage, charging }: BatteryIconProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  const fill = Math.max(0, Math.min(100, percentage))

  return (
    <div className="battery-icon" aria-label={`${percentage}%${charging ? ', charging' : ''}`}>
      <motion.span
        className={`battery-icon-fill ${fill < 20 ? 'battery-icon-low' : ''}`}
        animate={{ width: `${fill}%` }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }
        }
      />
      {charging && (
        <motion.span
          className="battery-icon-bolt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          +
        </motion.span>
      )}
    </div>
  )
}
