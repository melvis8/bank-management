import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Smartphone, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AmountText } from '@/components/shared/AmountText'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { useAdminAccounts, useAdminPayments, useAdminUsers } from '@/hooks/use-admin'

interface KpiCardProps {
  to: string
  label: string
  icon: typeof Users
  isLoading: boolean
  value: ReactNode
  hint?: string
}

function KpiCard({ to, label, icon: Icon, isLoading, value, hint }: KpiCardProps) {
  return (
    <Link to={to}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className="size-4 text-accent-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold">{value}</div>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </CardContent>
      </Card>
    </Link>
  )
}

export function AdminOverviewPage() {
  const users = useAdminUsers()
  const accounts = useAdminAccounts()
  // limit=1 keeps this cheap — we only need pagination.total for the count.
  const payments = useAdminPayments({ page: 1, limit: 1 })

  const totalBalance = accounts.data?.reduce((sum, account) => sum + account.balance, 0) ?? 0
  const activeAccounts = accounts.data?.filter((a) => a.status === 'active').length ?? 0
  const suspendedAccounts = accounts.data?.filter((a) => a.status === 'suspended').length ?? 0

  const anyError = users.error ?? accounts.error ?? payments.error

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Indicateurs clés de la plateforme.</p>
      </div>

      {anyError !== undefined && anyError !== null && <ErrorBanner error={anyError} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          to="/admin/users"
          label="Utilisateurs"
          icon={Users}
          isLoading={users.isLoading}
          value={users.data?.length ?? 0}
        />
        <KpiCard
          to="/admin/accounts"
          label="Comptes"
          icon={Wallet}
          isLoading={accounts.isLoading}
          value={accounts.data?.length ?? 0}
          hint={`${activeAccounts} actif(s) · ${suspendedAccounts} suspendu(s)`}
        />
        <KpiCard
          to="/admin/accounts"
          label="Solde total du système"
          icon={Landmark}
          isLoading={accounts.isLoading}
          value={<AmountText amount={totalBalance} className="text-2xl font-semibold" />}
        />
        <KpiCard
          to="/admin/payments"
          label="Paiements Mobile Money"
          icon={Smartphone}
          isLoading={payments.isLoading}
          value={payments.data?.pagination.total ?? 0}
        />
      </div>
    </div>
  )
}
