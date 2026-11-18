import type { Side } from '@/domain'

const PALETTE: Record<Side, { from: string; to: string; figure: string; text: string }> = {
  ally: { from: '#2b4c8f', to: '#101a3d', figure: '#4d74c4', text: '#cfe0ff' },
  enemy: { from: '#7a2433', to: '#2a0c12', figure: '#a83a4c', text: '#ffd0c8' },
}

/** Bust silhouette with the initial, shown until a portrait (or sprite) is assigned. */
export function PlaceholderPortrait({ name, side }: { name: string; side: Side }) {
  const p = PALETTE[side]
  const gradientId = `portrait-${side}`
  return (
    <svg
      viewBox="0 0 300 240"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.from} />
          <stop offset="1" stopColor={p.to} />
        </linearGradient>
      </defs>
      <rect width="300" height="240" fill={`url(#${gradientId})`} />
      <circle cx="190" cy="92" r="46" fill={p.figure} opacity=".85" />
      <path d="M100 240c4-62 42-98 90-98s86 36 90 98z" fill={p.figure} opacity=".85" />
      <text
        x="78"
        y="150"
        textAnchor="middle"
        fontSize="96"
        fontFamily="Cinzel, Georgia, serif"
        fontWeight="700"
        fill={p.text}
        opacity=".55"
      >
        {name.trim().charAt(0).toUpperCase()}
      </text>
    </svg>
  )
}
