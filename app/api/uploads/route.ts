import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  buildFileUrl,
  buildUploadKey,
  isR2Enabled,
  putImage,
} from '@/lib/r2';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  if (auth.context.account.mustChangePassword) {
    return Response.json({ message: '請先完成密碼變更後再上傳圖片。' }, { status: 403 });
  }

  if (!isR2Enabled()) {
    return Response.json({ message: '圖片上傳尚未啟用，請改用外部連結。' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ message: '請選擇要上傳的圖片。' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return Response.json({ message: '圖片大小不可超過 5 MB。' }, { status: 413 });
    }

    const contentType = file.type || 'application/octet-stream';
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return Response.json({ message: '僅支援 JPG、PNG、WebP 或 GIF 格式。' }, { status: 400 });
    }

    const key = buildUploadKey(contentType);
    await putImage(key, await file.arrayBuffer(), contentType);

    return Response.json({ url: buildFileUrl(key), key }, { status: 201 });
  } catch (error) {
    console.error('Unable to upload image', error);
    return Response.json({ message: '圖片上傳失敗，請稍後再試。' }, { status: 500 });
  }
}
