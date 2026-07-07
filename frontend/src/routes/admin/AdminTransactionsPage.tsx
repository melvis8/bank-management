import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { SearchInput } from '@/components/shared/SearchInput'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import { FormField } from '@/components/shared/FormField'
import { useAdminTransactions } from '@/hooks/use-admin'
import type { TransactionStatus, TransactionType } from '@/types'

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Dépôt',
  withdraw: 'Retrait',
  transfer: 'Virement',
}

const TYPE_OPTIONS: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les types' },
  { value: 'deposit', label: 'Dépôt' },
  { value: 'withdraw', label: 'Retrait' },
  { value: 'transfer', label: 'Virement' },
]

const STATUS_OPTIONS: { value: TransactionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'completed', label: 'Terminé' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En cours' },
  { value: 'failed', label: 'Échoué' },
  { value: 'refunded', label: 'Remboursé' },
]

export function AdminTransactionsPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<TransactionType | 'all'>('all')
  const [status, setStatus] = useState<TransactionStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = useAdminTransactions({
    page,
    limit: 20,
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
  })

  const filteredTransactions = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.data
    return data.data.filter((tx) =>
      [tx.sender_account_number, tx.sender_email, tx.recipient_account_number, tx.recipient_email, tx.reference]
        .filter((field): field is string => !!field)
        .some((field) => field.toLowerCase().includes(q))
    )
  }, [data, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Historique complet des mouvements sur tous les comptes de la plateforme.
          </p>
        </div>
        <ExportCsvButton
          filename="transactions"
          rows={filteredTransactions.map((tx) => ({
            date: tx.created_at,
            type: TYPE_LABELS[tx.type],
            compte_expediteur: tx.sender_account_number ?? '',
            email_expediteur: tx.sender_email ?? '',
            compte_destinataire: tx.recipient_account_number ?? '',
            email_destinataire: tx.recipient_email ?? '',
            montant: tx.amount,
            frais: tx.fee,
            statut: tx.status,
            reference: tx.reference ?? '',
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <FormField label="Type" htmlFor="admin-tx-type">
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as TransactionType | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger id="admin-tx-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Statut" htmlFor="admin-tx-status">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as TransactionStatus | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger id="admin-tx-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Recherche" htmlFor="admin-tx-search">
          <SearchInput value={search} onChange={setSearch} placeholder="Compte, email, référence…" />
        </FormField>
      </div>

      {isError && <ErrorBanner error={error} />}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Aucune transaction ne correspond à ces filtres.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Frais</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[tx.type]}</TableCell>
                    <TableCell className="text-sm">
                      {tx.sender_account_number ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{tx.sender_account_number}</span>
                          <span className="text-xs text-muted-foreground">{tx.sender_email ?? '—'}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.recipient_account_number ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{tx.recipient_account_number}</span>
                          <span className="text-xs text-muted-foreground">{tx.recipient_email ?? '—'}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <AmountText amount={tx.amount} />
                    </TableCell>
                    <TableCell>{tx.fee > 0 ? <AmountText amount={tx.fee} tone="muted" /> : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={tx.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Aucune transaction ne correspond à la recherche sur cette page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {data.pagination.page} / {data.pagination.totalPages} · {data.pagination.total} transaction
                {data.pagination.total > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
