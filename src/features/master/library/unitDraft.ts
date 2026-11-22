import { UnitSchema, type Ability, type Unit } from '@/domain'
import { parseWholeNumber } from '@/shared/lib/numbers'

/** An ability as edited: hints are typed text, empty = no reminder. */
export type AbilityDraft = Omit<Ability, 'mpCostHint' | 'amountHint'> & {
  mpCostHint: string
  amountHint: string
}

/** A sheet as edited: numbers stay typed text until they parse. */
export type UnitDraft = {
  name: string
  tag: string
  notes: string
  maxHp: string
  maxMp: string
  hp: string
  mp: string
  flipSprite: boolean
  abilities: AbilityDraft[]
}

export type DraftField = 'name' | 'maxHp' | 'maxMp' | 'hp' | 'mp'
export type DraftErrors = {
  fields: Partial<Record<DraftField, 'name' | 'maxHp' | 'number' | 'hpOverMax'>>
  /** Ids of abilities with a problem (missing name or invalid hint). */
  abilities: string[]
}

const hintText = (n: number | null) => (n === null ? '' : String(n))

export function toDraft(unit: Unit): UnitDraft {
  return {
    name: unit.name,
    tag: unit.tag,
    notes: unit.notes,
    maxHp: String(unit.maxHp),
    maxMp: String(unit.maxMp),
    hp: String(unit.hp),
    mp: String(unit.mp),
    flipSprite: unit.flipSprite,
    abilities: unit.abilities.map((a) => ({
      ...a,
      mpCostHint: hintText(a.mpCostHint),
      amountHint: hintText(a.amountHint),
    })),
  }
}

/** Empty = no reminder; anything else must be a whole number. */
function parseHint(text: string): number | null | undefined {
  if (text.trim() === '') return null
  return parseWholeNumber(text) ?? undefined
}

/**
 * Builds the sheet to save, or explains what blocks it. Enemies always keep current = max;
 * party members keep the current values typed (they come back from the field).
 */
export function fromDraft(
  draft: UnitDraft,
  base: Unit,
): { unit: Unit | null; errors: DraftErrors } {
  const errors: DraftErrors = { fields: {}, abilities: [] }
  const maxHp = parseWholeNumber(draft.maxHp)
  const maxMp = parseWholeNumber(draft.maxMp)
  const party = base.kind === 'party'
  const hp = party ? parseWholeNumber(draft.hp) : maxHp
  const mp = party ? parseWholeNumber(draft.mp) : maxMp

  if (draft.name.trim() === '') errors.fields.name = 'name'
  if (maxHp === null || maxHp < 1) errors.fields.maxHp = 'maxHp'
  if (maxMp === null) errors.fields.maxMp = 'number'
  if (party) {
    if (hp === null) errors.fields.hp = 'number'
    else if (maxHp !== null && hp > maxHp) errors.fields.hp = 'hpOverMax'
    if (mp === null) errors.fields.mp = 'number'
    else if (maxMp !== null && mp > maxMp) errors.fields.mp = 'hpOverMax'
  }

  const abilities: Ability[] = []
  for (const a of draft.abilities) {
    const mpCostHint = parseHint(a.mpCostHint)
    const amountHint = parseHint(a.amountHint)
    if (a.name.trim() === '' || mpCostHint === undefined || amountHint === undefined) {
      errors.abilities.push(a.id)
      continue
    }
    abilities.push({ ...a, name: a.name.trim(), mpCostHint, amountHint })
  }

  if (Object.keys(errors.fields).length > 0 || errors.abilities.length > 0) {
    return { unit: null, errors }
  }
  const parsed = UnitSchema.safeParse({
    ...base,
    // Set by the library on save. Kept out of the result, so a save never looks like an edit.
    updatedAt: 0,
    name: draft.name.trim(),
    tag: draft.tag.trim(),
    notes: draft.notes,
    maxHp,
    maxMp,
    hp,
    mp,
    flipSprite: draft.flipSprite,
    abilities,
  })
  return { unit: parsed.success ? parsed.data : null, errors }
}

export function newAbilityDraft(id: string, name: string): AbilityDraft {
  return {
    id,
    name,
    effect: 'slash',
    kind: 'damage',
    statuses: [],
    mpCostHint: '',
    amountHint: '',
  }
}
