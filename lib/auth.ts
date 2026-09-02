import {
  authenticateAccount,
  changeAccountPassword,
  createSession,
  deleteSession,
  getAccountBySessionToken,
  refreshSession,
  SESSION_DAYS_DEFAULT,
  SESSION_DAYS_REMEMBER,
  type Account,
} from '@/db/auth';

export const SESSION_COOKIE = 'portal_session';
export const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 30;
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 90;

export type AuthContext = {
  account: Account;
  token: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured.');
  }
  return secret;
}

export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function readSessionToken(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
}

export function serializeSessionCookie(token: string, maxAgeSeconds: number) {
  const options = getSessionCookieOptions(maxAgeSeconds);
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    'HttpOnly',
    `SameSite=${options.sameSite === 'lax' ? 'Lax' : 'Strict'}`,
  ];
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const account = await getAccountBySessionToken(token);
  if (!account) return null;
  return { account, token };
}

export async function requireAuth(request: Request) {
  const context = await getAuthContext(request);
  if (!context) {
    return {
      error: Response.json({ message: '請先登入。' }, { status: 401 }),
    };
  }
  return { context };
}

export async function requireAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth;
  if (auth.context.account.role !== 'admin') {
    return {
      error: Response.json({ message: '僅平台組管理員可執行此操作。' }, { status: 403 }),
    };
  }
  return auth;
}

export function toPublicAccount(account: Account) {
  return {
    code: account.code,
    role: account.role,
    memberName: account.memberName,
    projectName: account.projectName,
    displayName: account.displayName,
    mustChangePassword: account.mustChangePassword,
    codeWithMemberName: account.memberName ? `${account.code}${account.memberName}` : account.code,
  };
}

export async function loginWithPassword(code: string, password: string, rememberMe = true) {
  getSessionSecret();
  const account = await authenticateAccount(code, password);
  if (!account) return null;
  const sessionDays = rememberMe ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT;
  const token = await createSession(account.code, sessionDays);
  const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  return { account, token, maxAge, rememberMe };
}

export async function touchSession(request: Request, rememberMe = true) {
  const token = readSessionToken(request);
  if (!token) return null;
  const days = rememberMe ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT;
  const refreshed = await refreshSession(token, days);
  if (!refreshed) return null;
  const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  return serializeSessionCookie(token, maxAge);
}

export async function logoutSession(request: Request) {
  const token = readSessionToken(request);
  if (token) await deleteSession(token);
}

export async function updatePassword(accountCode: string, newPassword: string) {
  getSessionSecret();
  return changeAccountPassword(accountCode, newPassword);
}

export { getSessionSecret };
