export interface StarState {
  isStarred: boolean;
  starCount: number;
}

/**
 * Calculates the next optimistic state when a user toggles the star on a project.
 */
export function calculateOptimisticStar(currentState: StarState): StarState {
  if (currentState.isStarred) {
    return {
      isStarred: false,
      starCount: Math.max(0, currentState.starCount - 1),
    };
  }

  return {
    isStarred: true,
    starCount: currentState.starCount + 1,
  };
}

/**
 * Formats a count into a compact string representation.
 */
export function formatStarCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }

  const inThousands = count / 1000;
  // If exact whole thousand (e.g. 1000 -> 1k), don't show trailing zero
  const formatted = inThousands % 1 === 0 ? inThousands.toFixed(0) : inThousands.toFixed(1);
  return `${formatted}k`;
}

/**
 * Determines whether a given reaction represents an active star.
 * Accepts "STAR" as well as legacy reaction strings like "LIKE" / "LOVE".
 */
export function isProjectStarredByUser(reaction: string | null | undefined): boolean {
  if (!reaction) return false;
  return Boolean(reaction.trim());
}

export interface TotalProjectStats {
  totalProjects: number;
  totalStars: number;
  totalComments: number;
}

/**
 * Calculates aggregate portfolio statistics (projects, stars, comments)
 * considering cached interactions for the current user or guest.
 */
export function calculateTotalProjectStats(
  projects: any[],
  cache?: Map<string, any>,
  currentUserId?: string
): TotalProjectStats {
  const userKey = currentUserId || "guest";
  let totalStars = 0;
  let totalComments = 0;

  for (const p of projects) {
    const cacheKey = `interaction_project_${p.id}_${userKey}`;
    const cached = cache?.get(cacheKey);

    const stars = cached?.likeCount ?? p._count?.likes ?? p.likeCount ?? 0;
    const comments = cached?.commentCount ?? p._count?.comments ?? p.commentCount ?? 0;

    totalStars += Number(stars) || 0;
    totalComments += Number(comments) || 0;
  }

  return {
    totalProjects: projects.length,
    totalStars,
    totalComments,
  };
}

export interface TokenUser {
  id: string;
  username: string;
}

/**
 * Safely parses a JWT token string and extracts user id (sub/id) and username.
 */
export function getParsedTokenUser(token: string | null | undefined): TokenUser | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const rawPayload = typeof atob === "function"
      ? atob(parts[1])
      : Buffer.from(parts[1], "base64").toString("utf-8");
    const payload = JSON.parse(rawPayload);
    const id = payload.sub || payload.id || payload._id || payload.userId;
    if (!id) return null;
    return {
      id: String(id),
      username: payload.username || "User",
    };
  } catch {
    return null;
  }
}

/**
 * In browser environment, synchronously reads and decodes the JWT token from localStorage.
 */
export function getClientTokenUser(): TokenUser | null {
  if (typeof window === "undefined") return null;
  try {
    return getParsedTokenUser(localStorage.getItem("token"));
  } catch {
    return null;
  }
}

/**
 * Resolves the cache and query key for project interactions.
 * If user has a token but no resolved userId yet, returns null (meaning "resolving auth, do not treat as guest").
 * If user has no token and no user, returns "guest".
 * If userId exists, returns that userId.
 */
export function resolveInteractionUserKey(
  userId: string | null | undefined,
  hasToken: boolean
): string | null {
  if (userId) return userId;
  if (hasToken) return null;
  return "guest";
}

export interface PopoverPosition {
  top: number;
  left: number;
  placement: "top" | "bottom";
  transform: string;
  arrowLeft: number;
}

export interface RectLike {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface DimensionsLike {
  width: number;
  height: number;
}

export interface WindowDimensionsLike {
  innerWidth: number;
  innerHeight: number;
  scrollY?: number;
  scrollX?: number;
}

/**
 * Calculates deterministic, viewport-safe coordinates for a floating popover near an anchor.
 * Anchors directly adjacent to the button (margin gap) and uses transform translateY(-100%)
 * when flipped to top, guaranteeing ZERO awkward gap regardless of rendered content height.
 */
export function calculatePopoverPosition(
  anchor: RectLike,
  popup: DimensionsLike,
  win: WindowDimensionsLike
): PopoverPosition {
  const margin = 8;
  const padding = 12;
  const popupWidth = popup.width || 280;
  const popupEstimatedHeight = popup.height || 220;

  // Vertical placement: place below if room exists, otherwise flip above
  const fitsBelow = anchor.bottom + popupEstimatedHeight + margin <= win.innerHeight;
  const fitsAbove = anchor.top - popupEstimatedHeight - margin >= 0;

  let placement: "top" | "bottom" = "bottom";
  if (!fitsBelow && (fitsAbove || anchor.top > win.innerHeight - anchor.bottom)) {
    placement = "top";
  }

  // Exact anchor attachment:
  // When 'top': anchor directly to anchor.top - margin with translateY(-100%).
  // The bottom of the popover will sit exactly `margin` pixels above the button!
  // When 'bottom': anchor directly to anchor.bottom + margin with translateY(0).
  const top = placement === "top" ? anchor.top - margin : anchor.bottom + margin;
  const transform = placement === "top" ? "translateY(-100%)" : "translateY(0)";

  // Horizontal placement: center horizontally on anchor, clamp to viewport padding
  const anchorCenter = anchor.left + anchor.width / 2;
  const desiredLeft = anchorCenter - popupWidth / 2;
  const maxLeft = Math.max(padding, win.innerWidth - popupWidth - padding);
  const left = Math.max(padding, Math.min(desiredLeft, maxLeft));

  // Arrow position relative to popup left container:
  const arrowLeft = Math.max(16, Math.min(popupWidth - 16, anchorCenter - left));

  return {
    top,
    left,
    placement,
    transform,
    arrowLeft,
  };
}

export interface StargazersCacheEntry {
  users: any[];
  timestamp: number;
}

export const stargazersCache = new Map<string, StargazersCacheEntry>();

/**
 * Stores a list of stargazers in client memory cache.
 */
export function setStargazersToCache(projectId: string, users: any[]): void {
  if (!projectId) return;
  stargazersCache.set(projectId, {
    users,
    timestamp: Date.now(),
  });
}

/**
 * Retrieves cached stargazers for a project if within TTL (default: 60s).
 */
export function getStargazersFromCache(
  projectId: string,
  maxAgeMs: number = 60_000
): any[] | null {
  if (!projectId) return null;
  const entry = stargazersCache.get(projectId);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > maxAgeMs) {
    return null;
  }

  return entry.users;
}

/**
 * Invalidates the stargazers cache for a project (e.g. when toggling star).
 */
export function invalidateStargazersCache(projectId: string): void {
  if (!projectId) return;
  stargazersCache.delete(projectId);
}


