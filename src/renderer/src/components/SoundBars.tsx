import { motion, useReducedMotion } from 'motion/react'

interface SoundBarsProps {
  playing: boolean
}

const barHeights = [8, 13, 18, 11, 16]

export function SoundBars({ playing }: SoundBarsProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()

  return (
    <div className="sound-bars" aria-hidden="true">
      {barHeights.map((height, index) => (
        <motion.i
          key={index}
          animate={
            playing && !reduceMotion ? { scaleY: [0.45, 1.25, 0.65, 1.05, 0.45] } : { scaleY: 0.55 }
          }
          transition={
            playing && !reduceMotion
              ? {
                  duration: 0.7 + index * 0.08,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.08
                }
              : { duration: 0.2 }
          }
          style={{ height }}
        />
      ))}
    </div>
  )
}
