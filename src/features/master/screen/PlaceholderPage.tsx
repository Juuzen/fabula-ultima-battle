import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { SECTIONS, sectionPath, type PlaceholderSectionId } from '../shell/sections'

/** Stand-in for a section that is designed but not built yet: says what it will hold. */
export function PlaceholderPage({ section }: { section: PlaceholderSectionId }) {
  const { t } = useTranslation()
  const Icon = SECTIONS.find((s) => s.id === section)?.icon

  return (
    <section aria-labelledby="section-title" className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-7 w-7 text-slate-400" aria-hidden="true" />}
        <h2 id="section-title" className="font-display text-3xl font-bold tracking-wide">
          {t(`master.nav.${section}`)}
        </h2>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-slate-300 uppercase ring-1 ring-slate-600">
          {t('master.placeholder.soon')}
        </span>
      </div>
      <p className="text-base leading-relaxed text-slate-300">
        {t(`master.placeholder.${section}`)}
      </p>
      <Link
        to={sectionPath('screen')}
        className="inline-flex items-center gap-1.5 self-start rounded-md text-sm font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('master.placeholder.back')}
      </Link>
    </section>
  )
}
