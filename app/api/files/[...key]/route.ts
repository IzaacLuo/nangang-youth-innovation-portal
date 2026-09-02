import { getImage, isR2Enabled } from '@/lib/r2';
import { getAuthContext } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  if (!isR2Enabled()) {
    return Response.json({ message: '檔案儲存尚未啟用。' }, { status: 503 });
  }

  try {
    const { key } = await context.params;
    const objectKey = key.map(decodeURIComponent).join('/');
    if (!objectKey.startsWith('uploads/')) {
      return Response.json({ message: '找不到檔案。' }, { status: 404 });
    }

    const object = await getImage(objectKey);
    if (!object) {
      return Response.json({ message: '找不到檔案。' }, { status: 404 });
    }

    const auth = await getAuthContext(request);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', auth ? 'private, max-age=3600' : 'public, max-age=86400');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Unable to read image', error);
    return Response.json({ message: '無法讀取圖片。' }, { status: 500 });
  }
}
