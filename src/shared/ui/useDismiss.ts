import { useEffect, type RefObject } from 'react'

/**
 * Closes a floating element on Escape or on a click outside `container`.
 * Escape also gives focus back to `returnFocus` (the trigger).
 */
export function useDismiss(
  open: boolean,
  container: RefObject<HTMLElement | null>,
  onClose: () => void,
  returnFocus?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Handled here: other Escape handlers (e.g. leaving action mode) must not also fire.
      e.preventDefault()
      e.stopPropagation()
      onClose()
      returnFocus?.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, container, onClose, returnFocus])
}
