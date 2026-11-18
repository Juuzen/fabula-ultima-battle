import { useTranslation } from 'react-i18next'

import type { Combatant } from '@/domain'

import { partySlotWidth, SLOT_GAP } from './partyLayout'
import { PartySlot } from './PartySlot'

/** Bottom-centre party panel: one slot per ally, always horizontally balanced. */
export function PartyPanel({ allies }: { allies: Combatant[] }) {
  const { t } = useTranslation()
  const width = partySlotWidth(allies.length)

  return (
    <section
      aria-label={t('display.party')}
      className="jrpg-window mx-auto flex w-fit px-3! py-3!"
      style={{ gap: SLOT_GAP }}
    >
      {allies.map((c) => (
        <PartySlot key={c.id} combatant={c} width={width} />
      ))}
    </section>
  )
}
