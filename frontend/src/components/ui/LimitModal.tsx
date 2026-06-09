'use client'
import Link from 'next/link'
import { AlertTriangle, Zap, FolderOpen, HardDrive } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

type LimitType = 'generations' | 'projects' | 'storage' | 'downloads'

interface LimitModalProps {
  open: boolean
  onClose: () => void
  limitType: LimitType
  current: number
  max: number
  plan: string
}

const config: Record<LimitType, { icon: React.ElementType; label: string; unit: string }> = {
  generations: { icon: Zap,        label: 'Generation',   unit: 'generation' },
  projects:    { icon: FolderOpen,  label: 'Project',      unit: 'project'    },
  storage:     { icon: HardDrive,   label: 'Storage',      unit: 'MB'         },
  downloads:   { icon: AlertTriangle, label: 'Download',   unit: 'download'   },
}

export const LimitModal = ({ open, onClose, limitType, current, max, plan }: LimitModalProps) => {
  const { icon: Icon, label, unit } = config[limitType]
  const pct = Math.min(100, Math.round((current / max) * 100))

  return (
    <Modal open={open} onClose={onClose} title={`${label} Limit Reached`} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 shrink-0">
            <Icon className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {current} / {max} {unit}s used
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              You have reached your {label.toLowerCase()} limit on the <span className="text-foreground font-medium">{plan}</span> plan.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Usage</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Upgrade your plan to unlock more {unit}s and continue building themes without interruption.
        </p>

        <div className="flex gap-2 pt-1">
          <Link href="/dashboard/billing" className="flex-1">
            <Button fullWidth onClick={onClose}>Upgrade Plan</Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="flex-1">Maybe Later</Button>
        </div>
      </div>
    </Modal>
  )
}
