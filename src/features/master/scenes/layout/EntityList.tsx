import { FlipHorizontal2, Layers, Move } from 'lucide-react'
import { useId, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { LayoutKey, Side } from '@/domain'

import type { LayoutSprite } from './previewBattle'

function Badge({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span title={label} className="inline-flex items-center gap-0.5 text-slate-400">
      {children}
      <span className="sr-only">{label}</span>
    </span>
  )
}

function SideList({
  side,
  sprites,
  selection,
  onSelect,
}: {
  side: Side
  sprites: readonly LayoutSprite[]
  selection: ReadonlySet<LayoutKey>
  onSelect: (key: LayoutKey, additive: boolean) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  if (sprites.length === 0) return null
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="px-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
        {t(side === 'enemy' ? 'scenes.layout.list.enemies' : 'scenes.layout.list.party')}
      </h3>
      <ul className="flex flex-col gap-1">
        {sprites.map(({ key, combatant }) => {
          const on = selection.has(key)
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={(e: MouseEvent) => onSelect(key, e.shiftKey || e.ctrlKey || e.metaKey)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400 ${
                  on ? 'bg-indigo-600/20 ring-1 ring-indigo-500/60' : 'hover:bg-slate-800/70'
                }`}
              >
                <span className="font-display min-w-0 flex-1 truncate font-semibold tracking-wide text-slate-100">
                  {combatant.name}
                </span>
                {combatant.placement && (
                  <Badge label={t('scenes.layout.badges.custom')}>
                    <Move className="h-3.5 w-3.5" aria-hidden="true" />
                  </Badge>
                )}
                {combatant.flipSprite && (
                  <Badge label={t('scenes.layout.badges.flipped')}>
                    <FlipHorizontal2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Badge>
                )}
                {combatant.depth !== null && (
                  <Badge label={t('scenes.layout.badges.depth', { n: combatant.depth })}>
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span aria-hidden="true" className="text-xs tabular-nums">
                      {combatant.depth > 0 ? `+${combatant.depth}` : combatant.depth}
                    </span>
                  </Badge>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Every sprite of the scene, enemies then party: select from here as well as on the stage. */
export function EntityList({
  sprites,
  selection,
  onSelect,
}: {
  sprites: readonly LayoutSprite[]
  selection: ReadonlySet<LayoutKey>
  onSelect: (key: LayoutKey, additive: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('scenes.layout.list.label')} className="flex flex-col gap-5">
      {(['enemy', 'ally'] as const).map((side) => (
        <SideList
          key={side}
          side={side}
          sprites={sprites.filter((s) => s.side === side)}
          selection={selection}
          onSelect={onSelect}
        />
      ))}
    </nav>
  )
}
