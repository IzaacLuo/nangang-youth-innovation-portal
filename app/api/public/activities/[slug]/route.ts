import { getPublicActivityBySlug } from '@/db/activities';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const activity = await getPublicActivityBySlug(slug);
    if (!activity) {
      return Response.json({ message: '找不到這場活動，或活動尚未公開。' }, { status: 404 });
    }
    return Response.json({ activity });
  } catch (error) {
    console.error('Unable to read public activity', error);
    return Response.json({ message: '目前無法讀取活動資料，請稍後再試。' }, { status: 500 });
  }
}
