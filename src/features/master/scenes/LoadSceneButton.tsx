import { Play } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { loadSceneIntoBattle } from '@/app/library/loadScene'
import { useBattleStore } from '@/app/store'
import type { BattleScene } from '@/domain'
import { Button } from '@/shared/ui/Button'

type Props = {
  scene: BattleScene
  /** Visible text; defaults to "Carica in Controllo schermo". */
  label?: string
  /** Primary on the scene's own page; secondary in lists, where many sit side by side. */
  variant?: 'primary' | 'secondary'
  onLoaded?: (missing: number) => void
}

/**
 * Loads a scene onto the field. When someone is already there it asks once more,
 * because the field is replaced (party PV/PM still go back to their sheets).
 */
export function LoadSceneButton({ scene, label, variant = 'primary', onLoaded }: Props) {
  const { t } = useTranslation()
  const fieldInUse = useBattleStore((s) => s.battle.combatants.length > 0)
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    const { ok, missing } = await loadSceneIntoBattle(scene)
    setBusy(false)
    setArmed(false)
    if (ok) onLoaded?.(missing)
  }

  if (armed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" autoFocus disabled={busy} onClick={() => void load()}>
          {t('scenes.confirmReplace')}
        </Button>
        <Button variant="ghost" onClick={() => setArmed(false)}>
          {t('library.delete.cancel')}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant={variant}
      disabled={busy}
      title={t('scenes.loadHint')}
      onClick={() => (fieldInUse ? setArmed(true) : void load())}
    >
      <Play className="h-4 w-4" aria-hidden="true" />
      {label ?? t('scenes.load')}
    </Button>
  )
}
