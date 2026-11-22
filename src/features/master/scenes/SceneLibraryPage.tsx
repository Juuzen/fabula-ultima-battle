import { Plus, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import { useScenes } from '@/app/library/hooks'
import { library } from '@/app/library/library'
import type { BattleScene } from '@/domain'
import { Button } from '@/shared/ui/Button'

import { SceneEditor } from './SceneEditor'

function SceneList({
  scenes,
  selectedId,
  onSelect,
}: {
  scenes: BattleScene[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const searchId = useId()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLocaleLowerCase()
  const visible = scenes.filter((s) => !needle || s.name.toLocaleLowerCase().includes(needle))

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
      {visible.length === 0 ? (
        <p className="px-1 text-sm text-slate-400">{t('scenes.noMatch')}</p>
      ) : (
        <ul aria-label={t('scenes.listLabel')} className="flex flex-col gap-1">
          {visible.map((scene) => (
            <li key={scene.id}>
              <button
                type="button"
                aria-current={scene.id === selectedId || undefined}
                onClick={() => onSelect(scene.id)}
                className={`flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400 ${
                  scene.id === selectedId
                    ? 'bg-indigo-600/20 ring-1 ring-indigo-500/60'
                    : 'hover:bg-slate-800/70'
                }`}
              >
                <span className="font-display truncate text-base font-semibold tracking-wide text-slate-100">
                  {scene.name}
                </span>
                <span className="text-sm text-slate-400 tabular-nums">
                  {t('scenes.summary', {
                    party: scene.partyUnitIds.length,
                    enemies: scene.enemies.reduce((sum, e) => sum + e.count, 0),
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Prepared encounters: who fights on both sides, ready to load with one click. */
export function SceneLibraryPage() {
  const { t } = useTranslation()
  const scenes = useScenes()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [createdId, setCreatedId] = useState<string | null>(null)

  const requested = params.get('id')
  const selected = scenes?.find((s) => s.id === requested) ?? scenes?.[0] ?? null
  const select = (id: string | null) =>
    setParams(id ? { id } : {}, { replace: true, preventScrollReset: true })

  const create = async () => {
    const scene = await library.saveScene({
      id: crypto.randomUUID(),
      name: t('scenes.newName'),
      partyUnitIds: [],
      enemies: [],
      backgroundAssetId: null,
      musicAssetId: null,
      updatedAt: 0,
    })
    setCreatedId(scene.id)
    select(scene.id)
  }

  return (
    <section aria-labelledby="scenes-title" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 id="scenes-title" className="font-display text-3xl font-bold tracking-wide">
            {t('master.nav.scenes')}
          </h2>
          {scenes && <span className="text-sm text-slate-400 tabular-nums">{scenes.length}</span>}
        </div>
        <Button variant="primary" onClick={() => void create()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('scenes.create')}
        </Button>
      </header>

      {scenes === undefined ? null : scenes.length === 0 ? (
        <p className="max-w-prose text-base text-slate-300">{t('scenes.empty')}</p>
      ) : (
        <div className="grid items-start gap-8 @4xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="@4xl:sticky @4xl:top-22">
            <SceneList scenes={scenes} selectedId={selected?.id ?? null} onSelect={select} />
          </div>
          {selected && (
            <SceneEditor
              key={selected.id}
              scene={selected}
              autoFocusName={selected.id === createdId}
              onDeleted={() => select(null)}
              onLoaded={(missing) =>
                void navigate('/master/screen', { state: { loadedScene: selected.name, missing } })
              }
            />
          )}
        </div>
      )}
    </section>
  )
}
