"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { getFeedPosts, getPostById } from "@/app/actions/posts";
import PostCard from "./PostCard";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { interactionsCache } from "@/utils/cache";

interface PostFeedProps {
  currentUser: any;
  onProfileClick?: (user: any, event?: any) => void;
  targetProfileId?: string;
}

function PostFeedContent({ currentUser, onProfileClick, targetProfileId }: PostFeedProps) {
  const t = useTranslations();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Simple global cache for stale-while-revalidate
  const cacheKey = targetProfileId ? `profile_${targetProfileId}` : (currentUser?.id || "anonymous");

const activeRequests = new Map<string, Promise<any>>();

  const fetchPosts = useCallback(async (isBackground = false, cursor?: string) => {
    if (!currentUser?.id) return;
    
    const requestKey = `${cacheKey}_${cursor || 'initial'}`;
    let fetchPromise = activeRequests.get(requestKey);

    if (!fetchPromise) {
      fetchPromise = getFeedPosts(currentUser.id, targetProfileId, cursor, 15);
      activeRequests.set(requestKey, fetchPromise);
      fetchPromise.finally(() => activeRequests.delete(requestKey));
    }

    try {
      if (!isBackground && !cursor) setIsLoading(true);
      if (cursor) setIsFetchingMore(true);
      
      const res = await fetchPromise;
      let loadedPosts = res.posts || [];

      if (res.success && loadedPosts) {
        // SWR Category 4: Preserve client-cached private interactions
        const activeUserId = currentUser?.id;
        const mergedPosts = activeUserId
          ? loadedPosts.map((p: any) => {
              const postCacheKey = `interaction_post_${p.id}_${activeUserId}`;
              if (interactionsCache.has(postCacheKey)) {
                const cached = interactionsCache.get(postCacheKey);
                return {
                  ...p,
                  myReaction: cached.myReaction !== undefined ? cached.myReaction : p.myReaction,
                  hasLiked: cached.myReaction ? true : false,
                  _count: {
                    ...p._count,
                    likes: cached.likeCount !== undefined ? cached.likeCount : p._count?.likes,
                    comments: cached.commentCount !== undefined ? cached.commentCount : p._count?.comments,
                  },
                  topReactions: cached.topReactions !== undefined ? cached.topReactions : p.topReactions,
                  hasSaved: cached.hasSaved !== undefined ? cached.hasSaved : p.hasSaved,
                };
              }
              return p;
            })
          : loadedPosts;

        setNextCursor(res.nextCursor);
        setPosts(prev => cursor ? [...prev, ...mergedPosts] : mergedPosts);
        if (!cursor) {
          (window as any).__POST_FEED_CACHE = (window as any).__POST_FEED_CACHE || {};
          (window as any).__POST_FEED_CACHE[cacheKey] = { posts: mergedPosts, nextCursor: res.nextCursor };
        }
      } else {
        if (!isBackground) setError(res.error || t("feed.failedToLoadPosts"));
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message);
    } finally {
      if (!isBackground && !cursor) setIsLoading(false);
      if (cursor) setIsFetchingMore(false);
    }
  }, [currentUser?.id, targetProfileId, cacheKey, t]);

  useEffect(() => {
    const cachedData = (window as any).__POST_FEED_CACHE?.[cacheKey];
    if (cachedData && cachedData.posts && cachedData.posts.length > 0) {
      setPosts(cachedData.posts);
      setNextCursor(cachedData.nextCursor);
      setIsLoading(false);
      // Revalidate in background
      fetchPosts(true);
    } else {
      fetchPosts(false);
    }
  }, [fetchPosts, cacheKey]);

  // Optionally listen for a custom event if we want to refresh when a post is created from the modal
  useEffect(() => {
    const handleRefresh = () => fetchPosts();
    const handleSilentRefresh = () => fetchPosts(true);
    
    const handlePostInteractionUpdated = (e: any) => {
      const { postId, myReaction, likeCount, commentCount, topReactions, hasSaved } = e.detail || {};
      setPosts(prev => {
        const newPosts = prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              ...(myReaction !== undefined ? { myReaction, hasLiked: !!myReaction } : {}),
              ...(likeCount !== undefined || commentCount !== undefined ? {
                _count: {
                  ...p._count,
                  ...(likeCount !== undefined ? { likes: likeCount } : {}),
                  ...(commentCount !== undefined ? { comments: commentCount } : {}),
                }
              } : {}),
              ...(topReactions !== undefined ? { topReactions } : {}),
              ...(hasSaved !== undefined ? { hasSaved } : {}),
            };
          }
          return p;
        });
        (window as any).__POST_FEED_CACHE = (window as any).__POST_FEED_CACHE || {};
        const oldCache = (window as any).__POST_FEED_CACHE[cacheKey] || {};
        (window as any).__POST_FEED_CACHE[cacheKey] = { ...oldCache, posts: newPosts };
        return newPosts;
      });
    };

    const handleMediaRemoved = (e: any) => {
      const { postId, mediaId, originalUrl } = e.detail;
      setPosts(prev => {
        const newPosts = prev.map(p => {
          if (p.id === postId) {
            let newMediaUrls = p.mediaUrls || [];
            if (originalUrl) {
              newMediaUrls = newMediaUrls.filter((url: string) => url !== originalUrl);
            }
            if (newMediaUrls.length === 0 && (!p.content || p.content.trim() === '')) return null;
            return { ...p, mediaUrls: newMediaUrls };
          }
          return p;
        }).filter(Boolean);
        (window as any).__POST_FEED_CACHE = (window as any).__POST_FEED_CACHE || {};
        const oldCache = (window as any).__POST_FEED_CACHE[cacheKey] || {};
        (window as any).__POST_FEED_CACHE[cacheKey] = { ...oldCache, posts: newPosts };
        return newPosts as any[];
      });
    };

    const handleGalleryDeleted = (e: any) => {
      const { galleryId } = e.detail;
      setPosts(prev => {
        const newPosts = prev.filter(p => p.galleryId !== galleryId);
        (window as any).__POST_FEED_CACHE = (window as any).__POST_FEED_CACHE || {};
        const oldCache = (window as any).__POST_FEED_CACHE[cacheKey] || {};
        (window as any).__POST_FEED_CACHE[cacheKey] = { ...oldCache, posts: newPosts };
        return newPosts;
      });
    };

    window.addEventListener("refresh_feed", handleRefresh);
    window.addEventListener("silent_refresh_feed", handleSilentRefresh);
    window.addEventListener("post_interaction_updated", handlePostInteractionUpdated);
    window.addEventListener("post_media_removed", handleMediaRemoved);
    window.addEventListener("gallery_deleted", handleGalleryDeleted);
    return () => {
      window.removeEventListener("refresh_feed", handleRefresh);
      window.removeEventListener("silent_refresh_feed", handleSilentRefresh);
      window.removeEventListener("post_interaction_updated", handlePostInteractionUpdated);
      window.removeEventListener("post_media_removed", handleMediaRemoved);
      window.removeEventListener("gallery_deleted", handleGalleryDeleted);
    };
  }, [fetchPosts, cacheKey]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursor && !isFetchingMore && !isLoading) {
        fetchPosts(true, nextCursor);
      }
    }, { threshold: 0.1 });
    
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    
    return () => observer.disconnect();
  }, [nextCursor, isFetchingMore, isLoading, fetchPosts]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 sm:gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-transparent sm:bg-white sm:dark:bg-[#242526] rounded-none sm:rounded-xl shadow-none sm:shadow-sm border-0 sm:border border-b border-gray-100 dark:border-[#3E4042] pt-2 px-0 sm:p-4 pb-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 sm:px-0">
              <div className="w-[40px] h-[40px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse shrink-0"></div>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3 w-1/3 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                <div className="h-2.5 w-1/4 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>
            {/* Content */}
            <div className="flex flex-col gap-2 mt-2 px-4 sm:px-0">
              <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              <div className="h-3 w-5/6 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              <div className="h-3 w-4/6 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
            </div>
            {/* Media Placeholder */}
            {i === 1 && (
              <div className="h-48 w-full bg-gray-200 dark:bg-white/10 sm:rounded-xl mt-2 animate-pulse"></div>
            )}
            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-0 sm:pt-3 border-t-0 sm:border-t border-gray-100 dark:border-white/5 px-4 sm:px-0">
              <div className="flex gap-4">
                <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse"></div>
                <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 py-10 flex flex-col items-center justify-center text-center">
        <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">{t("feed.loadError")}</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4 max-w-sm px-4">
          {t("feed.serverConnectionError")}
        </p>
        <button 
          onClick={() => fetchPosts()} 
          className="px-5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full text-[13px] font-bold transition-colors"
        >
          {t("feed.tryAgain")}
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-gray-100 dark:border-[#3E4042] py-12 flex flex-col items-center justify-center text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-[#4E4F50] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <p className="text-[16px] font-bold text-gray-700 dark:text-[#E4E6EB]">{t("feed.noPosts")}</p>
        <p className="text-[14px] text-gray-500 dark:text-[#B0B3B8] mt-1">{t("feed.noPostsDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          currentUser={currentUser} 
          onProfileClick={onProfileClick} 
        />
      ))}
      {nextCursor && (
        <div ref={observerRef} className="py-4 flex justify-center h-16">
          {isFetchingMore && (
            <div className="flex flex-col items-center justify-center w-full">
              <style>{`
                @keyframes indeterminateBar {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(150%); }
                  100% { transform: translateX(-100%); }
                }
              `}</style>
              <div className="w-[150px] h-1.5 bg-gray-200 dark:bg-[#3A3B3C] rounded-full overflow-hidden mb-2 relative">
                <div 
                  className="absolute top-0 left-0 h-full w-[40%] bg-[#1877F2] dark:bg-blue-500 rounded-full"
                  style={{ animation: 'indeterminateBar 1.5s infinite ease-in-out' }}
                ></div>
              </div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">{t("common.wait")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostFeed(props: PostFeedProps) {
  return (
    <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 dark:bg-[#242526] rounded-xl"></div>}>
      <PostFeedContent {...props} />
    </Suspense>
  );
}
