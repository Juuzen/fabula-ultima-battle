import { useTranslation } from 'react-i18next'

import { isInCrisis, isKnockedOut, type Combatant } from '@/domain'

type Props = { combatant: Pick<Combatant, 'hp' | 'maxHp'>; size?: 'md' | 'sm' }

/** "KO" or "Crisi" tag for a combatant, or nothing when healthy. Always textual. */
export function StateTag({ combatant, size = 'md' }: Props) {
  const { t } = useTranslation()
  const sizing = size === 'md' ? 'px-2 py-0.5 text-sm' : 'px-1.5 py-px text-xs'

  if (isKnockedOut(combatant)) {
    return (
      <span
        className={`shrink-0 rounded-sm bg-red-600 font-bold tracking-widest text-white uppercase ${sizing}`}
      >
        {t('display.ko')}
      </span>
    )
  }
  if (isInCrisis(combatant)) {
    return (
      <span
        className={`shrink-0 animate-pulse rounded-sm bg-amber-400 font-bold tracking-widest text-amber-950 uppercase ${sizing}`}
      >
        {t('display.crisis')}
      </span>
    )
  }
  return null
}
