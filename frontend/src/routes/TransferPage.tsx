import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { TransferForm } from '@/components/forms/TransferForm'
import { CopyableAccountNumber } from '@/components/shared/CopyableAccountNumber'
import { useMyAccounts } from '@/hooks/use-accounts'

export function TransferPage() {
  const { data: accounts, isLoading, isError, error } = useMyAccounts()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Virement entre comptes</h1>
        <p className="text-sm text-muted-foreground">
          Envoyez de l'argent vers un autre compte BMS. Une confirmation vous sera demandée avant l'envoi.
        </p>
      </div>

      {!isLoading && !isError && accounts && accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recevoir un virement</CardTitle>
            <CardDescription>
              Partagez l'un de ces numéros de compte avec la personne qui doit vous envoyer de l'argent.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{account.bank_name}</p>
                  <p className="font-mono text-sm">{account.account_number}</p>
                </div>
                <CopyableAccountNumber accountNumber={account.account_number} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Détails du virement</CardTitle>
          <CardDescription>Le montant est débité immédiatement du compte source.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : isError ? (
            <ErrorBanner error={error} />
          ) : !accounts || accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vous devez posséder au moins un compte pour effectuer un virement.
            </p>
          ) : (
            <TransferForm accounts={accounts} onSuccess={() => navigate('/transactions')} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
