import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusIcons } from './StatusIcons'

describe('StatusIcons', () => {
  it('renders nothing without statuses', () => {
    const { container } = render(<StatusIcons statuses={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('labels each icon with the localized status name, in canonical order', () => {
    render(<StatusIcons statuses={['poisoned', 'slow', 'enraged', 'dazed']} />)
    const names = screen.getAllByRole('img').map((el) => el.getAttribute('aria-label'))
    expect(names).toEqual(['Lento', 'Confuso', 'Furente', 'Avvelenato'])
  })

  it('draws basic statuses in a circle and major ones in a diamond', () => {
    render(<StatusIcons statuses={['weak', 'enraged']} />)
    const shape = (name: string) => screen.getByRole('img', { name }).firstElementChild!.className
    expect(shape('Debole')).toContain('rounded-full')
    expect(shape('Furente')).toContain('rotate-45')
  })
})
