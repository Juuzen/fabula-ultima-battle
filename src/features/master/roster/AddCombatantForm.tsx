import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions } from '@/app/store'
import type { Side } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField } from '@/shared/ui/fields'

/** Quick add: name + max HP (+ optional max MP). Combatants start at full HP/MP. */
export function AddCombatantForm({ side }: { side: Side }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [maxHp, setMaxHp] = useState('')
  const [maxMp, setMaxMp] = useState('')

  const hp = parseWholeNumber(maxHp)
  const mp = maxMp.trim() === '' ? 0 : parseWholeNumber(maxMp)
  const valid = name.trim() !== '' && hp !== null && hp > 0 && mp !== null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const result = dispatch({
      type: 'ADD_COMBATANT',
      combatant: { id: crypto.randomUUID(), name: name.trim(), side, maxHp: hp, maxMp: mp },
    })
    if (result.ok) {
      // Keep the stats: adding several similar foes ("Goblin 1", "Goblin 2"…) is common.
      setName('')
      nameRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t('master.add.title')}
      className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_auto] items-end gap-2"
    >
      <TextField
        ref={nameRef}
        label={t('master.add.name')}
        placeholder={t(
          side === 'ally' ? 'master.add.placeholderAlly' : 'master.add.placeholderEnemy',
        )}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <NumberField label={t('master.add.maxHp')} value={maxHp} onValueChange={setMaxHp} min={1} />
      <NumberField label={t('master.add.maxMp')} value={maxMp} onValueChange={setMaxMp} />
      <Button type="submit" variant="primary" disabled={!valid}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('master.add.submit')}
      </Button>
    </form>
  )
}
