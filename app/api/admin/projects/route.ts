import {
  createAccount,
  deleteAccount,
  listAccounts,
  resetAccountPassword,
  updateAccount,
  type AccountRole,
} from '@/db/auth';
import { requireAdmin, toPublicAccount } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function parseAccountInput(body: Record<string, unknown>) {
  const code = cleanText(body.code, 20).toUpperCase();
  const role = cleanText(body.role, 20) as AccountRole;
  const memberName = cleanText(body.memberName, 80);
  const projectName = cleanText(body.projectName, 200);
  const displayName = cleanText(body.displayName, 240);

  if (!code || !projectName || !displayName) {
    return { error: '請填寫組別編號、提案名稱與顯示名稱。' };
  }
  if (role !== 'partner' && role !== 'admin') {
    return { error: '角色設定不正確。' };
  }
  if (code === 'ADMIN' && role !== 'admin') {
    return { error: 'ADMIN 帳號必須為管理員角色。' };
  }

  return {
    value: { code, role, memberName, projectName, displayName },
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const accounts = await listAccounts();
    return Response.json({
      projects: accounts.map((account) => toPublicAccount(account)),
    });
  } catch (error) {
    console.error('Unable to list projects', error);
    return Response.json({ message: '無法讀取帳號清單。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseAccountInput(body);
    if ('error' in parsed) {
      return Response.json({ message: parsed.error }, { status: 400 });
    }

    const account = await createAccount(parsed.value);
    return Response.json({ project: account ? toPublicAccount(account) : null }, { status: 201 });
  } catch (error) {
    console.error('Unable to create project', error);
    const message = error instanceof Error && error.message.includes('UNIQUE')
      ? '此組別編號已存在。'
      : '新增帳號失敗，請稍後再試。';
    return Response.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseAccountInput(body);
    if ('error' in parsed) {
      return Response.json({ message: parsed.error }, { status: 400 });
    }

    const account = await updateAccount(parsed.value);
    if (!account) {
      return Response.json({ message: '找不到這筆帳號。' }, { status: 404 });
    }
    return Response.json({ project: toPublicAccount(account) });
  } catch (error) {
    console.error('Unable to update project', error);
    return Response.json({ message: '更新帳號失敗，請稍後再試。' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const code = cleanText(new URL(request.url).searchParams.get('code'), 20).toUpperCase();
    if (!code) {
      return Response.json({ message: '請提供組別編號。' }, { status: 400 });
    }
    if (code === 'ADMIN') {
      return Response.json({ message: '無法刪除管理員帳號。' }, { status: 400 });
    }

    const deleted = await deleteAccount(code);
    if (!deleted) {
      return Response.json({ message: '找不到這筆帳號。' }, { status: 404 });
    }
    return Response.json({ deleted: true });
  } catch (error) {
    console.error('Unable to delete project', error);
    return Response.json({ message: '刪除帳號失敗，請稍後再試。' }, { status: 500 });
  }
}
