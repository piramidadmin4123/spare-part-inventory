import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/auth.store';
import {
  ROLE_LABELS,
  SUPER_ADMIN_EMAILS,
  getEffectiveUserRole,
  isSuperAdminEmail,
} from '@/lib/roles';
import { useUsers, useUpdateUserRole } from '@/features/users/useUsers';
import type { UserRole } from '@spare-part/shared';

const ROLE_OPTIONS: Array<{ value: Exclude<UserRole, 'SUPER_ADMIN'>; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function SettingsUsersTab() {
  const { user: currentUser } = useAuthStore();
  const { data: users = [], isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const [draftRoles, setDraftRoles] = useState<Record<string, Exclude<UserRole, 'SUPER_ADMIN'>>>(
    {}
  );

  useEffect(() => {
    const nextDrafts: Record<string, Exclude<UserRole, 'SUPER_ADMIN'>> = {};
    for (const account of users) {
      if (!isSuperAdminEmail(account.email)) {
        nextDrafts[account.id] = account.role === 'SUPER_ADMIN' ? 'ADMIN' : account.role;
      }
    }
    setDraftRoles(nextDrafts);
  }, [users]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} account(s)</p>
        <p className="text-xs text-muted-foreground">SuperAdmin accounts are fixed.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>Change Role</TableHead>
            <TableHead className="w-28 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                ยังไม่มีข้อมูล
              </TableCell>
            </TableRow>
          ) : (
            users.map((account) => {
              const isFixedSuperAdmin = SUPER_ADMIN_EMAILS.includes(
                account.email.toLowerCase() as (typeof SUPER_ADMIN_EMAILS)[number]
              );
              const isCurrentUser = account.id === currentUser?.id;
              const isLocked = isFixedSuperAdmin || isCurrentUser;
              const effectiveRole = getEffectiveUserRole(account.email, account.role);
              const currentEditableRole =
                effectiveRole === 'SUPER_ADMIN'
                  ? 'ADMIN'
                  : (effectiveRole as Exclude<UserRole, 'SUPER_ADMIN'>);
              const selectedRole = draftRoles[account.id] ?? currentEditableRole;
              const isDirty = selectedRole !== currentEditableRole;

              return (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{ROLE_LABELS[effectiveRole ?? 'VIEWER']}</Badge>
                      {isFixedSuperAdmin && <Badge variant="outline">Fixed</Badge>}
                      {isCurrentUser && <Badge variant="outline">You</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isLocked ? (
                      <span className="text-xs text-muted-foreground">
                        {isFixedSuperAdmin ? 'SuperAdmin account' : 'Current user'}
                      </span>
                    ) : (
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setDraftRoles((prev) => ({
                            ...prev,
                            [account.id]: e.target.value as Exclude<UserRole, 'SUPER_ADMIN'>,
                          }))
                        }
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => updateRole.mutate({ id: account.id, role: selectedRole })}
                      disabled={isLocked || !isDirty || updateRole.isPending}
                    >
                      {updateRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      บันทึก
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
