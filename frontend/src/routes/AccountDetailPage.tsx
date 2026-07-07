import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { TransactionsTable } from '@/components/shared/TransactionsTable'
import { DepositForm } from '@/components/forms/DepositForm'
import { WithdrawForm } from '@/components/forms/WithdrawForm'
import { useAccount } from '@/hooks/use-accounts'
import { useTransactionHistory } from '@/hooks/use-transactions'

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: account, isLoading, isError, error } = useAccount(id)
  const [page, setPage] = useState(1)
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw' | null>(null)

  const history = useTransactionHistory(account?.account_number, { page, limit: 20 })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !account) {
    return <ErrorBanner error={error ?? 'Compte introuvable.'} />
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour au tableau de bord
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{account.bank_name}</CardTitle>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{account.account_number}</p>
            </div>
            <StatusBadge status={account.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Solde disponible</p>
            <AmountText amount={account.balance} className="text-2xl font-semibold" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveAction('deposit')}>
              <ArrowDownToLine className="size-4" aria-hidden="true" />
              Déposer
            </Button>
            <Button variant="outline" onClick={() => setActiveAction('withdraw')}>
              <ArrowUpFromLine className="size-4" aria-hidden="true" />
              Retirer
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">Historique de ce compte</h2>
        {history.isError && <ErrorBanner error={history.error} />}
        <TransactionsTable
          transactions={history.data?.data ?? []}
          perspectiveAccountNumber={account.account_number}
          isLoading={history.isLoading}
          pagination={history.data?.pagination}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={activeAction === 'deposit'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déposer de l'argent</DialogTitle>
            <DialogDescription>Créditer le compte {account.account_number}.</DialogDescription>
          </DialogHeader>
          <DepositForm accounts={[account]} onSuccess={() => setActiveAction(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={activeAction === 'withdraw'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer de l'argent</DialogTitle>
            <DialogDescription>Débiter le compte {account.account_number}.</DialogDescription>
          </DialogHeader>
          <WithdrawForm accounts={[account]} onSuccess={() => setActiveAction(null)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
