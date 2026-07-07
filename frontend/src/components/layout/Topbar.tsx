import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)

  if (!user) return null

  const handleLogout = () => {
    logout()
    setConfirmLogoutOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <div className="hidden md:block" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials(user.first_name, user.last_name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">
            {user.first_name} {user.last_name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                {isAdmin && (
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                    <UserIcon className="size-3" /> Admin
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmLogoutOpen(true)}>
            <LogOut className="size-4" aria-hidden="true" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title="Se déconnecter ?"
        description="Vous devrez vous reconnecter avec votre email et votre mot de passe pour accéder à nouveau à votre espace."
        confirmLabel="Se déconnecter"
        destructive
        onConfirm={handleLogout}
      />
    </header>
  )
}
