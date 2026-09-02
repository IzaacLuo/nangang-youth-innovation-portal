import { env } from 'cloudflare:workers';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function isR2Enabled() {
  return Boolean(env.R2);
}

function getR2() {
  if (!env.R2) {
    throw new Error('R2 binding `R2` is unavailable.');
  }
  return env.R2;
}

export function buildUploadKey(contentType: string) {
  const extension = contentType === 'image/png'
    ? 'png'
    : contentType === 'image/webp'
      ? 'webp'
      : contentType === 'image/gif'
        ? 'gif'
        : 'jpg';
  return `uploads/${crypto.randomUUID()}.${extension}`;
}

export function buildFileUrl(key: string) {
  return `/api/files/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function putImage(key: string, body: ArrayBuffer, contentType: string) {
  await getR2().put(key, body, { httpMetadata: { contentType } });
}

export async function getImage(key: string) {
  return getR2().get(key);
}
