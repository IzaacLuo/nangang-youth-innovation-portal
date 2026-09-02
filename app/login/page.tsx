'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  loginAccount,
  readRememberedAccount,
  readRememberLoginPreference,
} from '../lib/client-auth';

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRememberMe(readRememberLoginPreference());
    setCode(readRememberedAccount());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const account = await loginAccount(code, password, rememberMe);
      router.replace(account.mustChangePassword ? '/change-password' : '/');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '登入失敗。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">NG</span>
          <div>
            <strong>南港機廠社宅</strong>
            <small>青創入口網</small>
          </div>
        </div>
        <h1>登入</h1>
        <p>請使用組別編號（如 NJ01）與密碼登入。勾選「記住我」後，90 天內會保持登入並記住帳號。</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>帳號</span>
            <input
              name="code"
              required
              autoComplete="username"
              placeholder="例：NJ01 或 ADMIN"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <label className="field">
            <span>密碼</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="remember-field">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>記住我（保持登入並記住帳號）</span>
          </label>
          {error && <div className="form-message error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? '登入中…' : '登入'} <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
