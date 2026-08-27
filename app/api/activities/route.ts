import {
  createActivity,
  deleteActivity,
  listActivities,
  updateActivityTracking,
  type ActivitySubmissionInput,
  type DesignStatus,
  type PublicationStatus,
} from '../../../db/activities';

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

export async function GET() {
  try {
    return Response.json({ activities: await listActivities() });
  } catch (error) {
    console.error('Unable to list activities', error);
    return Response.json({ message: '目前無法讀取活動資料，請稍後再試。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 100_000) {
      return Response.json({ message: '送出內容過長，請精簡宣傳文案或備註。' }, { status: 413 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const data: ActivitySubmissionInput = {
      sessionNumber: cleanText(body.sessionNumber, 80),
      youthProjectName: cleanText(body.youthProjectName, 120),
      activityDate: cleanText(body.activityDate, 10),
      publishDate: cleanText(body.publishDate, 10),
      promotionCopy: cleanText(body.promotionCopy, 5000),
      imageUrl: cleanText(body.imageUrl, 1000),
      needsDesign: body.needsDesign === true,
      registrationUrl: cleanText(body.registrationUrl, 1000) || null,
      notes: cleanText(body.notes, 3000) || null,
    };

    const missing = requiredTextFields.filter((field) => !data[field]);
    if (missing.length || typeof body.needsDesign !== 'boolean') {
      return Response.json({ message: '請完成所有必填欄位。' }, { status: 400 });
    }
    if (!isIsoDate(data.activityDate) || !isIsoDate(data.publishDate)) {
      return Response.json({ message: '請填寫有效的日期。' }, { status: 400 });
    }
    if (!isHttpUrl(data.imageUrl) || (data.registrationUrl && !isHttpUrl(data.registrationUrl))) {
      return Response.json({ message: '連結格式不正確，請使用 http 或 https 連結。' }, { status: 400 });
    }

    return Response.json({ activity: await createActivity(data) }, { status: 201 });
  } catch (error) {
    console.error('Unable to create activity', error);
    return Response.json({ message: '資料送出失敗，請稍後再試。' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
