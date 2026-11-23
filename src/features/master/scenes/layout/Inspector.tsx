import { BringToFront, FlipHorizontal2, Minus, Plus, RotateCcw, SendToBack } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { MAX_DEPTH, MIN_DEPTH, type SpriteTransform } from '@/domain'
import { Button } from '@/shared/ui/Button'
import { Toggle } from '@/shared/ui/fields'

import { sharedValue } from './layoutModel'
import type { LayoutSprite } from './previewBattle'

const INPUT =
  'h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-slate-100 tabular-nums placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none'

/**
 * A number the GM can type. While focused it keeps what is typed; every valid number is
 * applied at once, so the stage follows the keyboard.
 */
function ValueField({
  label,
  value,
  step = 1,
  onCommit,
}: {
  label: string
  /** null = the selected sprites differ. */
  value: number | null
  step?: number
  onCommit: (value: number) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={draft ?? (value === null ? '' : String(value))}
        placeholder={value === null ? t('scenes.layout.inspector.mixed') : undefined}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(n)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={INPUT}
      />
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-slate-800 pt-4">
      <h3 id={id} className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

type Props = {
  selected: readonly LayoutSprite[]
  onField: (field: keyof SpriteTransform, value: number) => void
  onFlip: () => void
  onDepth: (step: number) => void
  onReset: () => void
  shortcuts: ReactNode
}

/** Exact values of the selection: position, size, rotation, mirroring and depth layer. */
export function Inspector({ selected, onField, onFlip, onDepth, onReset, shortcuts }: Props) {
  const { t } = useTranslation()

  if (selected.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-slate-300">{t('scenes.layout.inspector.none')}</p>
        {shortcuts}
      </div>
    )
  }

  const slots = selected.map((s) => s.slot)
  const x = sharedValue(slots.map((s) => Math.round(s.x)))
  const y = sharedValue(slots.map((s) => Math.round(s.y)))
  const scale = sharedValue(slots.map((s) => Math.round(s.scale * 100)))
  const rotation = sharedValue(slots.map((s) => Math.round(s.rotation)))
  const depth = sharedValue(selected.map((s) => s.combatant.depth ?? 0))
  const flipped = selected.every((s) => s.combatant.flipSprite)
  const automatic = selected.every((s) => s.combatant.placement === null)
  const handPlaced = selected.every((s) => s.combatant.placement !== null)
  const title =
    selected.length === 1
      ? selected[0]!.combatant.name
      : t('scenes.layout.inspector.many', { count: selected.length })
  const depthText =
    depth === null
      ? t('scenes.layout.inspector.mixed')
      : depth === 0
        ? t('scenes.layout.inspector.depthAuto')
        : depth > 0
          ? `+${depth}`
          : String(depth)
  const maxDepth = Math.max(...selected.map((s) => s.combatant.depth ?? 0))
  const minDepth = Math.min(...selected.map((s) => s.combatant.depth ?? 0))

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-display truncate text-lg font-semibold tracking-wide text-slate-100">
          {title}
        </h2>
        <p className="text-sm text-slate-400">
          {automatic
            ? t('scenes.layout.inspector.auto')
            : handPlaced
              ? t('scenes.layout.inspector.custom')
              : t('scenes.layout.inspector.partial')}
        </p>
      </header>

      <Group title={t('scenes.layout.inspector.position')}>
        <div className="grid grid-cols-2 gap-3">
          <ValueField label="X" value={x} onCommit={(v) => onField('x', v)} />
          <ValueField label="Y" value={y} onCommit={(v) => onField('y', v)} />
          <ValueField
            label={t('scenes.layout.inspector.scale')}
            value={scale}
            step={5}
            onCommit={(v) => onField('scale', v / 100)}
          />
          <ValueField
            label={t('scenes.layout.inspector.rotation')}
            value={rotation}
            onCommit={(v) => onField('rotation', v)}
          />
        </div>
      </Group>

      <Group title={t('scenes.layout.inspector.look')}>
        <Toggle label={t('scenes.layout.actions.flip')} checked={flipped} onChange={onFlip} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-200">{t('scenes.layout.inspector.depth')}</span>
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={t('scenes.layout.inspector.depth')}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('scenes.layout.actions.backward')}
              title={t('scenes.layout.actions.backward')}
              disabled={maxDepth <= MIN_DEPTH}
              onClick={() => onDepth(-1)}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span
              className="w-14 text-center text-sm font-semibold text-slate-100 tabular-nums"
              aria-live="polite"
            >
              {depthText}
            </span>
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('scenes.layout.actions.forward')}
              title={t('scenes.layout.actions.forward')}
              disabled={minDepth >= MAX_DEPTH}
              onClick={() => onDepth(1)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400">{t('scenes.layout.inspector.depthHint')}</p>
      </Group>

      <div className="border-t border-slate-800 pt-4">
        <Button variant="secondary" onClick={onReset} disabled={automatic && depth === 0}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('scenes.layout.actions.resetSelected')}
        </Button>
      </div>

      {shortcuts}
    </div>
  )
}

/** The quick actions above the selected sprite. */
export function QuickActions({
  flipped,
  onFlip,
  onDepth,
  onReset,
}: {
  flipped: boolean
  onFlip: () => void
  onDepth: (step: number) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const button =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-400'
  return (
    <>
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={t('scenes.layout.actions.flip')}
        title={`${t('scenes.layout.actions.flip')} (F)`}
        onClick={onFlip}
        className={`${button} ${flipped ? 'bg-indigo-600/30 text-white' : ''}`}
      >
        <FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={t('scenes.layout.actions.forward')}
        title={`${t('scenes.layout.actions.forward')} (${t('scenes.layout.keys.pageUp')})`}
        onClick={() => onDepth(1)}
        className={button}
      >
        <BringToFront className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={t('scenes.layout.actions.backward')}
        title={`${t('scenes.layout.actions.backward')} (${t('scenes.layout.keys.pageDown')})`}
        onClick={() => onDepth(-1)}
        className={button}
      >
        <SendToBack className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-slate-700" aria-hidden="true" />
      <button
        type="button"
        aria-label={t('scenes.layout.actions.resetSelected')}
        title={`${t('scenes.layout.actions.resetSelected')} (0)`}
        onClick={onReset}
        className={button}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  )
}
