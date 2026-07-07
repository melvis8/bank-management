import { cn } from '@/lib/utils'

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

interface AmountTextProps {
  amount: number
  currency?: string
  tone?: 'default' | 'success' | 'danger' | 'muted'
  signed?: boolean
  className?: string
}

const toneClasses: Record<NonNullable<AmountTextProps['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
}

/** Renders a monetary amount in IBM Plex Mono with tabular figures for column alignment. */
export function AmountText({ amount, currency = 'XAF', tone = 'default', signed = false, className }: AmountTextProps) {
  const prefix = signed && amount > 0 ? '+' : ''
  return (
    <span className={cn('font-mono tabular-nums', toneClasses[tone], className)}>
      {prefix}
      {currencyFormatter.format(amount)} {currency}
    </span>
  )
}
