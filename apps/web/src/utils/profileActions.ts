export interface ProfileActionsParams {
  currentUserId?: string | null;
  currentUsername?: string | null;
  targetUserId?: string | null;
  targetUsername?: string | null;
  isFollowing: boolean;
}

export interface ProfileActionsResult {
  isSelf: boolean;
  showFollowButton: boolean;
  isFollowing: boolean;
}

export function getProfileActions({
  currentUserId,
  currentUsername,
  targetUserId,
  targetUsername,
  isFollowing,
}: ProfileActionsParams): ProfileActionsResult {
  const isSelfById = Boolean(
    currentUserId && targetUserId && currentUserId === targetUserId
  );
  const isSelfByUsername = Boolean(
    currentUsername &&
      targetUsername &&
      currentUsername.toLowerCase() === targetUsername.toLowerCase()
  );
  const isSelf = isSelfById || isSelfByUsername;

  return {
    isSelf,
    showFollowButton: !isSelf,
    isFollowing,
  };
}

export function calculateOptimisticFollow(
  currentIsFollowing: boolean,
  currentFollowersCount: number
): { isFollowing: boolean; followersCount: number } {
  const nextIsFollowing = !currentIsFollowing;
  const delta = nextIsFollowing ? 1 : -1;
  return {
    isFollowing: nextIsFollowing,
    followersCount: Math.max(0, currentFollowersCount + delta),
  };
}

export function getProfileUrl(
  username?: string | null,
  id?: string | null,
  locale: string = "id"
): string {
  const user = username || id || "";
  const identifier = id || username || "";
  return `/${locale}/p/${user}/${identifier}`;
}

