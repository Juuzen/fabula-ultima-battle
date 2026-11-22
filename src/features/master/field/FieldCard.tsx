import { Crosshair, Eye } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore } from '@/app/store'
import { areStatsRevealed, isInCrisis, isKnockedOut, type Combatant } from '@/domain'
import { PlaceholderPortrait, ResourceGauge, StateTag, StatusIcons } from '@/features/display'
import { useAssetUrl } from '@/infra/assets/assetResolver'
import { Button } from '@/shared/ui/Button'
import { Menu } from '@/shared/ui/Menu'

import { useActionDraft } from '../action/actionDraft'

/** Portrait (or sprite) behind the card, fading out towards the name. */
function CardArt({ combatant: c, ko }: { combatant: Combatant; ko: boolean }) {
  const portrait = useAssetUrl(c.portraitAssetId)
  const sprite = useAssetUrl(c.spriteAssetId)
  const url = portrait ?? sprite
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 right-0 w-36 ${url ? 'opacity-45' : 'opacity-30'} ${ko ? 'grayscale' : ''}`}
      style={{ maskImage: 'linear-gradient(to left, black 35%, transparent)' }}
    >
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full object-cover object-top" />
      ) : (
        <PlaceholderPortrait name={c.name} side={c.side} />
      )}
    </div>
  )
}

type Props = { combatant: Combatant; index: number; count: number }

/**
 * One combatant on the field, read like the player screen's cards: name, Crisis/KO,
 * statuses, PV/PM. Clicking selects it (the detail pane then lists what it can do).
 * Reordering, revealing and removing live in the "⋯" menu; nothing else acts from here.
 */
export function FieldCard({ combatant: c, index, count }: Props) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const presentation = useBattleStore((s) => s.battle.presentation)
  const selected = useActionDraft((s) => s.selectedId === c.id)
  const targeted = useActionDraft((s) => c.id in s.targets)
  const select = useActionDraft((s) => s.select)
  const [confirming, setConfirming] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)

  const ko = isKnockedOut(c)
  const crisis = isInCrisis(c)
  const revealed = c.side === 'enemy' && areStatsRevealed(presentation, c)

  const ring = selected
    ? 'ring-2 ring-indigo-400 bg-indigo-950/50'
    : ko
      ? 'ring-1 ring-red-500/50 bg-slate-950/70'
      : crisis
        ? 'ring-1 ring-amber-400/70 bg-slate-950/70'
        : 'ring-1 ring-white/15 bg-slate-950/70 hover:ring-white/35'

  const cancelRemove = () => {
    setConfirming(false)
    requestAnimationFrame(() => menuTrigger.current?.focus())
  }

  return (
    <li data-testid={`combatant-${c.id}`} aria-label={c.name} className="relative">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={c.name}
        title={t(selected ? 'master.field.deselectHint' : 'master.field.selectHint', {
          name: c.name,
        })}
        onClick={() => select(c.id)}
        className={`relative block w-full overflow-hidden rounded-lg text-left transition-[box-shadow,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${ring}`}
      >
        <CardArt combatant={c} ko={ko} />
        <div className="relative flex flex-col gap-1 py-2 pr-10 pl-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`font-display truncate text-base leading-6 font-semibold ${
                ko ? 'text-red-400 line-through' : crisis ? 'text-amber-300' : 'text-white'
              }`}
            >
              {c.name}
            </span>
            <StateTag combatant={c} size="sm" />
            {revealed && (
              <Eye
                className="h-3.5 w-3.5 shrink-0 text-slate-300"
                aria-label={t('master.field.revealed')}
              />
            )}
            {targeted && (
              <Crosshair
                className="h-4 w-4 shrink-0 text-indigo-300"
                aria-label={t('master.field.targeted')}
              />
            )}
          </div>
          {c.statuses.length > 0 && (
            <div className="flex h-5 items-center">
              <StatusIcons statuses={c.statuses} size={20} />
            </div>
          )}
          <div className="flex items-center gap-3 pr-2">
            <ResourceGauge
              kind="hp"
              label={t('display.hp')}
              value={c.hp}
              max={c.maxHp}
              layout="inline"
            />
            {c.maxMp > 0 && (
              <ResourceGauge
                kind="mp"
                label={t('display.mp')}
                value={c.mp}
                max={c.maxMp}
                layout="inline"
              />
            )}
          </div>
        </div>
      </button>

      <div className="absolute top-1.5 right-1.5">
        <Menu
          label={t('master.combatant.more', { name: c.name })}
          triggerRef={menuTrigger}
          items={[
            {
              label: t('master.combatant.moveUp'),
              disabled: index === 0,
              onSelect: () => dispatch({ type: 'MOVE_COMBATANT', id: c.id, toIndex: index - 1 }),
            },
            {
              label: t('master.combatant.moveDown'),
              disabled: index === count - 1,
              onSelect: () => dispatch({ type: 'MOVE_COMBATANT', id: c.id, toIndex: index + 1 }),
            },
            ...(c.side === 'enemy'
              ? [
                  {
                    label: t(
                      c.revealStats ? 'master.combatant.hideStats' : 'master.combatant.revealStats',
                    ),
                    disabled: presentation.revealAllEnemyStats,
                    onSelect: () =>
                      dispatch({ type: 'SET_REVEAL_STATS', id: c.id, reveal: !c.revealStats }),
                  },
                ]
              : []),
            {
              label: t('master.combatant.remove'),
              danger: true,
              onSelect: () => setConfirming(true),
            },
          ]}
        />
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-label={t('master.combatant.removeConfirm', { name: c.name })}
          className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-rose-950/60 px-3 py-2 ring-1 ring-rose-800"
          onKeyDown={(e) => e.key === 'Escape' && cancelRemove()}
        >
          <span className="min-w-0 text-sm text-rose-100">
            {t('master.combatant.removeConfirm', { name: c.name })}
          </span>
          <span className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="ghost" onClick={cancelRemove}>
              {t('master.combatant.keep')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              autoFocus
              onClick={() => dispatch({ type: 'REMOVE_COMBATANT', id: c.id })}
            >
              {t('master.combatant.removeConfirmed')}
            </Button>
          </span>
        </div>
      )}
    </li>
  )
}
