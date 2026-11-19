import { motion } from 'motion/react'
import { EFFECT_BOX, type EffectProps } from './effectBox'

const C = EFFECT_BOX / 2

const svgProps = {
  width: EFFECT_BOX,
  height: EFFECT_BOX,
  viewBox: `0 0 ${EFFECT_BOX} ${EFFECT_BOX}`,
  className: 'overflow-visible',
} as const

/** Three quick white streaks across the target. */
export function Slash({ duration }: EffectProps) {
  const streaks = [
    { x1: 80, y1: 70, x2: 320, y2: 300 },
    { x1: 120, y1: 50, x2: 340, y2: 250 },
    { x1: 60, y1: 130, x2: 280, y2: 340 },
  ]
  return (
    <svg {...svgProps}>
      {streaks.map((l, i) => (
        <motion.line
          key={i}
          {...l}
          stroke="white"
          strokeWidth={18 - i * 4}
          strokeLinecap="round"
          style={{
            filter:
              'drop-shadow(0 0 6px rgba(255,255,255,.95)) drop-shadow(0 0 18px rgba(120,190,255,.9))',
          }}
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={{ duration: duration * 0.8, delay: i * duration * 0.1, times: [0, 0.35, 1] }}
        />
      ))}
      <motion.circle
        cx={C}
        cy={C}
        r={90}
        fill="white"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 0.55, 0], scale: [0.3, 1, 1.2] }}
        transition={{ duration: duration * 0.5, delay: duration * 0.3 }}
      />
    </svg>
  )
}

/** Shockwave ring and starburst: a generic physical hit. */
export function Impact({ duration }: EffectProps) {
  const star = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 === 0 ? 150 : 60
    const a = (i / 16) * Math.PI * 2
    return `${C + Math.cos(a) * r},${C + Math.sin(a) * r}`
  }).join(' ')
  return (
    <svg {...svgProps}>
      <motion.polygon
        points={star}
        fill="#fff6d0"
        style={{ originX: '50%', originY: '50%' }}
        initial={{ scale: 0, opacity: 1, rotate: 0 }}
        animate={{ scale: [0, 1, 1.1], opacity: [1, 1, 0], rotate: 20 }}
        transition={{ duration: duration * 0.6 }}
      />
      <motion.circle
        cx={C}
        cy={C}
        r={150}
        fill="none"
        stroke="white"
        strokeWidth={8}
        style={{ originX: '50%', originY: '50%' }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.4, opacity: 0 }}
        transition={{ duration, ease: 'easeOut', delay: duration * 0.2 }}
      />
    </svg>
  )
}

/** Swelling fireballs that rise and fade. */
export function Fire({ duration }: EffectProps) {
  const blobs = [
    { x: 0, y: 10, r: 120, d: 0 },
    { x: -75, y: 35, r: 80, d: 0.08 },
    { x: 75, y: 30, r: 85, d: 0.12 },
    { x: -40, y: -50, r: 72, d: 0.2 },
    { x: 45, y: -60, r: 66, d: 0.26 },
    { x: 0, y: -110, r: 55, d: 0.32 },
  ]
  return (
    <svg {...svgProps}>
      <defs>
        <radialGradient id="fx-fire">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.35" stopColor="#ffd34d" />
          <stop offset="0.7" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#d6261a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {blobs.map((b, i) => (
        <motion.circle
          key={i}
          cx={C + b.x}
          cy={C + b.y}
          r={b.r}
          fill="url(#fx-fire)"
          style={{ originX: '50%', originY: '50%', mixBlendMode: 'screen' }}
          initial={{ scale: 0, opacity: 0, y: 0 }}
          animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0], y: [0, -30, -70] }}
          transition={{ duration: duration * 0.75, delay: b.d * duration, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

/** Ice crystals growing out of the target, then shattering. */
export function Ice({ duration }: EffectProps) {
  const shards = Array.from({ length: 7 }, (_, i) => (i / 7) * 360 + 10)
  return (
    <svg {...svgProps}>
      <motion.circle
        cx={C}
        cy={C}
        r={160}
        fill="rgba(170,225,255,.25)"
        stroke="rgba(220,245,255,.8)"
        strokeWidth={3}
        style={{ originX: '50%', originY: '50%' }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1, 1.15], opacity: [0, 0.9, 0] }}
        transition={{ duration }}
      />
      {shards.map((angle, i) => (
        <motion.polygon
          key={i}
          points={`${C - 14},${C} ${C},${C - 130} ${C + 14},${C} ${C},${C + 20}`}
          fill="#e6f7ff"
          stroke="#7fd0ff"
          strokeWidth={3}
          style={{ originX: `${C}px`, originY: `${C}px`, rotate: angle }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 1.05, 1.3], opacity: [0, 1, 1, 0] }}
          transition={{ duration, times: [0, 0.4, 0.65, 1], delay: i * 0.02 }}
        />
      ))}
    </svg>
  )
}

/** A zig-zag bolt from the sky with a bright flash on the target. */
export function Thunder({ duration, fromSky }: EffectProps) {
  const top = C - fromSky
  const segments = 7
  const points = Array.from({ length: segments + 1 }, (_, i) => {
    const y = top + ((C - top) * i) / segments
    const x = i === 0 || i === segments ? C : C + (i % 2 === 0 ? -28 : 28)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg {...svgProps}>
      {[18, 6].map((width, i) => (
        <motion.polyline
          key={width}
          points={points}
          fill="none"
          stroke={i === 0 ? 'rgba(255,240,120,.55)' : '#ffffff'}
          strokeWidth={width}
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.2, 1, 0] }}
          transition={{ duration: duration * 0.7, times: [0, 0.1, 0.25, 0.4, 1] }}
        />
      ))}
      <motion.circle
        cx={C}
        cy={C}
        r={130}
        fill="#fff9c4"
        style={{ originX: '50%', originY: '50%', mixBlendMode: 'screen' }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.1, 1.3] }}
        transition={{ duration: duration * 0.55, delay: duration * 0.25 }}
      />
    </svg>
  )
}

/** A column of light with rising sparkles (healing, holy). */
export function Light({ duration }: EffectProps) {
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    x: C - 90 + ((i * 53) % 180),
    delay: (i % 6) * 0.08,
  }))
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="fx-light" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff3b0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#b8ffcf" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <motion.rect
        x={C - 70}
        y={-40}
        width={140}
        height={EFFECT_BOX + 40}
        rx={70}
        fill="url(#fx-light)"
        style={{ originX: '50%', originY: '100%', mixBlendMode: 'screen' }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: [0, 1, 1], opacity: [0, 1, 0] }}
        transition={{ duration, times: [0, 0.35, 1] }}
      />
      {sparkles.map((s, i) => (
        <motion.circle
          key={i}
          cx={s.x}
          cy={C + 120}
          r={7}
          fill="#fffbd1"
          style={{ filter: 'drop-shadow(0 0 6px #fff3a0)' }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -240, opacity: [0, 1, 0] }}
          transition={{ duration: duration * 0.8, delay: s.delay * duration, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

/** A dark vortex collapsing onto the target, then bursting. */
export function Shadow({ duration }: EffectProps) {
  return (
    <svg {...svgProps}>
      <defs>
        <radialGradient id="fx-shadow">
          <stop offset="0" stopColor="#0d0014" stopOpacity="1" />
          <stop offset="0.55" stopColor="#4c1580" stopOpacity="0.85" />
          <stop offset="1" stopColor="#2a0040" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle
        cx={C}
        cy={C}
        r={180}
        fill="url(#fx-shadow)"
        style={{ originX: '50%', originY: '50%' }}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: [1.3, 0.75, 1.15, 1.25], opacity: [0, 1, 0.9, 0] }}
        transition={{ duration, times: [0, 0.45, 0.7, 1] }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          cx={C}
          cy={C}
          r={200 - i * 38}
          fill="none"
          stroke={i % 2 === 1 ? '#d8b4fe' : '#9333ea'}
          strokeWidth={9}
          strokeDasharray="36 24"
          style={{ originX: '50%', originY: '50%' }}
          initial={{ scale: 1.25, opacity: 0, rotate: 0 }}
          animate={{
            scale: [1.25, 0.35],
            opacity: [0, 1, 1, 0],
            rotate: i % 2 === 0 ? 260 : -260,
          }}
          transition={{ duration: duration * 0.8, delay: i * 0.05, ease: 'easeIn' }}
        />
      ))}
    </svg>
  )
}
