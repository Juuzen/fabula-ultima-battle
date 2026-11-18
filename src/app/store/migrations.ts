import { createDefaultPresentation } from '@/domain'

/**
 * Upgrades a persisted payload to the current shape. Each step only fills what the
 * previous version lacked; the result is validated by Zod afterwards (see mergePersisted).
 */
export function migratePersistedBattle(persisted: unknown, fromVersion: number): unknown {
  let data = persisted as { battle?: Record<string, unknown> } | undefined
  if (!data?.battle) return data

  if (fromVersion < 2) {
    // v2: MP, portraits, per-enemy stat reveal, presentation settings.
    const battle = data.battle
    const combatants = Array.isArray(battle.combatants) ? battle.combatants : []
    data = {
      ...data,
      battle: {
        ...battle,
        presentation: battle.presentation ?? createDefaultPresentation(),
        combatants: combatants.map((c: Record<string, unknown>) => ({
          maxMp: 0,
          mp: 0,
          portraitAssetId: null,
          revealStats: false,
          ...c,
        })),
      },
    }
  }

  if (fromVersion < 3 && data?.battle) {
    // v3: battle phase. Older saves had their enemies on screen, so they count as active.
    const battle = data.battle
    const combatants = Array.isArray(battle.combatants) ? battle.combatants : []
    const hasEnemies = combatants.some((c: Record<string, unknown>) => c.side === 'enemy')
    data = {
      ...data,
      battle: { phase: hasEnemies ? 'active' : 'preparation', ...battle },
    }
  }

  return data
}
