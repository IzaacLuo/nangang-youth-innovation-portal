'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { fetchCurrentAccount, type PublicAccount } from '../lib/client-auth';
import { isPublicPath } from '../../lib/public-path';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState<PublicAccount | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchCurrentAccount()
      .then((current) => active && setAccount(current))
      .catch(() => active && setAccount(null));
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (account === undefined) return;

    if (!account && !isPublicPath(pathname)) {
      router.replace('/login');
      return;
    }

    if (account && pathname === '/login') {
      router.replace(account.mustChangePassword ? '/change-password' : '/');
      return;
    }

    if (account?.mustChangePassword && pathname !== '/change-password') {
      router.replace('/change-password');
      return;
    }

    if (account && !account.mustChangePassword && pathname === '/change-password') {
      router.replace('/');
    }
  }, [account, pathname, router]);

  if (account === undefined) {
    return (
      <div className="auth-loading">
        <p>載入中…</p>
      </div>
    );
  }

  if (!account && !isPublicPath(pathname)) {
    return (
      <div className="auth-loading">
        <p>導向登入頁…</p>
      </div>
    );
  }

  return <>{children}</>;
}
