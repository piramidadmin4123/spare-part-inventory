import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { BorrowPage } from '@/pages/BorrowPage';
import { AdditionalOrdersPage } from '@/pages/AdditionalOrdersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — all roles */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Coming in future phases */}
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/borrow" element={<BorrowPage />} />
              <Route path="/orders" element={<AdditionalOrdersPage />} />
              <Route
                path="/sites/*"
                element={<div className="p-6 text-muted-foreground">Sites — Phase 3</div>}
              />

              {/* Admin only */}
              <Route
                path="/settings/*"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
