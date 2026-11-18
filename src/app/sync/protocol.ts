import { z } from 'zod'

import { BattleStateSchema, type BattleEvent } from '@/domain'

export const SYNC_CHANNEL_NAME = 'fu-battle.sync'
export const PROTOCOL_VERSION = 1

const version = z.literal(PROTOCOL_VERSION)
const displayId = z.string().min(1)

/** Display → Master: "I'm here, send me the current state". */
const HelloSchema = z.object({ v: version, type: z.literal('HELLO'), displayId })
/** Display → Master: periodic "still alive", for the connection indicator. */
const HeartbeatSchema = z.object({ v: version, type: z.literal('HEARTBEAT'), displayId })
/** Display → Master: the window is closing. */
const ByeSchema = z.object({ v: version, type: z.literal('BYE'), displayId })

/**
 * Master → Display: full snapshot of what the players may see, plus the events that led
 * to it (for the choreography of later phases). `session` changes when the Master reloads,
 * `seq` increases within a session so stale or duplicated messages can be ignored.
 */
const StateSchema = z.object({
  v: version,
  type: z.literal('STATE'),
  session: z.string().min(1),
  seq: z.int().min(1),
  state: BattleStateSchema,
  // Events are produced by our own domain and only drive visuals: typed, not re-validated.
  events: z.array(z.custom<BattleEvent>((e) => typeof e === 'object' && e !== null)),
})

export const SyncMessageSchema = z.discriminatedUnion('type', [
  HelloSchema,
  HeartbeatSchema,
  ByeSchema,
  StateSchema,
])

export type SyncMessage = z.infer<typeof SyncMessageSchema>
export type StateMessage = z.infer<typeof StateSchema>

/** Returns the message if it is a valid one of ours, null otherwise (never throws). */
export function parseSyncMessage(data: unknown): SyncMessage | null {
  const parsed = SyncMessageSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}
