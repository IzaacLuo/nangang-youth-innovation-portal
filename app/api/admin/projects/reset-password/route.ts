import { resetAccountPassword } from '@/db/auth';
import { requireAdmin, toPublicAccount } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const code = cleanText(body.code, 20).toUpperCase();
    if (!code) {
      return Response.json({ message: '請提供組別編號。' }, { status: 400 });
    }

    const account = await resetAccountPassword(code);
    if (!account) {
      return Response.json({ message: '找不到這筆帳號。' }, { status: 404 });
    }

    return Response.json({
      project: toPublicAccount(account),
      message: '密碼已重設為預設值，請通知使用者下次登入時修改密碼。',
    });
  } catch (error) {
    console.error('Unable to reset password', error);
    return Response.json({ message: '重設密碼失敗，請稍後再試。' }, { status: 500 });
  }
}
