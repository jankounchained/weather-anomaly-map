import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PanelLoadingState } from './PanelLoadingState'

describe('PanelLoadingState', () => {
  it('renders role="status" with the given label text and a hidden spinner', () => {
    const { getByRole, getByText } = render(
      <PanelLoadingState label="Looking up place name…" />,
    )

    const status = getByRole('status')
    expect(status).toBeTruthy()
    expect(getByText('Looking up place name…')).toBeTruthy()

    const spinner = status.querySelector('span[aria-hidden="true"]')
    expect(spinner).toBeTruthy()
  })
})
