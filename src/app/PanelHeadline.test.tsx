import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PanelHeadline } from './PanelHeadline'

describe('PanelHeadline', () => {
  it('renders its children text inside a <p> with the eyebrow class string', () => {
    const { getByText } = render(<PanelHeadline>Location</PanelHeadline>)

    const element = getByText('Location')
    expect(element.tagName).toBe('P')
    expect(element.className).toContain('text-label')
    expect(element.className).toContain('font-semibold')
    expect(element.className).toContain('text-muted')
    expect(element.className).toContain('uppercase')
    expect(element.className).toContain('tracking-[0.05em]')
  })
})
