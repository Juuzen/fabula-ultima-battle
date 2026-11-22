import { Outlet } from 'react-router'

import { usePartyWriteBack } from '@/app/library/hooks'

import { useMasterSync } from '../useMasterSync'
import { useUndoShortcut } from '../useUndoShortcut'
import { CommandStrip } from './CommandStrip'
import { MasterSidebar } from './MasterSidebar'
import { useSectionShortcuts } from './useSectionShortcuts'

/**
 * Master app shell. Sync with the player screen and the global shortcuts live here, so they
 * keep running whichever section is open.
 */
export function MasterLayout() {
  const displays = useMasterSync()
  useUndoShortcut()
  useSectionShortcuts()
  usePartyWriteBack()

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <MasterSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CommandStrip displays={displays} />
        <main className="@container flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
