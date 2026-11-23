import { DoorOpen, Flag, PenLine, Play, Skull, Swords, Trophy, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleActions, useBattleStore, useCombatants } from '@/app/store'
import {
  MAX_OUTCOME_TEXT,
  OUTCOME_KINDS,
  suggestedOutcome,
  type Outcome,
  type OutcomeKind,
} from '@/domain'
import { Button } from '@/shared/ui/Button'
import { Popover } from '@/shared/ui/Popover'

const OUTCOME_ICONS: Record<OutcomeKind, LucideIcon> = {
  victory: Trophy,
  defeat: Skull,
  flee: DoorOpen,
  custom: PenLine,
}

const DANGER_TRIGGER =
  'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-rose-700 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 aria-expanded:bg-rose-600'

/** Two-step "End scene": everyone leaves the field and the players see the waiting screen. */
function EndSceneButton({ quiet = false }: { quiet?: boolean }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <Button
        variant={quiet ? 'ghost' : 'danger'}
        size={quiet ? 'sm' : 'md'}
        title={t('master.battle.endSceneHint')}
        className={quiet ? 'self-start text-rose-300' : ''}
        onClick={() => setArmed(true)}
      >
        {!quiet && <Flag className="h-4 w-4" aria-hidden="true" />}
        {quiet ? t('master.battle.abortScene') : t('master.battle.endScene')}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="danger"
        size={quiet ? 'sm' : 'md'}
        autoFocus
        title={t('master.battle.endSceneHint')}
        onClick={() => {
          dispatch({ type: 'END_SCENE' })
          setArmed(false)
        }}
      >
        {t('master.battle.endSceneConfirm')}
      </Button>
      <Button variant="ghost" size={quiet ? 'sm' : 'md'} onClick={() => setArmed(false)}>
        {t('master.battle.endCancel')}
      </Button>
    </div>
  )
}

/** Outcome and banner text; the obvious outcome (all enemies or all allies KO) is preselected. */
function EndBattleForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const textId = useId()
  const hintId = useId()
  const suggested = useBattleStore((s) => suggestedOutcome(s.battle))
  const [kind, setKind] = useState<OutcomeKind>(suggested ?? 'victory')
  const [text, setText] = useState('')
  const missing = kind === 'custom' && text.trim() === ''

  const submit = () => {
    if (missing) return
    const outcome: Outcome = { kind, text: text.trim() }
    if (dispatch({ type: 'END_BATTLE', outcome }).ok) onDone()
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h2 className="font-display text-lg tracking-wide text-slate-100">
        {t('master.battle.endTitle')}
      </h2>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
          {t('master.battle.endKind')}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOME_KINDS.map((k) => {
            const Icon = OUTCOME_ICONS[k]
            return (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-700 transition-colors hover:bg-slate-800 has-checked:bg-indigo-600/20 has-checked:ring-indigo-500 has-focus-visible:outline-2 has-focus-visible:outline-indigo-400"
              >
                <input
                  type="radio"
                  name="outcome-kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t(`outcome.kinds.${k}`)}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1">
        <label
          htmlFor={textId}
          className="text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          {t('master.battle.endText')}
        </label>
        <input
          id={textId}
          value={text}
          maxLength={MAX_OUTCOME_TEXT}
          aria-describedby={hintId}
          aria-invalid={missing || undefined}
          placeholder={kind === 'custom' ? '' : t(`outcome.default.${kind}`)}
          onChange={(e) => setText(e.target.value)}
          className="h-10 rounded-md bg-slate-950 px-3 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:ring-indigo-400 focus:outline-none"
        />
        <p id={hintId} className="text-xs text-slate-400">
          {kind === 'custom'
            ? t('master.battle.endTextRequired')
            : t('master.battle.endTextDefault', { text: t(`outcome.default.${kind}`) })}
        </p>
      </div>
      <Button type="submit" variant="primary" disabled={missing}>
        {t('master.battle.endShow')}
      </Button>
      <div className="border-t border-slate-800 pt-3">
        <EndSceneButton quiet />
      </div>
    </form>
  )
}

/**
 * Shortcut when the ending is obvious (every enemy KO, or the whole party): one click puts
 * up the banner with its default text. The GM can still pick any ending from the form.
 */
function SuggestedOutcomeButton() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const suggested = useBattleStore((s) => suggestedOutcome(s.battle))
  if (!suggested) return null
  const Icon = OUTCOME_ICONS[suggested]
  return (
    <Button
      variant="primary"
      title={t(`master.battle.suggestHint.${suggested}`)}
      onClick={() => dispatch({ type: 'END_BATTLE', outcome: { kind: suggested, text: '' } })}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {t(`master.battle.suggest.${suggested}`)}
    </Button>
  )
}

/** After the battle: what it ended with, back to fighting, or on to the next scene. */
function EndedControls() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const outcome = useBattleStore((s) => s.battle.outcome)
  const Icon = outcome ? OUTCOME_ICONS[outcome.kind] : Flag
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-slate-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {outcome && t('master.battle.ended', { kind: t(`outcome.kinds.${outcome.kind}`) })}
      </span>
      <Button
        variant="ghost"
        title={t('master.battle.resumeHint')}
        onClick={() => dispatch({ type: 'RESUME_BATTLE' })}
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        {t('master.battle.resume')}
      </Button>
      <EndSceneButton />
    </div>
  )
}

/**
 * The battle's lifecycle. Preparation → "Start battle" reveals the enemies; Active → "End
 * battle" puts the outcome banner up (the screen stays as it is); Ended → "End scene" clears
 * the field and shows the waiting screen, or "Resume" goes back to fighting.
 */
export function BattlePhaseControls() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const phase = useBattleStore((s) => s.battle.phase)
  const enemies = useCombatants('enemy')

  return (
    <div data-testid="battle-phase" data-phase={phase} className="flex items-center gap-2">
      {phase === 'preparation' && (
        <Button
          variant="primary"
          disabled={enemies.length === 0}
          title={`${t('master.battle.prepHint')} ${t('master.battle.startHint')}`}
          onClick={() => dispatch({ type: 'START_BATTLE' })}
        >
          <Swords className="h-4 w-4" aria-hidden="true" />
          {t('master.battle.start')}
        </Button>
      )}
      {phase === 'active' && (
        <>
          <SuggestedOutcomeButton />
          <Popover
            label={t('master.battle.end')}
            title={t('master.battle.endHint')}
            triggerClassName={DANGER_TRIGGER}
            panelClassName="w-[min(22rem,calc(100vw-2rem))]"
            trigger={
              <>
                <Flag className="h-4 w-4" aria-hidden="true" />
                {t('master.battle.end')}
              </>
            }
          >
            {(close) => <EndBattleForm onDone={close} />}
          </Popover>
        </>
      )}
      {phase === 'ended' && <EndedControls />}
    </div>
  )
}
