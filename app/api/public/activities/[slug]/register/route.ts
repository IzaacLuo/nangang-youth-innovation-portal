import { getPublicActivityBySlug } from '@/db/activities';
import { createRegistration } from '@/db/registrations';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const activity = await getPublicActivityBySlug(slug);
    if (!activity) {
      return Response.json({ message: '找不到這場活動，或活動尚未公開。' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (cleanText(body.website, 200)) {
      return Response.json({ message: '報名失敗，請稍後再試。' }, { status: 400 });
    }

    const name = cleanText(body.name, 80);
    const phone = cleanText(body.phone, 40);
    const email = cleanText(body.email, 120) || null;
    const notes = cleanText(body.notes, 1000) || null;

    if (!name || !phone) {
      return Response.json({ message: '請填寫姓名與聯絡電話。' }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return Response.json({ message: 'Email 格式不正確。' }, { status: 400 });
    }

    const registration = await createRegistration(activity.id, { name, phone, email, notes });
    return Response.json({ registration }, { status: 201 });
  } catch (error) {
    console.error('Unable to create registration', error);
    return Response.json({ message: '報名失敗，請稍後再試。' }, { status: 500 });
  }
}
