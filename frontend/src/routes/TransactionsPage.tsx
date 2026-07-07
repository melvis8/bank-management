import { useEffect, useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { TransactionsTable } from '@/components/shared/TransactionsTable'
import { useMyAccounts } from '@/hooks/use-accounts'
import { useTransactionHistory } from '@/hooks/use-transactions'
import type { TransactionType, TransactionStatus } from '@/types'

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

export function TransactionsPage() {
  const { data: accounts, isLoading: accountsLoading } = useMyAccounts()
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!accountNumber && accounts && accounts.length > 0) {
      setAccountNumber(accounts[0].account_number)
    }
  }, [accounts, accountNumber])

  const { data, isLoading, isError, error } = useTransactionHistory(accountNumber || undefined, {
    page,
    limit: 20,
  })

  const filtered = useMemo(() => {
    if (!data) return []
    return data.data.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false
      const created = new Date(tx.created_at)
      if (dateFrom && created < new Date(dateFrom)) return false
      if (dateTo && created > new Date(`${dateTo}T23:59:59`)) return false
      return true
    })
  }, [data, typeFilter, statusFilter, dateFrom, dateTo])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Historique des transactions</h1>
        <p className="text-sm text-muted-foreground">
          Consultez, filtrez et triez les mouvements de vos comptes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Compte" htmlFor="filter-account">
          <Select value={accountNumber} onValueChange={(v) => { setAccountNumber(v ?? ''); setPage(1) }}>
            <SelectTrigger id="filter-account" className="w-full" disabled={accountsLoading}>
              <SelectValue placeholder="Choisissez un compte" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.account_number}>
                  {account.bank_name} · {account.account_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Type" htmlFor="filter-type">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}>
            <SelectTrigger id="filter-type" className="w-full">
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

        <FormField label="Statut" htmlFor="filter-status">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TransactionStatus | 'all')}>
            <SelectTrigger id="filter-status" className="w-full">
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

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Du" htmlFor="filter-date-from">
            <Input id="filter-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FormField>
          <FormField label="Au" htmlFor="filter-date-to">
            <Input id="filter-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FormField>
        </div>
      </div>

      {isError && <ErrorBanner error={error} />}

      <TransactionsTable
        transactions={filtered}
        perspectiveAccountNumber={accountNumber}
        isLoading={isLoading || accountsLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  )
}
