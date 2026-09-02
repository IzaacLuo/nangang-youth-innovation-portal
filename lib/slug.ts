export function generateActivitySlug(sessionNumber: string) {
  const base = sessionNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'activity';
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}

export function buildPublicActivityPath(slug: string) {
  return `/活動/${slug}`;
}
