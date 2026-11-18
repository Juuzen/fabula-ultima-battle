import { useEffect, useRef, useState, type ReactNode } from 'react'

import { STAGE_HEIGHT, STAGE_WIDTH } from './stageScale'

/**
 * The 1920×1080 stage scaled to fit its container's width (16:9 box).
 * Used by the Master's live preview; the Display itself uses <Stage> (viewport-sized).
 */
export function ScaledStage({ children }: { children?: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const update = () => setScale(box.clientWidth / STAGE_WIDTH)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-lg bg-black"
      style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  )
}
