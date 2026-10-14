export const profileCache = new Map<string, any>();
export const connectionCache = new Map<string, any>();
export const galleryCache = new Map<string, any>();
export const projectsCache = new Map<string, any>();
// Post comments, keyed by post id: { comments, nextCursor }
export const commentsCache = new Map<string, { comments: any[]; nextCursor?: string }>();
export const interactionsCache = new Map<string, any>();
export const foldersCache = new Map<string, any>();
export const folderDetailsCache = new Map<string, any>();
export const rootItemsCache = new Map<string, any>();
export const friendsDataCache = new Map<string, { friends: any[]; requests: any[]; suggestions: any[]; timestamp: number }>();

/**
 * Call after ANY follow/friend action so every cache is dropped and
 * all mounted components (sidebar, profile page, feed) refetch.
 */
export function notifyConnectionChanged(currentUserId: string, targetId: string) {
  profileCache.delete(targetId);
  connectionCache.delete(targetId);
  connectionCache.delete(`${currentUserId}-${targetId}`);
  friendsDataCache.delete(currentUserId);
  friendsDataCache.delete(targetId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("connection-changed", { detail: { currentUserId, targetId } })
    );
  }
}
