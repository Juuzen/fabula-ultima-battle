export type DomainErrorCode =
  | 'COMBATANT_NOT_FOUND'
  | 'DUPLICATE_ID'
  | 'INVALID_AMOUNT'
  | 'INVALID_COMBATANT'
  | 'INVALID_BATTLE'
  | 'INVALID_PRESENTATION'
  | 'INVALID_ACTION'
  | 'BATTLE_NOT_ACTIVE'
  | 'NOT_ENOUGH_MP'

export type DomainError = { code: DomainErrorCode; message: string }

export function domainError(code: DomainErrorCode, message: string): DomainError {
  return { code, message }
}
