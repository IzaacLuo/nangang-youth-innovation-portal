'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { changePassword, fetchCurrentAccount } from '../lib/client-auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [mustChange, setMustChange] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrentAccount()
      .then((account) => setMustChange(Boolean(account?.mustChangePassword)))
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const account = await changePassword({
        currentPassword: mustChange ? undefined : currentPassword,
        newPassword,
        confirmPassword,
      });
      router.replace('/');
      router.refresh();
      if (!account.mustChangePassword) {
        window.location.href = '/';
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '密碼更新失敗。');
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
        <h1>{mustChange ? '首次登入，請設定新密碼' : '變更密碼'}</h1>
        <p>{mustChange ? '為了帳號安全，請先設定一組新的登入密碼。' : '請輸入目前密碼與新密碼。'}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {!mustChange && (
            <label className="field">
              <span>目前密碼</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span>新密碼</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label className="field">
            <span>確認新密碼</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error && <div className="form-message error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? '儲存中…' : '儲存新密碼'} <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
