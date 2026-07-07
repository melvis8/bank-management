import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Plus, Smartphone, Wallet } from 'lucide-react'
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
import { DepositForm } from '@/components/forms/DepositForm'
import { WithdrawForm } from '@/components/forms/WithdrawForm'
import { TransferForm } from '@/components/forms/TransferForm'
import { InitiatePaymentForm } from '@/components/forms/InitiatePaymentForm'
import { CreateAccountForm } from '@/components/forms/CreateAccountForm'
import { useMyAccounts } from '@/hooks/use-accounts'
import { useAuth } from '@/hooks/useAuth'

type QuickAction = 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'create-account' | null

const QUICK_ACTIONS = [
  { id: 'deposit' as const, label: 'Déposer', icon: ArrowDownToLine },
  { id: 'withdraw' as const, label: 'Retirer', icon: ArrowUpFromLine },
  { id: 'transfer' as const, label: 'Virement', icon: ArrowLeftRight },
  { id: 'payment' as const, label: 'Mobile Money', icon: Smartphone },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { data: accounts, isLoading, isError, error } = useMyAccounts()
  const [activeAction, setActiveAction] = useState<QuickAction>(null)

  const total = accounts?.reduce((sum, account) => sum + account.balance, 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Bonjour, {user?.first_name}</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de vos comptes et de vos soldes.</p>
      </div>

      {isError && <ErrorBanner error={error} />}

      <Card className="border-primary/15 bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-primary-foreground/80">Solde total consolidé</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-48 bg-primary-foreground/20" />
          ) : (
            <AmountText amount={total} className="text-3xl font-semibold text-primary-foreground" />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => setActiveAction(id)}
            disabled={!accounts || accounts.length === 0}
          >
            <Icon className="size-5 text-accent-foreground" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Mes comptes</h2>
          <Button variant="outline" size="sm" onClick={() => setActiveAction('create-account')}>
            <Plus className="size-4" aria-hidden="true" />
            Nouveau compte
          </Button>
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Link key={account.id} to={`/accounts/${account.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle>{account.bank_name}</CardTitle>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {account.account_number}
                        </p>
                      </div>
                      <StatusBadge status={account.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AmountText amount={account.balance} className="text-xl font-semibold" />
                    <p className="mt-1 text-xs text-muted-foreground capitalize">
                      Compte {account.account_type === 'savings' ? 'épargne' : 'courant'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <Wallet className="size-8" aria-hidden="true" />
              <p>Vous n'avez pas encore de compte.</p>
              <Button onClick={() => setActiveAction('create-account')}>
                <Plus className="size-4" aria-hidden="true" />
                Créer mon premier compte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={activeAction === 'create-account'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau compte</DialogTitle>
            <DialogDescription>Un compte par banque ou opérateur mobile money.</DialogDescription>
          </DialogHeader>
          <CreateAccountForm onSuccess={() => setActiveAction(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={activeAction === 'deposit'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déposer de l'argent</DialogTitle>
            <DialogDescription>Créditez l'un de vos comptes.</DialogDescription>
          </DialogHeader>
          {accounts && <DepositForm accounts={accounts} onSuccess={() => setActiveAction(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={activeAction === 'withdraw'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer de l'argent</DialogTitle>
            <DialogDescription>Débitez l'un de vos comptes (frais de 2% applicables).</DialogDescription>
          </DialogHeader>
          {accounts && <WithdrawForm accounts={accounts} onSuccess={() => setActiveAction(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={activeAction === 'transfer'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Virement entre comptes</DialogTitle>
            <DialogDescription>Envoyez de l'argent vers un autre compte.</DialogDescription>
          </DialogHeader>
          {accounts && <TransferForm accounts={accounts} onSuccess={() => setActiveAction(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={activeAction === 'payment'} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paiement Mobile Money</DialogTitle>
            <DialogDescription>Créditez un compte via MTN Mobile Money ou Orange Money.</DialogDescription>
          </DialogHeader>
          {accounts && <InitiatePaymentForm accounts={accounts} onSuccess={() => setActiveAction(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
