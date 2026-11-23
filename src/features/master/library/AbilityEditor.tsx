import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { toggleStatusIn } from '@/domain'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField } from '@/shared/ui/fields'

import { EffectSelect, KindPicker, StatusPicker } from '../action/pickers'
import { AssetPicker } from '../assets/AssetPicker'
import type { AbilityDraft } from './unitDraft'

type Props = {
  ability: AbilityDraft
  index: number
  invalid: boolean
  onChange: (next: AbilityDraft) => void
  onRemove: () => void
}

/** One saved ability. MP cost and amount are reminders, shown later as field hints. */
export function AbilityEditor({ ability, index, invalid, onChange, onRemove }: Props) {
  const { t } = useTranslation()
  const set = (changes: Partial<AbilityDraft>) => onChange({ ...ability, ...changes })
  const label = ability.name.trim() || t('library.ability.label', { n: index + 1 })

  return (
    <li
      aria-label={label}
      className={`flex flex-col gap-4 rounded-lg border bg-slate-950/60 p-4 ${
        invalid ? 'border-rose-700' : 'border-slate-800'
      }`}
    >
      <div className="flex items-end gap-3">
        <TextField
          label={t('library.ability.name')}
          value={ability.name}
          maxLength={60}
          onChange={(e) => set({ name: e.target.value })}
          aria-invalid={ability.name.trim() === '' || undefined}
          className="min-w-0 flex-1"
        />
        <Button
          variant="ghost"
          aria-label={`${t('library.ability.remove')}: ${label}`}
          onClick={onRemove}
          className="hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
        <EffectSelect value={ability.effect} onChange={(effect) => set({ effect })} />
        <NumberField
          label={t('library.ability.mpCostHint')}
          value={ability.mpCostHint}
          onValueChange={(mpCostHint) => set({ mpCostHint })}
        />
        <NumberField
          label={t('library.ability.amountHint')}
          value={ability.amountHint}
          onValueChange={(amountHint) => set({ amountHint })}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <KindPicker value={ability.kind} onChange={(kind) => set({ kind })} allowNone />
        <StatusPicker
          value={ability.statuses}
          onToggle={(status) => set({ statuses: toggleStatusIn(ability.statuses, status) })}
        />
      </div>

      <AssetPicker
        role="sfx"
        size="sm"
        label={t('library.ability.sound')}
        value={ability.soundAssetId}
        onChange={(soundAssetId) => set({ soundAssetId })}
      />

      {invalid && ability.name.trim() === '' && (
        <p className="text-xs text-rose-300">{t('library.errors.abilityName')}</p>
      )}
    </li>
  )
}
