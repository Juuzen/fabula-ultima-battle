export type DomainErrorCode =
  'COMBATANT_NOT_FOUND' | 'DUPLICATE_ID' | 'INVALID_AMOUNT' | 'INVALID_COMBATANT' | 'INVALID_BATTLE'

export type DomainError = { code: DomainErrorCode; message: string }

export function domainError(code: DomainErrorCode, message: string): DomainError {
  return { code, message }
}
