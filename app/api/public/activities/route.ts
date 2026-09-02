import { listPublicActivities } from '@/db/activities';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activities = await listPublicActivities();
    return Response.json({ activities });
  } catch (error) {
    console.error('Unable to list public activities', error);
    return Response.json({ message: '目前無法讀取活動資料，請稍後再試。' }, { status: 500 });
  }
}
