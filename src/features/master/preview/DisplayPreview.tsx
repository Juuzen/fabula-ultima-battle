import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useBattleStore } from '@/app/store'
import { projectForPlayers } from '@/domain'
import { BattleScene, ScaledStage } from '@/features/display'
import { Panel } from '@/shared/ui/Panel'

/** Live miniature of what the players see, rendered from the Master's own state. */
export function DisplayPreview() {
  const { t } = useTranslation()
  const battle = useBattleStore((s) => s.battle)
  // Exactly what the players get: during preparation, no enemies.
  const visible = useMemo(() => projectForPlayers(battle), [battle])

  return (
    <Panel title={t('master.preview')}>
      <div aria-hidden="true" className="pointer-events-none">
        <ScaledStage>
          <BattleScene battle={visible} />
        </ScaledStage>
      </div>
      {battle.phase === 'preparation' && (
        <p className="mt-2 text-xs text-amber-300">{t('master.previewPreparation')}</p>
      )}
    </Panel>
  )
}
