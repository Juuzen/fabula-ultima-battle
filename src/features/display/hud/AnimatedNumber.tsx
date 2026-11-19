import { animate, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'

/**
 * A number that counts towards its new value (e.g. HP 48 → 36) instead of jumping.
 * The text is written straight to the DOM node, so counting never re-renders React.
 */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef<number | null>(null)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const from = shown.current
    shown.current = value
    if (from === null || from === value || reduceMotion) {
      node.textContent = String(value)
      return
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, reduceMotion])

  return <span ref={ref} className={className} />
}
