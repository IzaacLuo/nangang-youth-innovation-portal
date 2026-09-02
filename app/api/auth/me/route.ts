import { getAuthContext, toPublicAccount, touchSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) {
      return Response.json({ account: null }, { status: 200 });
    }

    const refreshedCookie = await touchSession(request, true);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (refreshedCookie) {
      headers['Set-Cookie'] = refreshedCookie;
    }

    return new Response(JSON.stringify({ account: toPublicAccount(context.account) }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Unable to read session', error);
    return Response.json({ message: '無法讀取登入狀態。' }, { status: 500 });
  }
}
