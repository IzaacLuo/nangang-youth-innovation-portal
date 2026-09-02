export function isPublicPath(pathname: string) {
  return pathname === '/login'
    || pathname === '/活動'
    || pathname.startsWith('/活動/');
}
