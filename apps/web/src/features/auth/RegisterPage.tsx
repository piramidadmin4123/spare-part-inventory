import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegister } from './useAuth';

const registerFormSchema = z
  .object({
    name: z.string().min(1, 'กรุณาระบุชื่อ'),
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    phone: z.string().max(20).optional().or(z.literal('')),
    password: z.string().min(8, 'รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร'),
    confirmPassword: z.string().min(8, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'รหัสผ่านไม่ตรงกัน',
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const register = useRegister();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <img
            src="/piramid-logo.png"
            alt="Piramid Solution"
            className="mx-auto mb-2 h-24 w-24 object-contain"
          />
          <CardTitle className="text-2xl font-bold">สร้างบัญชีใหม่</CardTitle>
          <CardDescription>บัญชีปกติจะใช้งานได้เฉพาะยืมของและดูข้อมูลเท่านั้น</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit((data) =>
              register.mutate({
                name: data.name,
                email: data.email,
                password: data.password,
                phone: data.phone?.trim() || undefined,
              })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  className="pl-9"
                  autoComplete="name"
                  {...registerField('name')}
                />
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  autoComplete="email"
                  {...registerField('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08x-xxx-xxxx"
                  className="pl-9"
                  autoComplete="tel"
                  {...registerField('phone')}
                />
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="pl-9"
                  autoComplete="new-password"
                  {...registerField('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยัน Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  className="pl-9"
                  autoComplete="new-password"
                  {...registerField('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้างบัญชี...
                </>
              ) : (
                'สมัครสมาชิก'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="font-medium text-primary underline underline-offset-4">
                กลับไปเข้าสู่ระบบ
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
