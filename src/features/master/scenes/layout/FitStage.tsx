import { useEffect, useRef, useState, type ReactNode } from 'react'

import { computeStageScale, STAGE_HEIGHT, STAGE_WIDTH } from '@/features/display'

/**
 * The 1920×1080 stage fitted inside the available area (letterboxed both ways), with an
 * overlay drawn in screen pixels on top of it. The overlay gets the stage scale, so it can
 * place controls over stage coordinates without being scaled itself.
 */
export function FitStage({
  stage,
  renderOverlay,
}: {
  stage: ReactNode
  renderOverlay: (scale: number) => ReactNode
}) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const update = () => setScale(computeStageScale(area.clientWidth, area.clientHeight))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(area)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={areaRef} className="relative flex h-full w-full items-center justify-center">
      <div
        className="relative overflow-hidden bg-black shadow-[0_10px_30px_rgba(0,0,0,.55)] ring-1 ring-slate-700"
        style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}
      >
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          {stage}
        </div>
        {renderOverlay(scale)}
      </div>
    </div>
  )
}
