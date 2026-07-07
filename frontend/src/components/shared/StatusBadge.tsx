import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'muted'

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Actif', tone: 'success' },
  suspended: { label: 'Suspendu', tone: 'danger' },
  completed: { label: 'Terminé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  processing: { label: 'En cours', tone: 'warning' },
  failed: { label: 'Échoué', tone: 'danger' },
  refunded: { label: 'Remboursé', tone: 'muted' },
}

const toneClasses: Record<Tone, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/15 text-warning border-warning/25',
  danger: 'bg-destructive/10 text-destructive border-destructive/20',
  muted: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { label: status, tone: 'muted' as Tone }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[entry.tone]
      )}
    >
      {entry.label}
    </span>
  )
}
