import { requireAuth, toPublicAccount, updatePassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const currentPassword = cleanText(body.currentPassword, 120);
    const newPassword = cleanText(body.newPassword, 120);
    const confirmPassword = cleanText(body.confirmPassword, 120);

    if (!newPassword || newPassword.length < 6) {
      return Response.json({ message: '新密碼至少需要 6 個字元。' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return Response.json({ message: '兩次輸入的新密碼不一致。' }, { status: 400 });
    }

    if (!auth.context.account.mustChangePassword) {
      if (!currentPassword) {
        return Response.json({ message: '請輸入目前密碼。' }, { status: 400 });
      }
      const { authenticateAccount } = await import('@/db/auth');
      const verified = await authenticateAccount(auth.context.account.code, currentPassword);
      if (!verified) {
        return Response.json({ message: '目前密碼不正確。' }, { status: 400 });
      }
    }

    const account = await updatePassword(auth.context.account.code, newPassword);
    if (!account) {
      return Response.json({ message: '密碼更新失敗。' }, { status: 500 });
    }

    return Response.json({ account: toPublicAccount(account) });
  } catch (error) {
    console.error('Unable to change password', error);
    return Response.json({ message: '密碼更新失敗，請稍後再試。' }, { status: 500 });
  }
}
