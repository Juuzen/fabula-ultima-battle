import type { Side } from '@/domain'

const PALETTE: Record<Side, { body: string; trim: string }> = {
  ally: { body: '#2f5fb3', trim: '#a9c8ff' },
  enemy: { body: '#8f2a3a', trim: '#ffb3a8' },
}

/** Hooded silhouette with the combatant's initial, used until a real sprite is assigned. */
export function PlaceholderSprite({ name, side }: { name: string; side: Side }) {
  const { body, trim } = PALETTE[side]
  const initial = name.trim().charAt(0).toUpperCase()

  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" aria-hidden="true">
      <path
        d="M100 18c-30 0-52 24-52 56 0 14 4 26 10 36-22 14-38 44-42 104 0 8 6 14 14 14h140c8 0 14-6 14-14-4-60-20-90-42-104 6-10 10-22 10-36 0-32-22-56-52-56z"
        fill={body}
        stroke={trim}
        strokeWidth="4"
      />
      <ellipse cx="100" cy="76" rx="30" ry="34" fill="#0b0f1f" opacity=".75" />
      <text
        x="100"
        y="180"
        textAnchor="middle"
        fontSize="64"
        fontFamily="Cinzel, Georgia, serif"
        fontWeight="700"
        fill={trim}
      >
        {initial}
      </text>
    </svg>
  )
}
