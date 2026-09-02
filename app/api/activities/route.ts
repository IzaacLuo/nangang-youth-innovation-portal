import {
  createActivity,
  deleteActivity,
  listActivities,
  listActivitiesByAccount,
  updateActivityTracking,
  type ActivitySubmissionInput,
  type DesignStatus,
  type PublicationStatus,
} from '@/db/activities';
import { buildPublicActivityPath } from '@/lib/slug';
import { requireAdmin, requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const requiredTextFields = [
  'sessionNumber',
  'youthProjectName',
  'activityDate',
  'publishDate',
  'promotionCopy',
  'imageUrl',
] as const;

const designStatuses: DesignStatus[] = ['未開始', '不需要', '進行中', '完成'];
const publicationStatuses: PublicationStatus[] = ['未開始', '已排程', '已刊登'];

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidImageUrl(value: string) {
  if (value.startsWith('/api/files/')) return true;
  return isHttpUrl(value);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  try {
    const scope = new URL(request.url).searchParams.get('scope');
    const activities = scope === 'mine'
      ? auth.context.account.role === 'admin'
        ? await listActivities()
        : await listActivitiesByAccount(auth.context.account.code)
      : await listActivities();

    return Response.json({ activities });
  } catch (error) {
    console.error('Unable to list activities', error);
    return Response.json({ message: '目前無法讀取活動資料，請稍後再試。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  if (auth.context.account.mustChangePassword) {
    return Response.json({ message: '請先完成密碼變更後再提交活動。' }, { status: 403 });
  }

  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 100_000) {
      return Response.json({ message: '送出內容過長，請精簡宣傳文案或備註。' }, { status: 413 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const data: ActivitySubmissionInput = {
      sessionNumber: cleanText(body.sessionNumber, 80),
      youthProjectName: auth.context.account.role === 'admin'
        ? cleanText(body.youthProjectName, 120)
        : auth.context.account.displayName,
      activityDate: cleanText(body.activityDate, 10),
      publishDate: cleanText(body.publishDate, 10),
      promotionCopy: cleanText(body.promotionCopy, 5000),
      imageUrl: cleanText(body.imageUrl, 1000),
      needsDesign: body.needsDesign === true,
      notes: cleanText(body.notes, 3000) || null,
    };

    const missing = requiredTextFields.filter((field) => !data[field]);
    if (missing.length || typeof body.needsDesign !== 'boolean') {
      return Response.json({ message: '請完成所有必填欄位。' }, { status: 400 });
    }
    if (!isIsoDate(data.activityDate) || !isIsoDate(data.publishDate)) {
      return Response.json({ message: '請填寫有效的日期。' }, { status: 400 });
    }
    if (!isValidImageUrl(data.imageUrl)) {
      return Response.json({ message: '連結格式不正確，請上傳圖片或提供 http / https 連結。' }, { status: 400 });
    }

    const activity = await createActivity(data, auth.context.account.code);
    return Response.json({
      activity,
      publicUrl: buildPublicActivityPath(activity.slug),
    }, { status: 201 });
  } catch (error) {
    console.error('Unable to create activity', error);
    return Response.json({ message: '資料送出失敗，請稍後再試。' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);
    const designStatus = cleanText(body.designStatus, 20) as DesignStatus;
    const publicationStatus = cleanText(body.publicationStatus, 20) as PublicationStatus;
    const assignee = cleanText(body.assignee, 120);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ message: '活動編號不正確。' }, { status: 400 });
    }
    if (!designStatuses.includes(designStatus) || !publicationStatuses.includes(publicationStatus)) {
      return Response.json({ message: '工作狀態不在允許的範圍內。' }, { status: 400 });
    }

    const activity = await updateActivityTracking(id, { designStatus, publicationStatus, assignee });
    if (!activity) return Response.json({ message: '找不到這筆活動資料。' }, { status: 404 });
    return Response.json({ activity });
  } catch (error) {
    console.error('Unable to update activity', error);
    return Response.json({ message: '資料儲存失敗，請稍後再試。' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  try {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ message: '活動編號不正確。' }, { status: 400 });
    }

    const deleted = await deleteActivity(id);
    if (!deleted) return Response.json({ message: '找不到這筆活動資料。' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) {
    console.error('Unable to delete activity', error);
    return Response.json({ message: '資料刪除失敗，請稍後再試。' }, { status: 500 });
  }
}
