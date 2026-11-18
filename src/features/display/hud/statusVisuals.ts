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

/** Icon and background colour of each status (Tailwind classes). */
export const STATUS_VISUALS: Record<StatusId, { icon: LucideIcon; colour: string }> = {
  slow: { icon: Snail, colour: 'bg-sky-600' },
  dazed: { icon: Sparkles, colour: 'bg-violet-600' },
  weak: { icon: TrendingDown, colour: 'bg-stone-500' },
  shaken: { icon: Ghost, colour: 'bg-indigo-600' },
  enraged: { icon: Flame, colour: 'bg-red-600' },
  poisoned: { icon: Biohazard, colour: 'bg-emerald-600' },
}
