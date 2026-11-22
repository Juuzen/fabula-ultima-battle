import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { useDisplayStore } from '@/features/display/state/displayStore'

import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it('redirects / to the Master dashboard', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Plancia del Master' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Party' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/master/screen')
  })

  it('navigates between sections from the sidebar, keeping the command strip', async () => {
    const router = renderAt('/master')
    const nav = await screen.findByRole('navigation', { name: 'Sezioni della plancia' })
    await screen.findByRole('region', { name: 'Party' })
    const current = within(nav).getByRole('link', { name: 'Controllo schermo' })
    expect(current).toHaveAttribute('aria-current', 'page')

    await userEvent.click(within(nav).getByRole('link', { name: 'Video' }))
    expect(await screen.findByText('In arrivo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Video', level: 2 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/master/video')
    expect(screen.getByTestId('battle-phase')).toBeInTheDocument()

    await userEvent.keyboard('{Alt>}1{/Alt}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/master/screen'))
  })

  it('shows a pop-up warning when the Display window is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    renderAt('/master')
    await userEvent.click(await screen.findByRole('button', { name: 'Apri schermo giocatori' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/popup/i)
  })

  it('renders the Display behind an audio-unlock gate', async () => {
    renderAt('/display')
    expect(await screen.findByTestId('battle-stage')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Premi per iniziare/ }))
    expect(screen.getByTestId('waiting-screen')).toHaveTextContent('In attesa della battaglia…')
    expect(screen.getByText('Plancia del Master non collegata')).toBeInTheDocument()
  })

  it('renders the sample encounter with ?demo=1', async () => {
    renderAt('/display?demo=1')
    expect(await screen.findByTestId('party-slot-a1')).toHaveTextContent('Lyra')
    useDisplayStore.getState().showBattle(null)
  })
})
