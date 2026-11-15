/** Keep post-login navigation on this site. */
export function getSafeLoginRedirect(search: string): string {
  const redirect = new URLSearchParams(search).get('redirect');
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || redirect.includes('\\')) {
    return '/';
  }
  return redirect;
}
