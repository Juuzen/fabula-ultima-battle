import { Droplet, Heart, Minus, Plus, Sword } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions } from '@/app/store'
import { isKnockedOut, type BattleCommand, type Combatant } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField } from '@/shared/ui/fields'

import { BATTLE_UNDO_FIELD } from '../useUndoShortcut'

/**
 * Amount field + one-click actions. The amount is kept after each action,
 * so the GM can apply the same value to several targets or repeat it.
 * Buttons stay quiet (tinted icon, neutral body) so Crisi/KO remain the loudest signals.
 */
export function QuickActions({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [amount, setAmount] = useState('')
  const value = parseWholeNumber(amount)
  const disabled = value === null || value === 0
  // A KO combatant cannot lose more PV: healing is what brings it back.
  const ko = isKnockedOut(combatant)

  const run = (type: 'DAMAGE' | 'HEAL' | 'SPEND_MP' | 'RESTORE_MP') => {
    if (value === null) return
    const command: BattleCommand = { type, id: combatant.id, amount: value }
    dispatch(command)
  }

  return (
    <div className="flex items-center gap-1.5">
      <NumberField
        label={t('master.combatant.amount')}
        hideLabel
        placeholder={t('master.combatant.amount')}
        value={amount}
        onValueChange={setAmount}
        className="w-24"
        {...BATTLE_UNDO_FIELD}
        onKeyDown={(e) => {
          // Enter = damage, Shift+Enter = heal: the two most common actions.
          if (e.key !== 'Enter' || disabled) return
          if (e.shiftKey) run('HEAL')
          else if (!ko) run('DAMAGE')
        }}
      />
      <Button disabled={disabled || ko} onClick={() => run('DAMAGE')}>
        <Sword className="h-4 w-4 text-rose-400" aria-hidden="true" />
        {t('master.combatant.damage')}
      </Button>
      <Button disabled={disabled} onClick={() => run('HEAL')}>
        <Heart className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        {t('master.combatant.heal')}
      </Button>
      {combatant.maxMp > 0 && (
        <div className="inline-flex rounded-md ring-1 ring-slate-600">
          <button
            type="button"
            disabled={disabled}
            onClick={() => run('SPEND_MP')}
            className="inline-flex h-10 items-center gap-0.5 rounded-l-md bg-slate-800 px-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
            <Droplet className="h-4 w-4 text-sky-300" aria-hidden="true" />
            <span className="sr-only">{t('master.combatant.spendMp')}</span>
            <span aria-hidden="true">{t('display.mp')}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => run('RESTORE_MP')}
            className="inline-flex h-10 items-center rounded-r-md border-l border-slate-600 bg-slate-800 px-2 text-sm font-medium text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{t('master.combatant.restoreMp')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
