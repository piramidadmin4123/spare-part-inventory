import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  MapPin,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Spare Parts' },
  { to: '/borrow', icon: ArrowLeftRight, label: 'ยืม / คืน' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TECHNICIAN: 'Technician',
  VIEWER: 'Viewer',
};

export function AppLayout() {
  const { user } = useAuthStore();
  const logout = useLogout();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r bg-white">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-sm font-semibold text-foreground">Pyramid Solution</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-2 rounded-md px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.name}</p>
              <Badge variant="secondary" className="mt-0.5 h-4 text-[10px]">
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <NavLink to="/profile" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Profile</span>
              </Button>
            </NavLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
