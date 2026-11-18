import { z } from 'zod'

/**
 * Fabula Ultima status effects. In this app they are purely visual markers:
 * they never alter HP or any other value.
 */
export const STATUS_IDS = ['slow', 'dazed', 'weak', 'shaken', 'enraged', 'poisoned'] as const

export const StatusIdSchema = z.enum(STATUS_IDS)
export type StatusId = z.infer<typeof StatusIdSchema>
