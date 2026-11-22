import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SECTIONS, sectionPath } from './sections'

/** Alt+1…6 jumps to a sidebar section. Uses `code`, so it works on any keyboard layout. */
export function useSectionShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const match = /^Digit([1-9])$/.exec(e.code)
      const section = match ? SECTIONS[Number(match[1]) - 1] : undefined
      if (!section) return
      e.preventDefault()
      void navigate(sectionPath(section.id))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])
}
