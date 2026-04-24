import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  MapPin,
  Settings,
  LogOut,
  User,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS, canAccessSettings, getEffectiveUserRole } from '@/lib/roles';
import { ActionRefreshOverlay } from '@/components/action-refresh';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Spare Parts' },
  { to: '/borrow', icon: ArrowLeftRight, label: 'ยืม / คืน' },
  { to: '/orders', icon: ShoppingCart, label: 'สั่งซื้อเพิ่ม' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
];

export function AppLayout() {
  const { user } = useAuthStore();
  const logout = useLogout();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-zinc-900">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <img src="/piramid-logo.png" alt="Piramid Solution" className="h-8 w-8 object-contain" />
          <span className="text-sm font-semibold text-white">Piramid Solution</span>
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
                    ? 'bg-amber-500 font-medium text-black'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          {canAccessSettings(user?.role, user?.email) && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-amber-500 font-medium text-black'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                )
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-zinc-800 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-md px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user?.name}</p>
              <Badge className="mt-0.5 h-4 bg-zinc-700 text-[10px] text-zinc-300 hover:bg-zinc-700">
                {ROLE_LABELS[getEffectiveUserRole(user?.email, user?.role) ?? 'VIEWER']}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <NavLink to="/profile" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Profile</span>
              </Button>
            </NavLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative flex-1 overflow-auto">
        <ActionRefreshOverlay />
        <Outlet />
      </main>
    </div>
  );
}
