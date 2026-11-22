import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions } from '@/app/store'
import type { Combatant } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField, Toggle } from '@/shared/ui/fields'

type Props = { combatant: Combatant; onDone: () => void }

/** Inline editor; saving is a single (undoable) UPDATE_COMBATANT command. */
export function EditCombatantForm({ combatant, onDone }: Props) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [name, setName] = useState(combatant.name)
  const [maxHp, setMaxHp] = useState(String(combatant.maxHp))
  const [maxMp, setMaxMp] = useState(String(combatant.maxMp))
  const [hp, setHp] = useState(String(combatant.hp))
  const [mp, setMp] = useState(String(combatant.mp))
  const [flipSprite, setFlipSprite] = useState(combatant.flipSprite)

  const parsed = {
    maxHp: parseWholeNumber(maxHp),
    maxMp: parseWholeNumber(maxMp),
    hp: parseWholeNumber(hp),
    mp: parseWholeNumber(mp),
  }
  const valid =
    name.trim() !== '' &&
    parsed.maxHp !== null &&
    parsed.maxHp > 0 &&
    parsed.maxMp !== null &&
    parsed.hp !== null &&
    parsed.mp !== null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const result = dispatch({
      type: 'UPDATE_COMBATANT',
      id: combatant.id,
      changes: {
        name: name.trim(),
        maxHp: parsed.maxHp!,
        maxMp: parsed.maxMp!,
        hp: parsed.hp!,
        mp: parsed.mp!,
        flipSprite,
      },
    })
    if (result.ok) onDone()
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t('master.edit.title', { name: combatant.name })}
      onKeyDown={(e) => {
        // Esc cancels, like the Cancel button.
        if (e.key === 'Escape') {
          e.preventDefault()
          onDone()
        }
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <TextField
          label={t('master.edit.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-2 sm:col-span-5"
          autoFocus
        />
        <NumberField label={t('master.edit.hp')} value={hp} onValueChange={setHp} />
        <NumberField
          label={t('master.edit.maxHp')}
          value={maxHp}
          onValueChange={setMaxHp}
          min={1}
        />
        <NumberField label={t('master.edit.mp')} value={mp} onValueChange={setMp} />
        <NumberField label={t('master.edit.maxMp')} value={maxMp} onValueChange={setMaxMp} />
        <div className="col-span-2 flex items-end pb-2 sm:col-span-1">
          <Toggle label={t('master.edit.flip')} checked={flipSprite} onChange={setFlipSprite} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {t('master.edit.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={!valid}>
          {t('master.edit.save')}
        </Button>
      </div>
    </form>
  )
}
