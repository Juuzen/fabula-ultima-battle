export type DomainErrorCode =
  | 'COMBATANT_NOT_FOUND'
  | 'DUPLICATE_ID'
  | 'INVALID_AMOUNT'
  | 'INVALID_COMBATANT'
  | 'INVALID_BATTLE'
  | 'INVALID_PRESENTATION'
  | 'INVALID_ACTION'
  | 'NOT_ENOUGH_MP'
  | 'UNIT_ALREADY_DEPLOYED'
  | 'BATTLE_NOT_ACTIVE'
  | 'BATTLE_NOT_ENDED'
  | 'INVALID_OUTCOME'

export type DomainError = { code: DomainErrorCode; message: string }

export function domainError(code: DomainErrorCode, message: string): DomainError {
  return { code, message }
}
