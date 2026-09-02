import {
  canManageActivityRegistrations,
  getActivityById,
} from '@/db/activities';
import { countRegistrations, listRegistrations } from '@/db/registrations';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await context.params;
    const activityId = Number(id);
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return Response.json({ message: '活動編號不正確。' }, { status: 400 });
    }

    const activity = await getActivityById(activityId);
    if (!activity) {
      return Response.json({ message: '找不到這筆活動資料。' }, { status: 404 });
    }

    if (!canManageActivityRegistrations(activity, auth.context.account.code, auth.context.account.role)) {
      return Response.json({ message: '您沒有權限查看這筆活動的報名名單。' }, { status: 403 });
    }

    const registrations = await listRegistrations(activityId);
    return Response.json({
      registrations,
      total: registrations.length,
    });
  } catch (error) {
    console.error('Unable to list registrations', error);
    return Response.json({ message: '目前無法讀取報名資料，請稍後再試。' }, { status: 500 });
  }
}

export async function HEAD(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const activityId = Number(id);
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return new Response(null, { status: 400 });
    }

    const total = await countRegistrations(activityId);
    return new Response(null, {
      status: 200,
      headers: { 'X-Registration-Count': String(total) },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
