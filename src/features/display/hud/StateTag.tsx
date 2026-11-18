import { useTranslation } from 'react-i18next'

import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'

/** "KO" or "Crisi" tag for a combatant, or nothing when healthy. */
export function StateTag({ combatant }: { combatant: Pick<Combatant, 'hp' | 'maxHp'> }) {
  const { t } = useTranslation()
  if (isKnockedOut(combatant)) {
    return (
      <span className="rounded-sm bg-red-600 px-2 py-0.5 text-sm font-bold tracking-widest text-white uppercase">
        {t('display.ko')}
      </span>
    )
  }
  if (isInCrisis(combatant)) {
    return (
      <span className="animate-pulse rounded-sm bg-amber-400 px-2 py-0.5 text-sm font-bold tracking-widest text-amber-950 uppercase">
        {t('display.crisis')}
      </span>
    )
  }
  return null
}
