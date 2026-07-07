import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/routes/guards/ProtectedRoute'
import { AdminRoute } from '@/routes/guards/AdminRoute'
import { PublicOnlyRoute } from '@/routes/guards/PublicOnlyRoute'
import { LoginPage } from '@/routes/LoginPage'
import { RegisterPage } from '@/routes/RegisterPage'
import { DashboardPage } from '@/routes/DashboardPage'
import { AccountDetailPage } from '@/routes/AccountDetailPage'
import { TransactionsPage } from '@/routes/TransactionsPage'
import { TransferPage } from '@/routes/TransferPage'
import { PaymentsPage } from '@/routes/PaymentsPage'
import { AdminOverviewPage } from '@/routes/admin/AdminOverviewPage'
import { AdminUsersPage } from '@/routes/admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/routes/admin/AdminUserDetailPage'
import { AdminAccountsPage } from '@/routes/admin/AdminAccountsPage'
import { AdminBanksPage } from '@/routes/admin/AdminBanksPage'
import { AdminPaymentsPage } from '@/routes/admin/AdminPaymentsPage'
import { AdminTransactionsPage } from '@/routes/admin/AdminTransactionsPage'
import { NotFoundPage } from '@/routes/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts/:id" element={<AccountDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transfer" element={<TransferPage />} />
            <Route path="/payments" element={<PaymentsPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
              <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
              <Route path="/admin/banks" element={<AdminBanksPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
