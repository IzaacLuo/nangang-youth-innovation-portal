'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchCurrentAccount, logoutAccount, type PublicAccount } from '../lib/client-auth';

export default function SiteHeader() {
  const router = useRouter();
  const [account, setAccount] = useState<PublicAccount | null>(null);

  useEffect(() => {
    fetchCurrentAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

  async function handleLogout() {
    await logoutAccount();
    router.replace('/login');
    router.refresh();
  }

  const isAdmin = account?.role === 'admin';
  const displayLabel = account?.memberName
    ? `${account.code} ${account.memberName}`
    : account?.code ?? '';

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="回到首頁">
        <span className="brand-mark" aria-hidden="true">NG</span>
        <span>
          <strong>南港機廠社宅</strong>
          <small>青創入口網</small>
        </span>
      </a>
      <nav aria-label="主要導覽">
        <a href="#resources">資料彙整</a>
        <a href="#activity-form">活動填報</a>
        <a href="#activity-hub">活動資料</a>
        <a href="#workspace">工作區</a>
        {isAdmin && <Link href="/admin">後台</Link>}
      </nav>
      <div className="header-actions">
        {account && (
          <span className="header-user" title={account.displayName}>
            {displayLabel}
          </span>
        )}
        <Link className="header-link" href="/change-password">變更密碼</Link>
        <button className="header-logout" type="button" onClick={handleLogout}>登出</button>
        <a className="header-cta" href="#activity-form">提交活動 <span aria-hidden="true">↗</span></a>
      </div>
    </header>
  );
}
