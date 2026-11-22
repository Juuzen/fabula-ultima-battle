import { Image, Plus, Swords, Trash2 } from 'lucide-react'
import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'

import { library } from '@/app/library/library'
import { battleStore, useBattleStore } from '@/app/store'
import type { Combatant, Unit } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'
import { Button } from '@/shared/ui/Button'
import { NumberField, TextField, Toggle } from '@/shared/ui/fields'

import { AbilityEditor } from './AbilityEditor'
import { fromDraft, newAbilityDraft, toDraft, type DraftField, type UnitDraft } from './unitDraft'
import { SaveIndicator } from './SaveIndicator'
import { useAutosave } from './useAutosave'

const LABEL = 'text-xs font-medium tracking-wide text-slate-400 uppercase'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-slate-800 pt-6">
      <h3 id={id} className="font-display text-lg font-semibold tracking-wide text-slate-100">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ArtSlot({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/60 text-slate-400">
        <Image className="h-7 w-7" aria-hidden="true" />
      </div>
    </div>
  )
}

function DeleteSheet({ unit, onDeleted }: { unit: Unit; onDeleted: () => void }) {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  const onField = useBattleStore((s) => s.battle.combatants.some((c) => c.unitId === unit.id))
  if (onField) {
    return <p className="text-sm text-slate-400">{t('library.deleteOnField')}</p>
  }
  if (!armed) {
    return (
      <Button variant="ghost" onClick={() => setArmed(true)} className="hover:text-rose-300">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t('library.delete.action')}
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="danger"
        autoFocus
        title={t('library.delete.hint')}
        onClick={() => {
          void library.deleteUnit(unit.id).then(onDeleted)
        }}
      >
        {t('library.delete.confirm', { name: unit.name })}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        {t('library.delete.cancel')}
      </Button>
    </div>
  )
}

/** A party member's live PV/PM while on the field: changed from the cockpit, not here. */
function LiveValue({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      <span className="flex h-10 items-center rounded-md bg-slate-900 px-3 text-slate-200 tabular-nums ring-1 ring-slate-700">
        {value} / {max}
      </span>
    </div>
  )
}

/** Keeps a number typed as text within a maximum typed as text (when both parse). */
function clampText(value: string, max: string): string {
  const v = parseWholeNumber(value)
  const m = parseWholeNumber(max)
  return v !== null && m !== null && v > m ? String(m) : value
}

/**
 * Saves the sheet, then has every combatant deployed from it follow (name, maximums, art):
 * the library stays editable during a battle and the field never lags behind.
 */
function useSaveAndSync(initialName: string) {
  const synced = useRef(initialName)
  return useCallback(async (next: Unit) => {
    const saved = await library.saveUnit(next)
    const { battle, dispatch } = battleStore.getState()
    if (battle.combatants.some((c) => c.unitId === saved.id)) {
      dispatch({
        type: 'SYNC_UNIT',
        unitId: saved.id,
        previousName: synced.current,
        sheet: {
          name: saved.name,
          maxHp: saved.maxHp,
          maxMp: saved.maxMp,
          spriteAssetId: saved.spriteAssetId,
          portraitAssetId: saved.portraitAssetId,
          flipSprite: saved.flipSprite,
        },
      })
    }
    synced.current = saved.name
    return saved
  }, [])
}

type Props = {
  unit: Unit
  autoFocusName?: boolean
  onDeleted: () => void
}

/**
 * Editor for one sheet. Changes save themselves once valid, also during a battle: whoever
 * is on the field from this sheet follows at once. A party member on the field shows live
 * PV/PM here (they change from the cockpit and come back when the character leaves).
 */
export function UnitEditor({ unit, autoFocusName, onDeleted }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<UnitDraft>(() => toDraft(unit))
  const party = unit.kind === 'party'
  const deployed = useBattleStore(
    useShallow((s) => s.battle.combatants.filter((c) => c.unitId === unit.id)),
  )
  const live: Combatant | undefined = party ? deployed[0] : undefined
  const saveAndSync = useSaveAndSync(unit.name)

  // PV/PM can change from outside (write-back from the field, Riposo): follow them.
  const [seen, setSeen] = useState({ hp: unit.hp, mp: unit.mp })
  if (seen.hp !== unit.hp || seen.mp !== unit.mp) {
    setSeen({ hp: unit.hp, mp: unit.mp })
    setDraft((d) => ({ ...d, hp: String(unit.hp), mp: String(unit.mp) }))
  }

  // On the field the current PV/PM are not edited here: only kept within the new maximums.
  const effective = live
    ? { ...draft, hp: clampText(draft.hp, draft.maxHp), mp: clampText(draft.mp, draft.maxMp) }
    : draft
  const { unit: valid, errors } = fromDraft(effective, unit)
  const status = useAutosave(valid, saveAndSync)
  const set = (changes: Partial<UnitDraft>) => setDraft((d) => ({ ...d, ...changes }))

  const fieldError = (field: DraftField) => {
    const code = errors.fields[field]
    return code ? t(`library.errors.${code}`) : undefined
  }
  const numberField = (field: DraftField & ('maxHp' | 'maxMp' | 'hp' | 'mp')) => (
    <div className="flex flex-col gap-1">
      <NumberField
        label={t(`library.fields.${field}`)}
        value={draft[field]}
        min={field === 'maxHp' ? 1 : 0}
        onValueChange={(value) => set({ [field]: value })}
        aria-invalid={fieldError(field) ? true : undefined}
      />
      {fieldError(field) && <p className="text-xs text-rose-300">{fieldError(field)}</p>}
    </div>
  )

  return (
    <article aria-label={unit.name} className="flex min-w-0 flex-col gap-6">
      {deployed.length > 0 && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200"
        >
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          {t('library.syncHint')}
        </p>
      )}
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="flex flex-col gap-1">
            <TextField
              label={t('library.fields.name')}
              value={draft.name}
              maxLength={60}
              autoFocus={autoFocusName}
              onFocus={(e) => autoFocusName && e.currentTarget.select()}
              onChange={(e) => set({ name: e.target.value })}
              aria-invalid={fieldError('name') ? true : undefined}
              className="[&_input]:font-display [&_input]:h-12 [&_input]:text-xl [&_input]:font-semibold"
            />
            {fieldError('name') && <p className="text-xs text-rose-300">{fieldError('name')}</p>}
          </div>
          <TextField
            label={t('library.fields.tag')}
            placeholder={t('library.fields.tagPlaceholder')}
            value={draft.tag}
            maxLength={30}
            onChange={(e) => set({ tag: e.target.value })}
            className="sm:self-start [&_input]:h-12"
          />
        </div>

        <Section title={t('library.sections.stats')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {numberField('maxHp')}
            {numberField('maxMp')}
            {party && !live && numberField('hp')}
            {party && !live && numberField('mp')}
            {live && <LiveValue label={t('library.fields.hp')} value={live.hp} max={live.maxHp} />}
            {live && <LiveValue label={t('library.fields.mp')} value={live.mp} max={live.maxMp} />}
          </div>
          {party && (
            <p className="text-sm text-slate-400">
              {t(live ? 'library.onField' : 'library.currentHint')}
            </p>
          )}
        </Section>

        <Section title={t('library.sections.abilities')}>
          <p className="max-w-prose text-sm text-slate-400">
            {draft.abilities.length === 0
              ? t('library.ability.none')
              : t('library.ability.hintNote')}
          </p>
          {draft.abilities.length > 0 && (
            <ul className="flex flex-col gap-3">
              {draft.abilities.map((ability, index) => (
                <AbilityEditor
                  key={ability.id}
                  ability={ability}
                  index={index}
                  invalid={errors.abilities.includes(ability.id)}
                  onChange={(next) =>
                    set({ abilities: draft.abilities.map((a) => (a.id === next.id ? next : a)) })
                  }
                  onRemove={() =>
                    set({ abilities: draft.abilities.filter((a) => a.id !== ability.id) })
                  }
                />
              ))}
            </ul>
          )}
          <Button
            className="self-start"
            onClick={() =>
              set({
                abilities: [
                  ...draft.abilities,
                  newAbilityDraft(crypto.randomUUID(), t('library.ability.newName')),
                ],
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('library.ability.add')}
          </Button>
        </Section>

        <Section title={t('library.sections.look')}>
          <div className="flex flex-wrap items-end gap-6">
            <ArtSlot label={t('library.art.sprite')} />
            <ArtSlot label={t('library.art.portrait')} />
            <div className="flex flex-col gap-3 pb-1">
              <Toggle
                label={t('library.fields.flip')}
                checked={draft.flipSprite}
                onChange={(flipSprite) => set({ flipSprite })}
              />
              <p className="max-w-xs text-sm text-slate-400">{t('library.art.soon')}</p>
            </div>
          </div>
        </Section>

        <Section title={t('library.sections.notes')}>
          <NotesField value={draft.notes} onChange={(notes) => set({ notes })} />
        </Section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <SaveIndicator status={status} />
        <DeleteSheet unit={unit} onDeleted={onDeleted} />
      </footer>
    </article>
  )
}

function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {t('library.fields.notes')}
      </label>
      <textarea
        id={id}
        rows={5}
        maxLength={2000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-hint`}
        className="w-full max-w-prose resize-y rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
      />
      <p id={`${id}-hint`} className="text-sm text-slate-400">
        {t('library.fields.notesHint')}
      </p>
    </div>
  )
}
