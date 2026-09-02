'use client';

export type PublicAccount = {
  code: string;
  role: 'partner' | 'admin';
  memberName: string;
  projectName: string;
  displayName: string;
  mustChangePassword: boolean;
  codeWithMemberName: string;
};

export const REMEMBER_ACCOUNT_KEY = 'nangang-portal:remember-account';
export const REMEMBER_LOGIN_KEY = 'nangang-portal:remember-login';

const authFetchOptions: RequestInit = {
  credentials: 'same-origin',
  cache: 'no-store',
};

export function readRememberedAccount() {
  try {
    if (window.localStorage.getItem(REMEMBER_LOGIN_KEY) !== 'true') return '';
    return window.localStorage.getItem(REMEMBER_ACCOUNT_KEY) ?? '';
  } catch {
    return '';
  }
}

export function readRememberLoginPreference() {
  try {
    const stored = window.localStorage.getItem(REMEMBER_LOGIN_KEY);
    return stored !== 'false';
  } catch {
    return true;
  }
}

export function saveRememberLoginPreference(code: string, rememberMe: boolean) {
  try {
    window.localStorage.setItem(REMEMBER_LOGIN_KEY, rememberMe ? 'true' : 'false');
    if (rememberMe) {
      window.localStorage.setItem(REMEMBER_ACCOUNT_KEY, code.toUpperCase());
    } else {
      window.localStorage.removeItem(REMEMBER_ACCOUNT_KEY);
    }
  } catch {
    // Ignore storage errors in restricted browsers.
  }
}

export function clearRememberLoginPreference() {
  try {
    window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
    window.localStorage.removeItem(REMEMBER_ACCOUNT_KEY);
  } catch {
    // Ignore storage errors in restricted browsers.
  }
}

export async function fetchCurrentAccount() {
  const response = await fetch('/api/auth/me', authFetchOptions);
  if (!response.ok) throw new Error('無法讀取登入狀態。');
  const data = (await response.json()) as { account: PublicAccount | null };
  return data.account;
}

export async function loginAccount(code: string, password: string, rememberMe = true) {
  const response = await fetch('/api/auth/login', {
    ...authFetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, password, rememberMe }),
  });
  const data = (await response.json()) as { account?: PublicAccount; message?: string };
  if (!response.ok || !data.account) {
    throw new Error(data.message || '登入失敗。');
  }
  saveRememberLoginPreference(code, rememberMe);
  return data.account;
}

export async function logoutAccount() {
  await fetch('/api/auth/logout', {
    ...authFetchOptions,
    method: 'POST',
  });
  clearRememberLoginPreference();
}

export async function changePassword(payload: {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const response = await fetch('/api/auth/change-password', {
    ...authFetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { account?: PublicAccount; message?: string };
  if (!response.ok || !data.account) {
    throw new Error(data.message || '密碼更新失敗。');
  }
  return data.account;
}
