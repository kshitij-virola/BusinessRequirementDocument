import { render, screen } from '@testing-library/react'
import StatsCard from '@/components/dashboard/StatsCard'
import { Zap } from 'lucide-react'

describe('StatsCard', () => {
  it('renders label and value', () => {
    render(<StatsCard label="Generations" value={42} icon={Zap} />)
    expect(screen.getByText('Generations')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows positive trend with + prefix', () => {
    render(<StatsCard label="Test" value={10} icon={Zap} trend={{ value: 15, direction: 'up' }} />)
    expect(screen.getByText('+15%')).toBeInTheDocument()
  })

  it('shows negative trend with - prefix', () => {
    render(<StatsCard label="Test" value={10} icon={Zap} trend={{ value: 5, direction: 'down' }} />)
    expect(screen.getByText('-5%')).toBeInTheDocument()
  })
})
