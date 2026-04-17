import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<div className="p-8">Login — Coming in Phase 2</div>} />
          <Route
            path="/dashboard"
            element={<div className="p-8">Dashboard — Coming in Phase 7</div>}
          />
          <Route
            path="/inventory"
            element={<div className="p-8">Inventory — Coming in Phase 4</div>}
          />
          <Route path="/borrow" element={<div className="p-8">Borrow — Coming in Phase 5</div>} />
          <Route path="/sites" element={<div className="p-8">Sites — Coming in Phase 3</div>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
