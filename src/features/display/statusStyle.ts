import type { StatusId } from '@/domain'

/** Visual identity of each status badge (Tailwind classes). */
export const STATUS_STYLE: Record<StatusId, string> = {
  slow: 'bg-sky-700 text-sky-50 ring-sky-300/60',
  dazed: 'bg-violet-700 text-violet-50 ring-violet-300/60',
  weak: 'bg-stone-600 text-stone-50 ring-stone-300/60',
  shaken: 'bg-indigo-800 text-indigo-50 ring-indigo-300/60',
  enraged: 'bg-red-700 text-red-50 ring-red-300/60',
  poisoned: 'bg-emerald-700 text-emerald-50 ring-emerald-300/60',
}
