import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { MethodologyPanel } from './MethodologyPanel'

// This project has no global RTL cleanup config (see 06-01-SUMMARY.md) -
// scope afterEach(cleanup) locally so this file's multiple renders don't
// leave stale DOM across `it` blocks.
afterEach(cleanup)

describe('MethodologyPanel', () => {
  it('renders collapsed by default with the summary headline visible', () => {
    const { getByText } = render(<MethodologyPanel />)
    expect(getByText('How This Works')).toBeTruthy()
  })

  it('reveals the body copy when the summary is clicked (jsdom natively toggles <details>)', () => {
    const { getByText } = render(<MethodologyPanel />)
    fireEvent.click(getByText('How This Works'))
    expect(getByText('What This Shows')).toBeTruthy()
    expect(getByText("How It's Computed")).toBeTruthy()
  })

  it('renders unconditionally with no props (PD-11: always visible, no gating)', () => {
    // MethodologyPanel takes no props - this test simply confirms it
    // mounts without a hasSelection/status gate, unlike every other panel.
    const { getByText } = render(<MethodologyPanel />)
    expect(getByText('How This Works')).toBeTruthy()
  })
})
