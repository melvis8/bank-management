import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Pagination, Transaction } from '@/types'

const TYPE_LABELS: Record<Transaction['type'], string> = {
  deposit: 'Dépôt',
  withdraw: 'Retrait',
  transfer: 'Virement',
}

type SortKey = 'created_at' | 'amount'

interface TransactionsTableProps {
  transactions: Transaction[]
  perspectiveAccountNumber?: string
  isLoading?: boolean
  pagination?: Pagination
  onPageChange?: (page: number) => void
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) {
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 font-medium hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {label}
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  )
}

export function TransactionsTable({
  transactions,
  perspectiveAccountNumber,
  isLoading,
  pagination,
  onPageChange,
}: TransactionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const copy = [...transactions]
    copy.sort((a, b) => {
      const va = sortKey === 'amount' ? a.amount : new Date(a.created_at).getTime()
      const vb = sortKey === 'amount' ? b.amount : new Date(b.created_at).getTime()
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return copy
  }, [transactions, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Aucune transaction pour le moment.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton
                  label="Date"
                  active={sortKey === 'created_at'}
                  direction={sortDir}
                  onClick={() => toggleSort('created_at')}
                />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Détail</TableHead>
              <TableHead>
                <SortButton
                  label="Montant"
                  active={sortKey === 'amount'}
                  direction={sortDir}
                  onClick={() => toggleSort('amount')}
                />
              </TableHead>
              <TableHead>Frais</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((tx) => {
              const isCredit =
                tx.type === 'deposit' ||
                (tx.type === 'transfer' && tx.recipient_account_number === perspectiveAccountNumber)
              return (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>{TYPE_LABELS[tx.type]}</TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                    {tx.type === 'transfer'
                      ? `${tx.sender_account_number} → ${tx.recipient_account_number}`
                      : tx.reference ?? '—'}
                  </TableCell>
                  <TableCell>
                    <AmountText amount={tx.amount} signed={isCredit} tone={isCredit ? 'success' : 'danger'} />
                  </TableCell>
                  <TableCell>
                    {tx.fee > 0 ? <AmountText amount={tx.fee} tone="muted" /> : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} / {pagination.totalPages} · {pagination.total} transaction
            {pagination.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
