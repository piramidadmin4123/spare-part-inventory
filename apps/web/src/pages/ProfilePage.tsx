import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS, getEffectiveUserRole } from '@/lib/roles';
import { useActionRefresh } from '@/components/action-refresh';

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function ProfilePage() {
  const { user, accessToken, setAuth } = useAuthStore();
  const { flashRefresh } = useActionRefresh();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  const update = useMutation({
    mutationFn: (data: FormData) => authApi.updateProfile(data).then((r) => r.data),
    onSuccess: (updated) => {
      setAuth(updated, accessToken!);
      flashRefresh();
      toast.success('อัปเดตโปรไฟล์สำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Profile</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {user?.email}
            <Badge variant="secondary">
              {ROLE_LABELS[getEffectiveUserRole(user?.email, user?.role) ?? 'VIEWER']}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>ชื่อ</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>เบอร์โทร</Label>
              <Input {...register('phone')} placeholder="08x-xxx-xxxx" />
            </div>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
