import { BedDouble, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { useUnits } from '@/app/library/hooks'
import { library } from '@/app/library/library'
import { useBattleStore } from '@/app/store'
import { createUnit, type UnitKind } from '@/domain'
import { Button } from '@/shared/ui/Button'

import { UnitEditor } from './UnitEditor'
import { UnitList } from './UnitList'

/** "Riposo": back to full PV/PM for the whole party, with a short confirmation. */
function RestButton({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()
  const [done, setDone] = useState(false)
  return (
    <div className="flex items-center gap-3">
      {done && (
        <p role="status" className="text-sm text-emerald-300">
          {t('library.rest.done')}
        </p>
      )}
      <Button
        disabled={disabled}
        title={t('library.rest.hint')}
        onClick={() => {
          void library.restParty().then(() => setDone(true))
        }}
      >
        <BedDouble className="h-4 w-4" aria-hidden="true" />
        {t('library.rest.action')}
      </Button>
    </div>
  )
}

/**
 * Preparation library for one kind of sheet: Party (characters) or Enemies (bestiary).
 * List on the left, the selected sheet's editor on the right.
 */
export function UnitLibraryPage({ kind }: { kind: UnitKind }) {
  const { t } = useTranslation()
  const units = useUnits(kind)
  // Riposo would refill sheets the field is about to overwrite: not during a fight.
  const fighting = useBattleStore((s) => s.battle.phase === 'active')
  const [params, setParams] = useSearchParams()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const title = t(kind === 'party' ? 'master.nav.party' : 'master.nav.enemies')

  const requested = params.get('id')
  const selected = units?.find((u) => u.id === requested) ?? units?.[0] ?? null
  const select = (id: string | null) =>
    setParams(id ? { id } : {}, { replace: true, preventScrollReset: true })

  const create = async () => {
    const unit = await library.saveUnit(
      createUnit({ id: crypto.randomUUID(), kind, name: t(`library.create.${kind}`), maxHp: 10 }),
    )
    setCreatedId(unit.id)
    select(unit.id)
  }

  return (
    <section aria-labelledby="library-title" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 id="library-title" className="font-display text-3xl font-bold tracking-wide">
            {title}
          </h2>
          {units && <span className="text-sm text-slate-400 tabular-nums">{units.length}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {kind === 'party' && <RestButton disabled={fighting || !units?.length} />}
          <Button variant="primary" onClick={() => void create()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t(`library.create.${kind}`)}
          </Button>
        </div>
      </header>

      {units === undefined ? null : units.length === 0 ? (
        <p className="max-w-prose text-base text-slate-300">{t(`library.empty.${kind}`)}</p>
      ) : (
        <div className="grid items-start gap-8 @4xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="@4xl:sticky @4xl:top-22">
            <UnitList
              kind={kind}
              units={units}
              selectedId={selected?.id ?? null}
              onSelect={select}
            />
          </div>
          {selected ? (
            <UnitEditor
              key={selected.id}
              unit={selected}
              autoFocusName={selected.id === createdId}
              onDeleted={() => select(null)}
            />
          ) : (
            <p className="text-slate-400">{t('library.select')}</p>
          )}
        </div>
      )}
    </section>
  )
}
