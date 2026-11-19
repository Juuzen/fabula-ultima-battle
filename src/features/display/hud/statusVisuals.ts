import {
  Biohazard,
  Flame,
  Ghost,
  Snail,
  Sparkles,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'

import type { StatusId } from '@/domain'

/**
 * Icon and colour of each status (Tailwind classes): `colour` is the badge background,
 * `textColour` a lighter tint of the same hue (readable on the dark outline) for the floating
 * text announcing it ("Avvelenato!").
 */
export const STATUS_VISUALS: Record<
  StatusId,
  { icon: LucideIcon; colour: string; textColour: string }
> = {
  slow: { icon: Snail, colour: 'bg-sky-600', textColour: 'text-sky-300' },
  dazed: { icon: Sparkles, colour: 'bg-violet-600', textColour: 'text-violet-300' },
  weak: { icon: TrendingDown, colour: 'bg-stone-500', textColour: 'text-stone-300' },
  shaken: { icon: Ghost, colour: 'bg-indigo-600', textColour: 'text-indigo-300' },
  enraged: { icon: Flame, colour: 'bg-red-600', textColour: 'text-red-400' },
  poisoned: { icon: Biohazard, colour: 'bg-emerald-600', textColour: 'text-emerald-300' },
}
