/**
 * Helper to determine whether the mobile BottomNav should be hidden on specific routes.
 */
export function shouldHideBottomNav(pathname?: string | null): boolean {
  if (!pathname) return false;

  // Strip optional 2-letter locale prefix: e.g. /id or /en
  const pathWithoutLocale = pathname.replace(/^\/[a-zA-Z]{2}(?=\/|$)/, "") || "/";

  // Matches /project/[username] and /project/[username]/[id]
  // Does NOT match base /project or /project/ explore page
  return /^\/project\/[^/]+/.test(pathWithoutLocale);
}
