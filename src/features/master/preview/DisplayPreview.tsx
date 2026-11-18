import { useTranslation } from 'react-i18next'

import { useBattleStore } from '@/app/store'
import { BattleScene, ScaledStage } from '@/features/display'
import { Panel } from '@/shared/ui/Panel'

/** Live miniature of what the players see, rendered from the Master's own state. */
export function DisplayPreview() {
  const { t } = useTranslation()
  const battle = useBattleStore((s) => s.battle)

  return (
    <Panel title={t('master.preview')}>
      <div aria-hidden="true" className="pointer-events-none">
        <ScaledStage>
          <BattleScene battle={battle} />
        </ScaledStage>
      </div>
    </Panel>
  )
}
