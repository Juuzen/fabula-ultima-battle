import { Check, Minus, Plus, UserPlus, Users } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useShallow } from 'zustand/shallow'

import { useScenes, useUnits } from '@/app/library/hooks'
import { useBattleActions, useBattleStore } from '@/app/store'
import { combatantFromUnit, MAX_ENEMY_COPIES, numberedNames, type Side, type Unit } from '@/domain'
import { Button } from '@/shared/ui/Button'
import { Popover } from '@/shared/ui/Popover'

import { AddCombatantForm } from '../roster/AddCombatantForm'
import { LoadSceneButton } from '../scenes/LoadSceneButton'

const TABS = ['scene', 'party', 'enemies', 'quick'] as const
type Tab = (typeof TABS)[number]

const ROW = 'flex items-center gap-3 rounded-md bg-slate-950/60 px-3 py-2 ring-1 ring-slate-800'

function GoTo({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-sm font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-400"
    >
      {label}
    </Link>
  )
}

function Empty({ text, to, label }: { text: string; to: string; label: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
      {text} <GoTo to={to} label={label} />
    </p>
  )
}

function SceneTab() {
  const { t } = useTranslation()
  const scenes = useScenes()
  if (!scenes) return null
  if (scenes.length === 0) {
    return (
      <Empty text={t('deploy.scene.none')} to="/master/scenes" label={t('deploy.goTo.scenes')} />
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {scenes.map((scene) => (
        <li key={scene.id} className={ROW}>
          <span className="min-w-0 flex-1">
            <span className="font-display block truncate font-semibold tracking-wide text-slate-100">
              {scene.name}
            </span>
            <span className="text-sm text-slate-400 tabular-nums">
              {t('scenes.summary', {
                party: scene.partyUnitIds.length,
                enemies: scene.enemies.reduce((sum, e) => sum + e.count, 0),
              })}
            </span>
          </span>
          <LoadSceneButton scene={scene} label={t('deploy.scene.load')} variant="secondary" />
        </li>
      ))}
    </ul>
  )
}

function PartyTab() {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const party = useUnits('party')
  const onField = new Set(
    useBattleStore(
      useShallow((s) =>
        s.battle.combatants.flatMap((c) => (c.side === 'ally' && c.unitId ? [c.unitId] : [])),
      ),
    ),
  )
  if (!party) return null
  if (party.length === 0) {
    return <Empty text={t('deploy.party.none')} to="/master/party" label={t('deploy.goTo.party')} />
  }
  const deploy = (units: Unit[]) =>
    dispatch({
      type: 'DEPLOY',
      combatants: units.map((u) => combatantFromUnit(u, crypto.randomUUID())),
    })
  const missing = party.filter((u) => !onField.has(u.id))

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {party.map((unit) => {
          const deployed = onField.has(unit.id)
          return (
            <li key={unit.id} className={ROW}>
              <span className="min-w-0 flex-1">
                <span className="font-display block truncate font-semibold tracking-wide text-slate-100">
                  {unit.name}
                </span>
                <span className="text-sm text-slate-400 tabular-nums">
                  {t('display.hp')} {unit.hp}/{unit.maxHp}
                  {unit.maxMp > 0 && ` · ${t('display.mp')} ${unit.mp}/${unit.maxMp}`}
                </span>
              </span>
              {deployed ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t('deploy.party.onField')}
                </span>
              ) : (
                <Button
                  size="sm"
                  aria-label={`${t('deploy.party.deploy')} ${unit.name}`}
                  onClick={() => deploy([unit])}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {t('deploy.party.deploy')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {missing.length > 1 && (
        <Button className="self-start" onClick={() => deploy(missing)}>
          <Users className="h-4 w-4" aria-hidden="true" />
          {t('deploy.party.all')}
        </Button>
      )}
    </div>
  )
}

function EnemyDeployRow({ unit }: { unit: Unit }) {
  const { t } = useTranslation()
  const { dispatch } = useBattleActions()
  const [count, setCount] = useState(1)
  const enemyNames = useBattleStore(
    useShallow((s) => s.battle.combatants.filter((c) => c.side === 'enemy').map((c) => c.name)),
  )

  const deploy = () => {
    const names = numberedNames(unit.name, count, enemyNames)
    dispatch({
      type: 'DEPLOY',
      combatants: names.map((name) => combatantFromUnit(unit, crypto.randomUUID(), name)),
    })
  }

  return (
    <li className={ROW}>
      <span className="min-w-0 flex-1">
        <span className="font-display block truncate font-semibold tracking-wide text-slate-100">
          {unit.name}
        </span>
        <span className="text-sm text-slate-400 tabular-nums">
          {t('display.hp')} {unit.maxHp}
          {unit.tag && ` · ${unit.tag}`}
        </span>
      </span>
      <div
        className="flex items-center"
        role="group"
        aria-label={t('scenes.enemies.count', { name: unit.name })}
      >
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('scenes.enemies.less', { name: unit.name })}
          disabled={count <= 1}
          onClick={() => setCount((n) => n - 1)}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="w-6 text-center font-semibold text-slate-100 tabular-nums">{count}</span>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('scenes.enemies.more', { name: unit.name })}
          disabled={count >= MAX_ENEMY_COPIES}
          onClick={() => setCount((n) => n + 1)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <Button
        size="sm"
        aria-label={`${t('deploy.enemies.deploy', { count })} ${unit.name}`}
        onClick={deploy}
      >
        {t('deploy.enemies.deploy', { count })}
      </Button>
    </li>
  )
}

function EnemiesTab() {
  const { t } = useTranslation()
  const bestiary = useUnits('enemy')
  if (!bestiary) return null
  if (bestiary.length === 0) {
    return (
      <Empty
        text={t('deploy.enemies.none')}
        to="/master/enemies"
        label={t('deploy.goTo.enemies')}
      />
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {bestiary.map((unit) => (
        <EnemyDeployRow key={unit.id} unit={unit} />
      ))}
    </ul>
  )
}

function QuickTab() {
  const { t } = useTranslation()
  const [side, setSide] = useState<Side>('enemy')
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-400">{t('deploy.quick.hint')}</p>
      <div
        role="radiogroup"
        aria-label={t('deploy.quick.side')}
        className="inline-flex self-start rounded-md bg-slate-950 p-1 ring-1 ring-slate-700"
      >
        {(['ally', 'enemy'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={side === s}
            onClick={() => setSide(s)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${
              side === s ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t(s === 'ally' ? 'master.party' : 'master.enemies')}
          </button>
        ))}
      </div>
      <AddCombatantForm key={side} side={side} />
    </div>
  )
}

/**
 * The four ways to put combatants on the field: a whole prepared scene, party members,
 * enemies from the bestiary (×N), or someone improvised. Arrow keys move between tabs.
 */
export function DeployTabs() {
  const { t } = useTranslation()
  const id = useId()
  const [tab, setTab] = useState<Tab>('scene')
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length] ?? 'scene'
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={t('deploy.title')}
        onKeyDown={onTabKey}
        className="flex gap-1 border-b border-slate-800"
      >
        {TABS.map((key) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[key] = el
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`${id}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400 ${
              tab === key
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t(`deploy.tabs.${key}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
        {tab === 'scene' && <SceneTab />}
        {tab === 'party' && <PartyTab />}
        {tab === 'enemies' && <EnemiesTab />}
        {tab === 'quick' && <QuickTab />}
      </div>
    </div>
  )
}

/** "Schiera" over a populated field: the same tabs in a panel anchored to the button. */
export function DeployPopover() {
  const { t } = useTranslation()
  return (
    <Popover
      label={t('deploy.title')}
      title={t('deploy.hint')}
      align="end"
      panelClassName="w-[min(30rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto"
      trigger={
        <>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t('deploy.title')}
        </>
      }
    >
      <DeployTabs />
    </Popover>
  )
}
