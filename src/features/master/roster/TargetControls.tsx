import { Crosshair } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Combatant } from '@/domain'
import { NumberField } from '@/shared/ui/fields'

import { ACTION_FORM_ID } from '../action/ActionBar'
import { useActionDraft } from '../action/actionDraft'
import { BATTLE_UNDO_FIELD } from '../useUndoShortcut'

/**
 * Action mode, on each card: the amount for this target and the target toggle.
 * Typing an amount selects the card as a target; Enter runs the action (the field belongs
 * to the action bar's form).
 */
export function TargetControls({ combatant }: { combatant: Combatant }) {
  const { t } = useTranslation()
  const selected = useActionDraft((s) => combatant.id in s.targets)
  const amount = useActionDraft((s) => s.targets[combatant.id] ?? '')
  const amountHint = useActionDraft((s) => s.amountHint)
  const { toggleTarget, setAmount } = useActionDraft()

  return (
    <div className="flex items-center gap-2">
      <NumberField
        label={t('master.action.amount', { name: combatant.name })}
        hideLabel
        value={amount}
        placeholder={amountHint === null ? undefined : String(amountHint)}
        form={ACTION_FORM_ID}
        onValueChange={(v) => {
          if (!selected && v !== '') toggleTarget(combatant.id)
          setAmount(combatant.id, v)
        }}
        className="w-20"
        {...BATTLE_UNDO_FIELD}
      />
      <button
        type="button"
        aria-pressed={selected}
        aria-label={t('master.combatant.targetOf', { name: combatant.name })}
        onClick={() => toggleTarget(combatant.id)}
        className={`inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
          selected
            ? 'bg-indigo-600/25 text-white ring-indigo-400'
            : 'text-slate-300 ring-slate-600 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Crosshair className="h-4 w-4" aria-hidden="true" />
        {t('master.combatant.target')}
      </button>
    </div>
  )
}
