import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SearchInput } from '@/components/shared/SearchInput'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import { useAdminAccounts, useAdminUpdateAccountStatus } from '@/hooks/use-admin'
import type { Account } from '@/types'

export function AdminAccountsPage() {
  const { data: accounts, isLoading, isError, error } = useAdminAccounts()
  const [search, setSearch] = useState('')
  const [targetAccount, setTargetAccount] = useState<Account | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const updateStatus = useAdminUpdateAccountStatus()

  const filteredAccounts = useMemo(() => {
    if (!accounts) return []
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) =>
      [a.account_number, a.bank_name, a.user_email, a.status].some((field) =>
        (field ?? '').toLowerCase().includes(q)
      )
    )
  }, [accounts, search])

  const nextStatus = targetAccount?.status === 'active' ? 'suspended' : 'active'

  const handleToggleStatus = async () => {
    if (!targetAccount) return
    try {
      await updateStatus.mutateAsync({ id: targetAccount.id, status: nextStatus })
      toast.success(
        nextStatus === 'suspended' ? 'Compte suspendu.' : 'Compte réactivé.'
      )
      setTargetAccount(null)
    } catch (err) {
      setActionError(err)
      setTargetAccount(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Comptes</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de tous les comptes du système.</p>
        </div>
        <ExportCsvButton
          filename="comptes"
          rows={filteredAccounts.map((a) => ({
            numero_compte: a.account_number,
            banque: a.bank_name,
            titulaire: a.user_email,
            type: a.account_type,
            solde: a.balance,
            statut: a.status,
          }))}
        />
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par compte, banque, titulaire…" />

      {isError && <ErrorBanner error={error} />}
      {actionError !== null && <ErrorBanner error={actionError} />}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro de compte</TableHead>
                <TableHead>Banque</TableHead>
                <TableHead>Titulaire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Solde</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-xs">{account.account_number}</TableCell>
                  <TableCell>{account.bank_name}</TableCell>
                  <TableCell className="text-muted-foreground">{account.user_email}</TableCell>
                  <TableCell className="capitalize">
                    {account.account_type === 'savings' ? 'Épargne' : 'Courant'}
                  </TableCell>
                  <TableCell>
                    <AmountText amount={account.balance} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={account.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTargetAccount(account)}
                    >
                      {account.status === 'active' ? (
                        <>
                          <Lock className="size-4" aria-hidden="true" />
                          Suspendre
                        </>
                      ) : (
                        <>
                          <Unlock className="size-4" aria-hidden="true" />
                          Réactiver
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Aucun compte ne correspond à la recherche.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!targetAccount}
        onOpenChange={(open) => !open && setTargetAccount(null)}
        title={nextStatus === 'suspended' ? 'Suspendre ce compte ?' : 'Réactiver ce compte ?'}
        description={
          targetAccount ? (
            <span>
              Le compte <strong className="font-mono">{targetAccount.account_number}</strong> (
              {targetAccount.user_email}) sera{' '}
              {nextStatus === 'suspended'
                ? 'suspendu — son titulaire ne pourra plus déposer, retirer ni recevoir de virement dessus.'
                : 'réactivé et redeviendra utilisable normalement.'}
            </span>
          ) : (
            ''
          )
        }
        confirmLabel={nextStatus === 'suspended' ? 'Suspendre' : 'Réactiver'}
        destructive={nextStatus === 'suspended'}
        loading={updateStatus.isPending}
        onConfirm={handleToggleStatus}
      />
    </div>
  )
}
