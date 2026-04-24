import { createContext, useContext, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionRefreshContextValue = {
  flashRefresh: (message?: string) => void;
  isRefreshing: boolean;
  message: string;
};

const ActionRefreshContext = createContext<ActionRefreshContextValue | null>(null);

export function ActionRefreshProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('กำลังอัปเดตข้อมูล...');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const flashRefresh = (nextMessage = 'กำลังอัปเดตข้อมูล...') => {
    setMessage(nextMessage);
    setIsRefreshing(true);
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    if (!isRefreshing) return;

    const timer = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [isRefreshing, refreshToken]);

  return (
    <ActionRefreshContext.Provider value={{ flashRefresh, isRefreshing, message }}>
      {children}
    </ActionRefreshContext.Provider>
  );
}

export function useActionRefresh() {
  const context = useContext(ActionRefreshContext);
  if (!context) {
    throw new Error('useActionRefresh must be used within ActionRefreshProvider');
  }
  return context;
}

export function ActionRefreshOverlay() {
  const { isRefreshing, message } = useActionRefresh();

  return (
    <div
      aria-hidden={!isRefreshing}
      className={cn(
        'pointer-events-none absolute inset-0 z-30 overflow-hidden transition-opacity duration-300',
        isRefreshing ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300" />

      <div
        className={cn(
          'absolute left-1/2 top-6 -translate-x-1/2 transition-all duration-300',
          isRefreshing ? 'translate-y-0 scale-100' : '-translate-y-2 scale-95'
        )}
      >
        <div className="flex items-center gap-3 rounded-full border border-amber-200 bg-white px-4 py-2 shadow-lg shadow-amber-100">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          <span className="text-sm font-medium text-zinc-700">{message}</span>
        </div>
      </div>
    </div>
  );
}
