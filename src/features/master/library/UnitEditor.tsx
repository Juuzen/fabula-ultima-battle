import { Image, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { library } from '@/app/library/library'
import type { Unit } from '@/domain'
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

type Props = {
  unit: Unit
  locked: boolean
  autoFocusName?: boolean
  onDeleted: () => void
}

/**
 * Editor for one sheet. Changes save themselves once valid. Locked (read-only) while a
 * battle is running: sheets only change outside the fight.
 */
export function UnitEditor({ unit, locked, autoFocusName, onDeleted }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<UnitDraft>(() => toDraft(unit))
  const party = unit.kind === 'party'

  // PV/PM can change from outside (write-back from the field, Riposo): follow them.
  const [seen, setSeen] = useState({ hp: unit.hp, mp: unit.mp })
  if (seen.hp !== unit.hp || seen.mp !== unit.mp) {
    setSeen({ hp: unit.hp, mp: unit.mp })
    setDraft((d) => ({ ...d, hp: String(unit.hp), mp: String(unit.mp) }))
  }

  const { unit: valid, errors } = fromDraft(draft, unit)
  const status = useAutosave(locked ? null : valid, library.saveUnit)
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
      <fieldset disabled={locked} className="flex min-w-0 flex-col gap-6 disabled:opacity-60">
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
            {party && numberField('hp')}
            {party && numberField('mp')}
          </div>
          {party && <p className="text-sm text-slate-400">{t('library.currentHint')}</p>}
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
                disabled={locked}
                onChange={(flipSprite) => set({ flipSprite })}
              />
              <p className="max-w-xs text-sm text-slate-400">{t('library.art.soon')}</p>
            </div>
          </div>
        </Section>

        <Section title={t('library.sections.notes')}>
          <NotesField value={draft.notes} onChange={(notes) => set({ notes })} />
        </Section>
      </fieldset>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        {locked ? <span /> : <SaveIndicator status={status} />}
        {!locked && <DeleteSheet unit={unit} onDeleted={onDeleted} />}
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
