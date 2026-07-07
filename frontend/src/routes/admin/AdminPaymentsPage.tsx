import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { SearchInput } from '@/components/shared/SearchInput'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import { useAdminPayments } from '@/hooks/use-admin'

export function AdminPaymentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error } = useAdminPayments({ page, limit: 20 })

  const filteredPayments = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.data
    return data.data.filter((p) =>
      [p.email, p.account_number, p.status, p.camerpay_reference ?? ''].some((field) =>
        field.toLowerCase().includes(q)
      )
    )
  }, [data, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Paiements Mobile Money</h1>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble des paiements CamerPay de tous les utilisateurs.
          </p>
        </div>
        <ExportCsvButton
          filename="paiements-mobile-money"
          rows={filteredPayments.map((p) => ({
            date: p.created_at,
            utilisateur: p.email,
            compte: p.account_number,
            montant: p.amount,
            devise: p.currency,
            statut: p.status,
            reference_camerpay: p.camerpay_reference ?? '',
          }))}
        />
      </div>

      <div>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par utilisateur, compte, statut…" />
        {search && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            La recherche ne porte que sur la page actuellement affichée.
          </p>
        )}
      </div>

      {isError && <ErrorBanner error={error} />}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Aucun paiement pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Réf. CamerPay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.email}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.account_number}</TableCell>
                    <TableCell>
                      <AmountText amount={payment.amount} currency={payment.currency} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {payment.camerpay_reference ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Aucun paiement ne correspond à la recherche sur cette page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {data.pagination.page} / {data.pagination.totalPages}
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
