import { Droplet, Heart, Minus, Plus, Sword } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions } from '@/app/store'
import type { BattleCommand, Combatant } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField } from '@/shared/ui/fields'

/**
 * Amount field + one-click actions. The amount is kept after each action,
 * so the GM can apply the same value to several targets or repeat it.
 */
export function QuickActions({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [amount, setAmount] = useState('')
  const value = parseWholeNumber(amount)
  const disabled = value === null || value === 0

  const run = (type: 'DAMAGE' | 'HEAL' | 'SPEND_MP' | 'RESTORE_MP') => {
    if (value === null) return
    const command: BattleCommand = { type, id: combatant.id, amount: value }
    dispatch(command)
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField
        label={t('master.combatant.amount')}
        hideLabel
        placeholder={t('master.combatant.amount')}
        value={amount}
        onValueChange={setAmount}
        className="w-24"
        onKeyDown={(e) => {
          // Enter = damage, Shift+Enter = heal: the two most common actions.
          if (e.key === 'Enter' && !disabled) run(e.shiftKey ? 'HEAL' : 'DAMAGE')
        }}
      />
      <Button variant="danger" disabled={disabled} onClick={() => run('DAMAGE')}>
        <Sword className="h-4 w-4" aria-hidden="true" />
        {t('master.combatant.damage')}
      </Button>
      <Button variant="success" disabled={disabled} onClick={() => run('HEAL')}>
        <Heart className="h-4 w-4" aria-hidden="true" />
        {t('master.combatant.heal')}
      </Button>
      {combatant.maxMp > 0 && (
        <>
          <Button disabled={disabled} onClick={() => run('SPEND_MP')}>
            <Droplet className="h-4 w-4 text-sky-300" aria-hidden="true" />
            <Minus className="-ml-1 h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{t('master.combatant.spendMp')}</span>
            <span aria-hidden="true">{t('display.mp')}</span>
          </Button>
          <Button disabled={disabled} onClick={() => run('RESTORE_MP')}>
            <Droplet className="h-4 w-4 text-sky-300" aria-hidden="true" />
            <Plus className="-ml-1 h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{t('master.combatant.restoreMp')}</span>
            <span aria-hidden="true">{t('display.mp')}</span>
          </Button>
        </>
      )}
    </div>
  )
}
