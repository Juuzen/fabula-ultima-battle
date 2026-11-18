import { render, screen } from '@testing-library/react'
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
    expect(router.state.location.pathname).toBe('/master')
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
