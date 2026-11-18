import { useEffect, useState, type ReactNode } from 'react'

import { computeStageScale, STAGE_HEIGHT, STAGE_WIDTH } from './stageScale'

function useViewportScale(): number {
  const [scale, setScale] = useState(() => computeStageScale(window.innerWidth, window.innerHeight))

  useEffect(() => {
    const onResize = () => setScale(computeStageScale(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return scale
}

type StageProps = { children?: ReactNode }

/**
 * Fixed 1920×1080 stage, scaled uniformly to the window and centred on a black letterbox.
 * Children are laid out in logical stage pixels.
 */
export function Stage({ children }: StageProps) {
  const scale = useViewportScale()

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        data-testid="battle-stage"
        className="relative shrink-0 overflow-hidden"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
