import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { InitiatePaymentForm } from '@/components/forms/InitiatePaymentForm'
import { useMyAccounts } from '@/hooks/use-accounts'
import { usePaymentHistory, useRefundPayment } from '@/hooks/use-payments'
import type { CamerpayPayment } from '@/types'

function RefundAction({ payment }: { payment: CamerpayPayment }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const refund = useRefundPayment()

  if (payment.status !== 'completed') return null

  const handleConfirm = async () => {
    try {
      await refund.mutateAsync(payment.reference)
      toast.success('Paiement remboursé avec succès.')
      setOpen(false)
    } catch (err) {
      setError(err)
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Rembourser
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmer le remboursement"
        description={
          <span>
            Rembourser <AmountText amount={payment.amount} currency={payment.currency} className="font-semibold" />{' '}
            (référence <strong>{payment.reference}</strong>) ? Le montant sera débité du compte crédité.
          </span>
        }
        confirmLabel="Rembourser"
        destructive
        loading={refund.isPending}
        onConfirm={handleConfirm}
      />
      {error !== null && <ErrorBanner error={error} />}
    </>
  )
}

export function PaymentsPage() {
  const { data: accounts, isLoading: accountsLoading } = useMyAccounts()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = usePaymentHistory({ page, limit: 20 })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Paiements Mobile Money</h1>
        <p className="text-sm text-muted-foreground">
          Créditez vos comptes via MTN Mobile Money ou Orange Money (CamerPay).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau paiement</CardTitle>
          <CardDescription>Une confirmation vous sera demandée avant l'envoi.</CardDescription>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : accounts && accounts.length > 0 ? (
            <InitiatePaymentForm accounts={accounts} />
          ) : (
            <p className="text-sm text-muted-foreground">Vous devez posséder au moins un compte.</p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">Historique des paiements</h2>
        {isError && <ErrorBanner error={error} />}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Aucun paiement mobile money pour le moment.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((payment) => (
                    <TableRow key={payment.reference}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                      <TableCell>
                        <AmountText amount={payment.amount} currency={payment.currency} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RefundAction payment={payment} />
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  )
}
