import { Film, Map, MonitorPlay, Music, Skull, Users, type LucideIcon } from 'lucide-react'

export type SectionId = 'screen' | 'party' | 'enemies' | 'scenes' | 'audio' | 'video'
export type SectionGroup = 'live' | 'prep' | 'library'
export type PlaceholderSectionId = 'audio' | 'video'

export type Section = { id: SectionId; group: SectionGroup; icon: LucideIcon }

/** Sidebar order, which is also the Alt+1…6 order. Split by time: live, preparation, library. */
export const SECTIONS: readonly Section[] = [
  { id: 'screen', group: 'live', icon: MonitorPlay },
  { id: 'party', group: 'prep', icon: Users },
  { id: 'enemies', group: 'prep', icon: Skull },
  { id: 'scenes', group: 'prep', icon: Map },
  { id: 'audio', group: 'library', icon: Music },
  { id: 'video', group: 'library', icon: Film },
]

export const SECTION_GROUPS: readonly SectionGroup[] = ['live', 'prep', 'library']

export const sectionPath = (id: SectionId) => `/master/${id}`
