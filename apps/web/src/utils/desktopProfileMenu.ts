export interface ProfileMenuUser {
  id?: string;
  username?: string | null;
  displayName?: string | null;
  name?: string | null;
  profile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export function formatAccountDisplayName(user?: ProfileMenuUser | null): string {
  if (!user) return "User";
  return (
    user.profile?.displayName ||
    user.displayName ||
    user.name ||
    user.username ||
    "User"
  );
}

export function formatAccountHandle(username?: string | null): string {
  if (!username) return "@user";
  const trimmed = username.trim();
  if (trimmed.startsWith("@")) return trimmed;
  return `@${trimmed}`;
}

export function isCurrentAccountActive(
  activeUserId?: string | null,
  targetUserId?: string | null
): boolean {
  if (!activeUserId || !targetUserId) return false;
  return activeUserId === targetUserId;
}

export function toggleAccountAccordion(currentState: boolean): boolean {
  return !currentState;
}

export function getLogoutConfiguration(redirectUrl = "/login") {
  return {
    storageKey: "token",
    cookieName: "token",
    redirectUrl,
  };
}
