import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
      <p className="text-xl">{t('notFound')}</p>
      <Link to="/master" className="text-indigo-400 underline">
        {t('master.title')}
      </Link>
    </main>
  )
}
