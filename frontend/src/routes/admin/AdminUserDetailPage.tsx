import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountText } from '@/components/shared/AmountText'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { useAdminUser } from '@/hooks/use-admin'
import { EditUserDialog, ROLE_LABEL } from './AdminUsersPage'

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, isError, error } = useAdminUser(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !user) {
    return <ErrorBanner error={error ?? 'Utilisateur introuvable.'} />
  }

  const totalBalance = user.accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/admin/users"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux utilisateurs
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {user.first_name} {user.last_name}
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={user.status} />
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" aria-hidden="true" />
                Modifier
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Identifiant</p>
            <p className="font-mono">{user.user_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Téléphone</p>
            <p>{user.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rôle</p>
            <p>{ROLE_LABEL[user.role]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Adresse</p>
            <p>{user.address || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inscrit le</p>
            <p>{new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Solde total (tous comptes)</p>
            <AmountText amount={totalBalance} className="font-semibold" />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">Comptes ({user.accounts.length})</h2>
        {user.accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Cet utilisateur n'a pas encore de compte.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de compte</TableHead>
                  <TableHead>Banque</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Solde</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-xs">{account.account_number}</TableCell>
                    <TableCell>{account.bank_name}</TableCell>
                    <TableCell className="capitalize">
                      {account.account_type === 'savings' ? 'Épargne' : 'Courant'}
                    </TableCell>
                    <TableCell>
                      <AmountText amount={account.balance} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={account.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <EditUserDialog user={editOpen ? user : null} onOpenChange={(open) => !open && setEditOpen(false)} />
    </div>
  )
}
