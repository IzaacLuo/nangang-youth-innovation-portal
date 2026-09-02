import {
  loginWithPassword,
  serializeSessionCookie,
  toPublicAccount,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const code = cleanText(body.code, 20).toUpperCase();
    const password = cleanText(body.password, 120);
    const rememberMe = body.rememberMe !== false;

    if (!code || !password) {
      return Response.json({ message: '請輸入帳號與密碼。' }, { status: 400 });
    }

    const result = await loginWithPassword(code, password, rememberMe);
    if (!result) {
      return Response.json({ message: '帳號或密碼不正確。' }, { status: 401 });
    }

    return new Response(JSON.stringify({
      account: toPublicAccount(result.account),
      rememberMe: result.rememberMe,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': serializeSessionCookie(result.token, result.maxAge),
      },
    });
  } catch (error) {
    console.error('Unable to login', error);
    const message = error instanceof Error && error.message.includes('SESSION_SECRET')
      ? '伺服器尚未設定 SESSION_SECRET，請聯絡管理員。'
      : '登入失敗，請稍後再試。';
    return Response.json({ message }, { status: 500 });
  }
}
