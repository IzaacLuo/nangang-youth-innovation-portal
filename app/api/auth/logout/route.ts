import { clearSessionCookie, logoutSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await logoutSession(request);
    return new Response(JSON.stringify({ loggedOut: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  } catch (error) {
    console.error('Unable to logout', error);
    return Response.json({ message: '登出失敗，請稍後再試。' }, { status: 500 });
  }
}
