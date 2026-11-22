import { useEffect } from 'react'

import { useBattleActions } from '@/app/store'

/**
 * Marks a field where Ctrl+Z undoes the battle instead of the typing: the amount fields,
 * where focus stays right after Enter applies damage. Spread it on the input.
 */
export const BATTLE_UNDO_FIELD = { 'data-battle-undo': '' } as const

function keepsNativeUndo(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return false
  return !target.hasAttribute('data-battle-undo')
}

/** Ctrl/Cmd+Z undoes the last battle action, except while typing in a text field. */
export function useUndoShortcut() {
  const { undo } = useBattleActions()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
        if (keepsNativeUndo(e.target)) return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])
}
