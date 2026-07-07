import { Navigate, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useRef } from 'react'

export function AdminRoute() {
  const { isAdmin } = useAuth()
  const hasWarned = useRef(false)

  useEffect(() => {
    if (!isAdmin && !hasWarned.current) {
      hasWarned.current = true
      toast.error('Accès réservé aux administrateurs.')
    }
  }, [isAdmin])

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
