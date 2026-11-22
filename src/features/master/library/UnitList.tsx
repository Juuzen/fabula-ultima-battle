import { Search } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isInCrisis, isKnockedOut, type Unit, type UnitKind } from '@/domain'

import { SELECT } from '../action/pickers'

type Props = {
  kind: UnitKind
  units: Unit[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function UnitRow({
  unit,
  selected,
  onSelect,
}: {
  unit: Unit
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const party = unit.kind === 'party'
  // Same semantics as the Display: amber = Crisis, red = KO. Only party sheets carry damage.
  const hpTone = !party
    ? undefined
    : isKnockedOut(unit)
      ? 'text-rose-400'
      : isInCrisis(unit)
        ? 'text-amber-300'
        : undefined

  return (
    <li>
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={onSelect}
        className={`flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400 ${
          selected ? 'bg-indigo-600/20 ring-1 ring-indigo-500/60' : 'hover:bg-slate-800/70'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-display truncate text-base font-semibold tracking-wide text-slate-100">
            {unit.name}
          </span>
          {unit.tag && (
            <span className="shrink-0 rounded-sm bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
              {unit.tag}
            </span>
          )}
        </span>
        <span className="flex flex-wrap gap-x-3 text-sm text-slate-400 tabular-nums">
          <span className={hpTone}>
            {t('display.hp')} {party ? `${unit.hp}/${unit.maxHp}` : unit.maxHp}
          </span>
          {unit.maxMp > 0 && (
            <span>
              {t('display.mp')} {party ? `${unit.mp}/${unit.maxMp}` : unit.maxMp}
            </span>
          )}
          {unit.abilities.length > 0 && (
            <span>{t('library.abilitiesCount', { count: unit.abilities.length })}</span>
          )}
        </span>
      </button>
    </li>
  )
}

/** Searchable list of sheets; enemies can also be filtered by category. */
export function UnitList({ kind, units, selectedId, onSelect }: Props) {
  const { t } = useTranslation()
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const tags = [...new Set(units.map((u) => u.tag).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
  const needle = query.trim().toLocaleLowerCase()
  const visible = units.filter(
    (u) => (!needle || u.name.toLocaleLowerCase().includes(needle)) && (!tag || u.tag === tag),
  )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {t('library.search')}
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          placeholder={t('library.search')}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-600 bg-slate-950 pr-3 pl-9 text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
        />
      </div>
      {kind === 'enemy' && tags.length > 0 && (
        <select
          aria-label={t('library.fields.tag')}
          className={SELECT}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">{t('library.allTags')}</option>
          {tags.map((tg) => (
            <option key={tg} value={tg}>
              {tg}
            </option>
          ))}
        </select>
      )}

      {visible.length === 0 ? (
        <p className="px-1 text-sm text-slate-400">{t('library.noMatch')}</p>
      ) : (
        <ul aria-label={t(`library.listLabel.${kind}`)} className="flex flex-col gap-1">
          {visible.map((unit) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              selected={unit.id === selectedId}
              onSelect={() => onSelect(unit.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
