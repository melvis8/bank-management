// Data models mirroring the backend API responses (src/controllers/*.js on the backend).

export type Role = 'user' | 'admin'
export type AccountStatus = 'active' | 'suspended'
export type AccountType = 'savings' | 'current'
export type BankType = 'bank' | 'mobile_money'
export type TransactionType = 'deposit' | 'withdraw' | 'transfer'
export type TransactionStatus = 'completed' | 'failed' | 'refunded' | 'pending' | 'processing'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
export type PaymentMethod = 'momo' | 'mtn' | 'om' | 'mobile_money' | 'orange_money'

export interface User {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address?: string
  role: Role
  status: AccountStatus
  created_at: string
}

export type AuthUser = Pick<
  User,
  'id' | 'user_id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'role'
>

export interface Bank {
  id: string
  name: string
  code: string
  type: BankType
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  bank_id: string
  account_number: string
  account_type: AccountType
  balance: number
  status: AccountStatus
  bank_name?: string
  bank_code?: string
  user_email?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  sender_account_number: string | null
  recipient_account_number: string | null
  type: TransactionType
  amount: number
  fee: number
  status: TransactionStatus
  reference: string | null
  created_at: string
}

export interface AdminTransaction extends Transaction {
  sender_email: string | null
  recipient_email: string | null
}

export interface CamerpayPayment {
  reference: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export interface CamerpayAdminPayment {
  id: string
  user_id: string
  email: string
  account_number: string
  amount: number
  currency: string
  status: PaymentStatus
  camerpay_reference: string | null
  created_at: string
  updated_at: string
}

// ─── API envelope shapes ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  error?: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: Pagination
}

export interface LoginResponse {
  success: boolean
  token: string
  user: AuthUser
}

// ─── Request payloads ─────────────────────────────────────────────────────

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  phone: string
  address?: string
}

export interface DepositPayload {
  account_number: string
  amount: number
  reference?: string
}

export interface WithdrawPayload {
  account_number: string
  amount: number
  reference?: string
}

export interface TransferPayload {
  sender_account_number: string
  recipient_account_number: string
  amount: number
  reference?: string
}

export interface CreateAccountPayload {
  bank_id: string
  account_type?: AccountType
  user_id?: string
  initial_balance?: number
}

export interface InitiatePaymentPayload {
  account_number: string
  amount: number
  currency?: string
  description?: string
  method?: PaymentMethod
  phone?: string
  idempotency_key?: string
}

export interface CreateUserPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  phone?: string
  address?: string
  role?: Role
}

export interface UpdateUserPayload {
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  status?: AccountStatus
  role?: Role
}

export interface CreateBankPayload {
  name: string
  code: string
  type?: BankType
}
