import { z } from 'zod'

/**
 * Fabula Ultima status effects. In this app they are purely visual markers:
 * they never alter HP or any other value.
 */
export const STATUS_IDS = ['slow', 'dazed', 'weak', 'shaken', 'enraged', 'poisoned'] as const

export const StatusIdSchema = z.enum(STATUS_IDS)
export type StatusId = z.infer<typeof StatusIdSchema>

/**
 * Basic statuses affect one attribute; major ones (Enraged, Poisoned) combine two.
 * The Display draws them differently (circle vs diamond).
 */
export type StatusTier = 'basic' | 'major'

export const STATUS_TIER: Record<StatusId, StatusTier> = {
  slow: 'basic',
  dazed: 'basic',
  weak: 'basic',
  shaken: 'basic',
  enraged: 'major',
  poisoned: 'major',
}

/** Statuses in canonical order (basic first), so icons never shuffle around. */
export function sortStatuses(statuses: readonly StatusId[]): StatusId[] {
  return STATUS_IDS.filter((s) => statuses.includes(s))
}
