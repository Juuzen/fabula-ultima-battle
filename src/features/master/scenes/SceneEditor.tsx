import { Image, Minus, Music, Plus, Trash2, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useUnits } from '@/app/library/hooks'
import { library } from '@/app/library/library'
import {
  BattleSceneSchema,
  MAX_ENEMY_COPIES,
  type BattleScene,
  type SceneEnemy,
  type Unit,
} from '@/domain'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'

import { SELECT } from '../action/pickers'
import { useAutosave } from '../library/useAutosave'
import { SaveIndicator } from '../library/SaveIndicator'
import { LoadSceneButton } from './LoadSceneButton'

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

function PartyPicker({
  party,
  selected,
  onChange,
}: {
  party: Unit[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const { t } = useTranslation()
  if (party.length === 0) return <p className="text-sm text-slate-400">{t('scenes.party.none')}</p>
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm text-slate-400">{t('scenes.party.hint')}</legend>
      <div className="flex flex-wrap gap-2">
        {party.map((unit) => {
          const on = selected.includes(unit.id)
          return (
            <label
              key={unit.id}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 ring-1 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-indigo-400 ${
                on ? 'bg-indigo-600/20 ring-indigo-500/70' : 'ring-slate-700 hover:bg-slate-800/70'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-500"
                checked={on}
                onChange={() =>
                  onChange(on ? selected.filter((id) => id !== unit.id) : [...selected, unit.id])
                }
              />
              <span className="font-display font-semibold tracking-wide text-slate-100">
                {unit.name}
              </span>
              <span className="text-sm text-slate-400 tabular-nums">
                {t('display.hp')} {unit.hp}/{unit.maxHp}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function EnemyRow({
  row,
  unit,
  onChange,
  onRemove,
}: {
  row: SceneEnemy
  unit: Unit | undefined
  onChange: (count: number) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const name = unit?.name ?? t('scenes.enemies.missing')
  return (
    <li className="flex items-center gap-3 rounded-md bg-slate-950/60 px-3 py-2 ring-1 ring-slate-800">
      <span className="min-w-0 flex-1">
        <span
          className={`font-display block truncate font-semibold tracking-wide ${
            unit ? 'text-slate-100' : 'text-rose-300'
          }`}
        >
          {name}
        </span>
        {unit && (
          <span className="text-sm text-slate-400 tabular-nums">
            {t('display.hp')} {unit.maxHp}
            {unit.tag && ` · ${unit.tag}`}
          </span>
        )}
      </span>
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={t('scenes.enemies.count', { name })}
      >
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('scenes.enemies.less', { name })}
          disabled={row.count <= 1}
          onClick={() => onChange(row.count - 1)}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span
          className="w-8 text-center text-lg font-semibold text-slate-100 tabular-nums"
          aria-live="polite"
        >
          ×{row.count}
        </span>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('scenes.enemies.more', { name })}
          disabled={row.count >= MAX_ENEMY_COPIES}
          onClick={() => onChange(row.count + 1)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <Button
        size="sm"
        variant="ghost"
        aria-label={t('scenes.enemies.remove', { name })}
        onClick={onRemove}
        className="hover:text-rose-300"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  )
}

function DeleteScene({ scene, onDeleted }: { scene: BattleScene; onDeleted: () => void }) {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <Button variant="ghost" onClick={() => setArmed(true)} className="hover:text-rose-300">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t('scenes.deleteAction')}
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="danger"
        autoFocus
        onClick={() => void library.deleteScene(scene.id).then(onDeleted)}
      >
        {t('library.delete.confirm', { name: scene.name })}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        {t('library.delete.cancel')}
      </Button>
    </div>
  )
}

type Props = {
  scene: BattleScene
  autoFocusName?: boolean
  onDeleted: () => void
  onLoaded: (missing: number) => void
}

/** Editor for one prepared encounter. Saves by itself once it has a name. */
export function SceneEditor({ scene, autoFocusName, onDeleted, onLoaded }: Props) {
  const { t } = useTranslation()
  const party = useUnits('party') ?? []
  const bestiary = useUnits('enemy') ?? []
  const [draft, setDraft] = useState(() => ({
    name: scene.name,
    partyUnitIds: scene.partyUnitIds,
    enemies: scene.enemies,
  }))
  const set = (changes: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...changes }))

  const parsed = BattleSceneSchema.safeParse({ ...scene, ...draft, updatedAt: 0 })
  const status = useAutosave(parsed.success ? parsed.data : null, library.saveScene)
  const nameMissing = draft.name.trim() === ''
  const enemyById = new Map(bestiary.map((u) => [u.id, u]))
  const addable = bestiary.filter((u) => !draft.enemies.some((e) => e.unitId === u.id))
  const enemyCount = draft.enemies.reduce((sum, e) => sum + e.count, 0)

  return (
    <article aria-label={scene.name} className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <TextField
          label={t('scenes.fields.name')}
          placeholder={t('scenes.fields.namePlaceholder')}
          value={draft.name}
          maxLength={60}
          autoFocus={autoFocusName}
          onFocus={(e) => autoFocusName && e.currentTarget.select()}
          onChange={(e) => set({ name: e.target.value })}
          aria-invalid={nameMissing || undefined}
          className="[&_input]:font-display [&_input]:h-12 [&_input]:text-xl [&_input]:font-semibold"
        />
        {nameMissing && <p className="text-xs text-rose-300">{t('scenes.errors.name')}</p>}
        <p className="text-sm text-slate-400 tabular-nums">
          {t('scenes.summary', { party: draft.partyUnitIds.length, enemies: enemyCount })}
        </p>
      </div>

      <Section title={t('scenes.sections.party')}>
        <PartyPicker
          party={party}
          selected={draft.partyUnitIds}
          onChange={(partyUnitIds) => set({ partyUnitIds })}
        />
      </Section>

      <Section title={t('scenes.sections.enemies')}>
        {draft.enemies.length === 0 ? (
          <p className="text-sm text-slate-400">{t('scenes.enemies.none')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {draft.enemies.map((row) => (
              <EnemyRow
                key={row.unitId}
                row={row}
                unit={enemyById.get(row.unitId)}
                onChange={(count) =>
                  set({
                    enemies: draft.enemies.map((e) =>
                      e.unitId === row.unitId ? { ...e, count } : e,
                    ),
                  })
                }
                onRemove={() =>
                  set({ enemies: draft.enemies.filter((e) => e.unitId !== row.unitId) })
                }
              />
            ))}
          </ul>
        )}
        {bestiary.length === 0 ? (
          <p className="text-sm text-slate-400">{t('scenes.enemies.noBestiary')}</p>
        ) : (
          addable.length > 0 && (
            <select
              aria-label={t('scenes.enemies.add')}
              className={`${SELECT} max-w-sm`}
              value=""
              onChange={(e) =>
                e.target.value &&
                set({ enemies: [...draft.enemies, { unitId: e.target.value, count: 1 }] })
              }
            >
              <option value="">{t('scenes.enemies.choose')}</option>
              {addable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.tag ? `${u.name} (${u.tag})` : u.name}
                </option>
              ))}
            </select>
          )
        )}
      </Section>

      <Section title={t('scenes.sections.ambience')}>
        <div className="flex flex-wrap items-end gap-6">
          {[
            { label: t('scenes.ambience.background'), Icon: Image },
            { label: t('scenes.ambience.music'), Icon: Music },
          ].map(({ label, Icon }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className={LABEL}>{label}</span>
              <div className="flex h-20 w-36 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/60 text-slate-400">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
          ))}
          <p className="max-w-xs pb-1 text-sm text-slate-400">{t('scenes.ambience.soon')}</p>
        </div>
      </Section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <div className="flex flex-wrap items-center gap-4">
          {parsed.success && <LoadSceneButton scene={parsed.data} onLoaded={onLoaded} />}
          <SaveIndicator status={status} />
        </div>
        <DeleteScene scene={scene} onDeleted={onDeleted} />
      </footer>
    </article>
  )
}
