import { PublicOnlyGuard } from '@/components/auth/auth-guard';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicOnlyGuard>
      {children}
    </PublicOnlyGuard>
  );
}