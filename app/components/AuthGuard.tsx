"use client";
import { homeFor } from '../../lib/roles';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/auth', { cache: 'no-store' }).then(async response => {
      if (!active) return;
      if (!response.ok) { router.replace('/login'); return; }
      const { user } = await response.json();
      if (!active) return;
      if (user.role === 'cliente') { router.replace('/cliente'); return; }
      const tailorPage = pathname === '/costureira';
      if (pathname !== '/settings' && ((tailorPage && user.role !== 'costureira') || (!tailorPage && user.role !== 'admin'))) {
        router.replace(homeFor(user.role));
        return;
      }
      setVerifiedPath(pathname);
    }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [pathname, router]);
  return verifiedPath === pathname ? <>{children}</> : <p className="p-6">Verificando sessão...</p>;
}
