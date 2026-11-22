import { Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

import { useBattleStore } from '@/app/store'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'

import { SECTION_GROUPS, SECTIONS, sectionPath, type Section } from './sections'

/** Classic JRPG menu cursor: a white wedge with a dark outline, drawn beside the active row. */
function MenuCursor() {
  return (
    <svg
      viewBox="0 0 12 14"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-0.5 h-3.5 w-3 -translate-y-1/2 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)] min-[1440px]:left-1.5"
    >
      <path
        d="M1 1 L11 7 L1 13 Z"
        fill="#eef1ff"
        stroke="#0c1446"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SidebarItem({ section, index, live }: { section: Section; index: number; live: boolean }) {
  const { t } = useTranslation()
  const label = t(`master.nav.${section.id}`)
  const shortcut = t('master.nav.shortcut', { n: index + 1 })
  const Icon = section.icon

  return (
    <li>
      <NavLink
        to={sectionPath(section.id)}
        title={`${label} (${shortcut})`}
        aria-keyshortcuts={`Alt+${index + 1}`}
        className={({ isActive }) =>
          `group relative flex min-h-11 items-center gap-3 rounded-md py-2 pr-2 pl-6 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white max-[1439px]:justify-center max-[1439px]:px-0 ${
            isActive
              ? 'bg-white/15 text-white'
              : 'text-indigo-100/85 hover:bg-white/8 hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && <MenuCursor />}
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" strokeWidth={2} />
            <span className="font-display text-sm leading-snug font-semibold tracking-wide max-[1439px]:sr-only">
              {label}
            </span>
            {live && (
              <>
                <span className="sr-only">{t('master.nav.live')}</span>
                <span
                  aria-hidden="true"
                  className="live-blink h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 ring-2 ring-[#16226a] max-[1439px]:absolute max-[1439px]:top-2 max-[1439px]:right-2.5 min-[1440px]:ml-auto"
                />
              </>
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

/**
 * Section menu, drawn as a JRPG main-menu window. From 1440px it shows labels and group
 * headings; below that it collapses to an icon rail so the live board keeps its width.
 */
export function MasterSidebar() {
  const { t } = useTranslation()
  const battleActive = useBattleStore((s) => s.battle.phase === 'active')

  return (
    <div className="sticky top-0 flex h-screen shrink-0 p-3 pr-0">
      <div className="jrpg-window flex h-full w-[4.5rem] flex-col px-2 py-4 min-[1440px]:w-64 min-[1440px]:px-3">
        <div className="mb-5 flex items-center justify-center gap-2 min-[1440px]:justify-start min-[1440px]:pl-6">
          <Swords
            className="h-5 w-5 shrink-0 text-indigo-100 min-[1440px]:hidden"
            aria-hidden="true"
          />
          <h1 className="font-display text-xl leading-tight font-bold tracking-wide max-[1439px]:sr-only">
            {t('master.title')}
          </h1>
        </div>

        <nav
          aria-label={t('master.nav.label')}
          className="flex flex-1 flex-col gap-4 overflow-y-auto"
        >
          {SECTION_GROUPS.map((group) => {
            const id = `nav-group-${group}`
            return (
              <div key={group} role="group" aria-labelledby={id}>
                <h2
                  id={id}
                  className="mb-1 pl-6 text-xs font-medium tracking-wider text-indigo-200/80 uppercase [text-shadow:none] max-[1439px]:sr-only"
                >
                  {t(`master.nav.groups.${group}`)}
                </h2>
                <ul className="flex flex-col gap-0.5 max-[1439px]:border-t max-[1439px]:border-white/15 max-[1439px]:pt-2">
                  {SECTIONS.map((section, index) =>
                    section.group === group ? (
                      <SidebarItem
                        key={section.id}
                        section={section}
                        index={index}
                        live={section.id === 'screen' && battleActive}
                      />
                    ) : null,
                  )}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="mt-4 border-t border-white/15 pt-3 [text-shadow:none] min-[1440px]:pl-6">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
