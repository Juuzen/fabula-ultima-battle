/** Parses a non-negative integer typed by the user; null when empty or invalid. */
export function parseWholeNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}
