import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PanelShell } from './PanelShell'

describe('PanelShell', () => {
  it('renders children inside a DIV by default, carrying the glass class string', () => {
    const { container, getByText } = render(
      <PanelShell>
        <p>Hello</p>
      </PanelShell>,
    )

    expect(getByText('Hello')).toBeTruthy()
    const element = container.firstChild as HTMLElement
    expect(element.tagName).toBe('DIV')
    expect(element.className).toContain('bg-glass-surface')
    expect(element.className).toContain('border-glass-border')
    expect(element.className).toContain('rounded-glass-lg')
    expect(element.className).toContain('shadow-glass')
    expect(element.className).toContain('backdrop-blur-lg')
    expect(element.className).toContain('px-md')
    expect(element.className).toContain('py-md')
  })

  it('renders a SECTION when as="section" is passed', () => {
    const { container } = render(
      <PanelShell as="section">
        <p>Content</p>
      </PanelShell>,
    )

    const element = container.firstChild as HTMLElement
    expect(element.tagName).toBe('SECTION')
  })

  it('renders an ASIDE when as="aside" is passed', () => {
    const { container } = render(
      <PanelShell as="aside">
        <p>Content</p>
      </PanelShell>,
    )

    const element = container.firstChild as HTMLElement
    expect(element.tagName).toBe('ASIDE')
  })

  it('appends an optional className after the base classes', () => {
    const { container } = render(
      <PanelShell className="max-w-[240px]">
        <p>Content</p>
      </PanelShell>,
    )

    const element = container.firstChild as HTMLElement
    expect(element.className).toContain('max-w-[240px]')
    expect(element.className).toContain('bg-glass-surface')
  })
})
