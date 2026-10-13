"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { MediaRenderer } from "@/components/MediaRenderer";
import { CATEGORY_COLORS, getCategoryBadgeClasses, getStatusBadgeClasses } from "@/components/ProjectCard";

import { checkInteractionState, toggleLike, incrementShareCount, toggleSave, checkBatchProjectInteractionState } from "@/app/actions/interactions";
import toast from "react-hot-toast";
import { interactionsCache } from "@/utils/cache";
import Image from "next/image";
import { useShareModal } from "@/contexts/ShareContext";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import NProgress from "nprogress";
import ProjectStarButtonDesktop from "./ProjectStarButtonDesktop";
import ProjectStarButtonMobile from "./ProjectStarButtonMobile";
import ProjectStargazersPopupDesktop from "./ProjectStargazersPopupDesktop";
import ProjectStargazersPopupMobile from "./ProjectStargazersPopupMobile";
import {
  calculateOptimisticStar,
  isProjectStarredByUser,
  getClientTokenUser,
  resolveInteractionUserKey,
  RectLike,
  invalidateStargazersCache,
} from "@/utils/projectStar";


const ShowcaseCard = ({ p, locale, t, tHub, CATEGORY_COLORS, getCategoryBadgeClasses, statusKey, currentUser, currentUserId, onOpenStargazers }: any) => {
  const router = useRouter();
  const { openShareModal } = useShareModal();
  const cover = p.coverUrls?.[0] || p.mediaUrls?.[0];
  const username = p.user?.username || "Unknown";
  const displayName = p.user?.profile?.displayName || username;
  const avatarUrl = p.user?.profile?.avatarUrl;

  const [user, setUser] = useState<any>(() => {
    if (currentUser) return currentUser;
    if (typeof window !== "undefined") {
      return getClientTokenUser();
    }
    return null;
  });
  const [isUserLoaded, setIsUserLoaded] = useState(true);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isInteractionLoading, setIsInteractionLoading] = useState(true);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(p._count?.likes || 0);
  const [commentCount, setCommentCount] = useState(p._count?.comments || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else if (typeof window !== "undefined" && !user) {
      const cu = getClientTokenUser();
      if (cu) setUser(cu);
    }
  }, [currentUser, user]);

  const loadInteractions = useCallback(() => {
    if (!isUserLoaded) return;
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const activeUserId = currentUserId || currentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);

    const userKey = resolveInteractionUserKey(activeUserId, hasToken);

    if (!userKey) {
      setIsInteractionLoading(true);
      return;
    }

    const cacheKey = `interaction_project_${p.id}_${userKey}`;
    if (interactionsCache.has(cacheKey)) {
      const cached = interactionsCache.get(cacheKey);
      setMyReaction(cached.myReaction || null);
      setLikeCount(cached.likeCount ?? p._count?.likes ?? 0);
      setCommentCount(cached.commentCount ?? p._count?.comments ?? 0);
      setIsSaved(cached.hasSaved || false);
      setIsInteractionLoading(false);
      return;
    }

    if (userKey === "guest") {
      setMyReaction(null);
      setLikeCount(p._count?.likes ?? 0);
      setCommentCount(p._count?.comments ?? 0);
      setIsSaved(false);
      setIsInteractionLoading(false);
      return;
    }

    setIsInteractionLoading(true);
    import("@/utils/interactionBatcher").then(({ fetchProjectInteraction }) => {
      fetchProjectInteraction(activeUserId, p.id).then(interaction => {
        if (interaction && interaction.success) {
          setMyReaction((interaction.myReaction as string | null) || null);
          setLikeCount(interaction.likeCount || 0);
          setCommentCount(interaction.commentCount || 0);
          setIsSaved(interaction.hasSaved || false);
        }
        setIsInteractionLoading(false);
      }).catch(() => setIsInteractionLoading(false));
    });
  }, [p.id, p._count, currentUserId, currentUser?.id, user?.id, isUserLoaded]);

  useEffect(() => {
    loadInteractions();
    const handleRefresh = () => loadInteractions();
    const handleProjectSync = (e: any) => {
      if (e.detail?.projectId === p.id) {
        if (e.detail.myReaction !== undefined) setMyReaction(e.detail.myReaction);
        if (e.detail.likeCount !== undefined) setLikeCount(e.detail.likeCount);
        if (e.detail.commentCount !== undefined) setCommentCount(e.detail.commentCount);
        if (e.detail.hasSaved !== undefined) setIsSaved(e.detail.hasSaved);
      }
    };
    window.addEventListener("refresh_projects", handleRefresh);
    window.addEventListener("project_interaction_updated", handleProjectSync);
    return () => {
      window.removeEventListener("refresh_projects", handleRefresh);
      window.removeEventListener("project_interaction_updated", handleProjectSync);
    };
  }, [loadInteractions, p.id]);

  const handleToggleStar = async () => {
    const activeUserId = currentUserId || currentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    if (!activeUserId) {
      router.push(`/${locale}/login`);
      return;
    }
    if (isLikeLoading) return;
    setIsLikeLoading(true);

    const prevStarred = isProjectStarredByUser(myReaction);
    const next = calculateOptimisticStar({ isStarred: prevStarred, starCount: likeCount });

    const cacheKey = `interaction_project_${p.id}_${activeUserId}`;
    setMyReaction(next.isStarred ? "STAR" : null);
    setLikeCount(next.starCount);

    interactionsCache.set(cacheKey, {
      ...interactionsCache.get(cacheKey),
      myReaction: next.isStarred ? "STAR" : null,
      likeCount: next.starCount,
    });
    invalidateStargazersCache(p.id);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("project_interaction_updated", {
        detail: {
          projectId: p.id,
          myReaction: next.isStarred ? "STAR" : null,
          likeCount: next.starCount,
          hasSaved: isSaved,
        }
      }));
    }

    try {
      const res = await toggleLike(activeUserId, "project", p.id, "STAR");
      if (!res?.success) {
        setMyReaction(prevStarred ? "STAR" : null);
        setLikeCount(likeCount);
        interactionsCache.set(cacheKey, {
          ...interactionsCache.get(cacheKey),
          myReaction: prevStarred ? "STAR" : null,
          likeCount: likeCount,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("project_interaction_updated", {
            detail: {
              projectId: p.id,
              myReaction: prevStarred ? "STAR" : null,
              likeCount: likeCount,
              hasSaved: isSaved,
            }
          }));
        }
      }
    } catch (e) {
      setMyReaction(prevStarred ? "STAR" : null);
      setLikeCount(likeCount);
      interactionsCache.set(cacheKey, {
        ...interactionsCache.get(cacheKey),
        myReaction: prevStarred ? "STAR" : null,
        likeCount: likeCount,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("project_interaction_updated", {
          detail: {
            projectId: p.id,
            myReaction: prevStarred ? "STAR" : null,
            likeCount: likeCount,
            hasSaved: isSaved,
          }
        }));
      }
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    
    if (isSaveLoading) return;
    setIsSaveLoading(true);

    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);

    const cacheKey = `interaction_project_${p.id}_${user.id}`;
    const existing = interactionsCache.get(cacheKey) || {};
    interactionsCache.set(cacheKey, { ...existing, hasSaved: newIsSaved });

    try {
      const res = await toggleSave(user.id, "project", p.id);
      if (!res.success) {
        setIsSaved(!newIsSaved);
        interactionsCache.set(cacheKey, { ...existing, hasSaved: !newIsSaved });
        toast.error(res.error || "Gagal menyimpan project");
      } else {
        const titleMsg = newIsSaved ? (t("savedTitle") || "Tersimpan") : (t("unsavedTitle") || "Dihapus");
        const descMsg = newIsSaved ? (t("savedDesc") || "Project telah disimpan ke koleksi Anda") : (t("unsavedDesc") || "Project telah dihapus dari koleksi Anda");
        
        const toastItem = toast.custom((tItem) => (
          <div className={`${tItem.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-[#242526] shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-100 dark:border-[#3A3B3C]`}>
            <div className="p-4 w-full">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className={`w-10 h-10 rounded-full ${newIsSaved ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 'bg-gray-100 dark:bg-[#3A3B3C] text-gray-500'} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill={newIsSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={newIsSaved ? 0 : 2} d={newIsSaved ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-[#E4E6EB]">{titleMsg}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#B0B3B8]">{descMsg}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button onClick={() => toast.dismiss(tItem.id)} className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 3000, position: 'bottom-center' });
        
        window.dispatchEvent(new Event("refresh_projects"));
      }
    } catch (error) {
      setIsSaved(!newIsSaved);
      interactionsCache.set(cacheKey, { ...existing, hasSaved: !newIsSaved });
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSaveLoading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${locale}/project/${username}/${p.id}`;
    openShareModal({
      id: p.id,
      type: "PROJECT",
      title: p.title || undefined,
      text: p.description || undefined,
      url,
      authorName: displayName,
      authorUsername: username,
      authorAvatar: avatarUrl,
    });
  };

  return (
    <div
      key={p.id}
      className="bg-white dark:bg-[#242526] sm:rounded-[20px] sm:shadow-sm sm:border sm:border-gray-100 sm:dark:border-[#3A3B3C] transition-all sm:hover:shadow-md sm:hover:-translate-y-0.5 flex flex-col md:flex-row min-h-0 md:min-h-[180px] group/card relative overflow-hidden"
    >
      <div className="w-full md:w-[260px] md:shrink-0 relative group/cover cursor-pointer sm:rounded-t-2xl md:rounded-tr-none md:rounded-l-[20px] overflow-hidden">
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20">
          {isInteractionLoading ? (
            <div className="w-[30px] h-[30px] sm:w-[32px] sm:h-[32px] rounded-full bg-white/50 dark:bg-black/50 animate-pulse border border-black/5 dark:border-white/5"></div>
          ) : (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave(e);
              }}
              disabled={isSaveLoading}
              className={`flex items-center justify-center p-1.5 rounded-full transition-colors backdrop-blur-sm shadow-sm border border-black/5 dark:border-white/5 ${
                isSaved 
                  ? 'text-orange-500 bg-white/90 dark:bg-[#242526]/90' 
                  : 'text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-[#242526]/70 hover:bg-white/90 dark:hover:bg-[#242526]/90'
              }`}
              title={isSaved ? "Tersimpan" : "Simpan Project"}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 0 : 2} d={isSaved ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
              </svg>
            </button>
          )}
        </div>

        <div 
          onClick={() => { NProgress.start(); router.push(`/${locale}/project/${username}/${p.id}`); }}
          className="w-full aspect-[16/9] md:aspect-auto md:absolute md:inset-0 relative z-0"
        >
          {cover ? (
            <MediaRenderer url={cover} className="absolute inset-0 w-full h-full object-cover bg-gray-100 dark:bg-[#3A3B3C]" />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-400">
              <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 sm:p-5 flex flex-col flex-grow relative z-10 w-full min-w-0">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3 mb-1.5 sm:mb-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/${locale}/project/${username}/${p.id}`}
              onClick={() => NProgress.start()}
              className="text-gray-900 dark:text-[#E4E6EB] font-bold text-[15px] sm:text-[17px] leading-snug line-clamp-2 after:absolute after:inset-0 after:z-0 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {p.title}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:mt-1.5 relative z-10">
              {p.category && (
                <span className={getCategoryBadgeClasses(CATEGORY_COLORS[p.category] || "blue")}>
                  {p.category === "OTHER" ? p.customCategory : t(`cat_${p.category}` as any)}
                </span>
              )}
              {p.isForSale && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  FOR SALE
                </span>
              )}
            </div>
          </div>
          <span className={getStatusBadgeClasses(p.status) + " relative z-10 shrink-0 text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 mt-0.5"}>
            {t(statusKey(p.status))}
          </span>
        </div>

        <p className="text-gray-600 dark:text-[#B0B3B8] text-[12px] sm:text-[13px] leading-relaxed whitespace-pre-line line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4 flex-grow">
          {p.description}
        </p>

        <div className="mt-auto">
          {p.techStack?.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
              {p.techStack.slice(0, 3).map((tech: string) => (
                <span
                  key={tech}
                  className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition-colors bg-gray-100 text-gray-600 dark:bg-[#3A3B3C] dark:text-[#E4E6EB]"
                >
                  {tech}
                </span>
              ))}
              {p.techStack.length > 3 && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-[#3A3B3C] dark:text-[#E4E6EB]">
                  +{p.techStack.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-[#3A3B3C] gap-2">
            <Link href={`/${locale}/project/${username}`} className="flex items-center gap-2 group/user relative z-10 min-w-0">
              <img
                src={avatarUrl || "/default-avatar.svg"}
                alt={displayName}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 border border-gray-100 dark:border-[#3A3B3C]"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] sm:text-[13px] font-semibold text-gray-700 dark:text-[#E4E6EB] group-hover/user:text-purple-600 dark:group-hover/user:text-purple-400 transition-colors leading-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                  {displayName}
                </span>
                <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  @{username}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2.5 relative z-10 shrink-0" onClick={(e) => e.stopPropagation()}>
              <ProjectStarButtonDesktop
                isStarred={isProjectStarredByUser(myReaction)}
                starCount={likeCount}
                isLoading={isLikeLoading}
                isInteractionLoading={isInteractionLoading}
                onToggleStar={handleToggleStar}
                onOpenStargazers={(rect) => onOpenStargazers?.(p.id, p.title, rect)}
              />
              <ProjectStarButtonMobile
                isStarred={isProjectStarredByUser(myReaction)}
                starCount={likeCount}
                isLoading={isLikeLoading}
                isInteractionLoading={isInteractionLoading}
                onToggleStar={handleToggleStar}
                onOpenStargazers={(rect) => onOpenStargazers?.(p.id, p.title, rect)}
              />
              
              <button 
                onClick={() => {
                  if (typeof window !== "undefined" && (window as any).NProgress) (window as any).NProgress.start();
                  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
                  const targetUrl = isMobile 
                    ? `/${locale}/project/${username}/${p.id}?openComments=true` 
                    : `/${locale}/project/${username}/${p.id}#comments`;
                  router.push(targetUrl);
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-[#3A3B3C] dark:hover:text-purple-400 transition-colors font-medium text-[11px] sm:text-[13px] bg-transparent"
                title={t("comment") || "Komentar"}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="hidden xs:inline">{t("comment")}</span>
                {isInteractionLoading ? (
                  <div className="w-3 h-3.5 bg-gray-200 dark:bg-[#3A3B3C] animate-pulse rounded ml-0.5"></div>
                ) : commentCount > 0 ? (
                  <span className="ml-0.5 text-gray-400 dark:text-gray-500 font-semibold">{commentCount}</span>
                ) : null}
              </button>
              
              <button onClick={handleShare} className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-[#3A3B3C] dark:hover:text-purple-400 transition-colors font-medium text-[11px] sm:text-[13px] bg-transparent">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                <span className="hidden xs:inline">{t("share")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProjectShowcase({ projects, title, subtitle }: { projects: any[], title?: string, subtitle?: string }) {
  const t = useTranslations("project");
  const tHub = useTranslations("projectShowcase");
  const locale = useLocale();

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [showFilter, setShowFilter] = useState(false);
  const [showCreatorsTooltip, setShowCreatorsTooltip] = useState(false);
  const [isCreatorsExpanded, setIsCreatorsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [showStickyCategories, setShowStickyCategories] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stargazersTarget, setStargazersTarget] = useState<{
    projectId: string;
    projectTitle?: string;
    anchorRect: RectLike;
  } | null>(null);
  const staticHeaderRef = useRef<HTMLDivElement>(null);
  const stickyCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = getClientTokenUser();
      setCurrentUser(u);
    }
  }, []);

  useEffect(() => {
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const activeUserId = currentUser?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    const currentUserKey = resolveInteractionUserKey(activeUserId, hasToken);

    if (!currentUserKey || !projects?.length) return;

    const uncachedIds = projects
      .map((p: any) => p.id)
      .filter((id: string) => !interactionsCache.has(`interaction_project_${id}_${currentUserKey}`));

    if (!uncachedIds.length) return;

    checkBatchProjectInteractionState(activeUserId, uncachedIds)
      .then((batchResult: Record<string, any>) => {
        for (const id of uncachedIds) {
          const data = batchResult[id];
          if (data) {
            interactionsCache.set(`interaction_project_${id}_${currentUserKey}`, {
              myReaction: data.myReaction,
              likeCount: data.likeCount,
              commentCount: data.commentCount,
              topReactions: data.topReactions,
              hasSaved: data.hasSaved,
            });
          }
        }
        window.dispatchEvent(new Event("refresh_projects"));
      })
      .catch((err) => {
        console.error("Batch interaction error:", err);
      });
  }, [currentUser?.id, projects]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      if (!staticHeaderRef.current) return;
      const rect = staticHeaderRef.current.getBoundingClientRect();
      const isPast = rect.top < 56;

      setIsScrolledPastHero(isPast);
      if (!isPast) {
        setShowStickyCategories(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // To handle Next.js scroll restoration which might happen slightly after mount
    // without triggering a scroll event, we check the position a few times.
    let checkCount = 0;
    const interval = setInterval(() => {
      handleScroll();
      checkCount++;
      if (checkCount >= 10) clearInterval(interval); // Check 10 times (500ms total)
    }, 50);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, []);

  const catColors: Record<string, { activeCard: string; inactiveCard: string; activeIcon: string; inactiveIcon: string; }> = {
    blue: {
      activeCard: "bg-blue-500 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-blue-200 border-b-[4px] border-b-blue-300 text-slate-700 hover:bg-blue-50 dark:bg-[#242526] dark:border-blue-900/50 dark:border-b-[4px] dark:border-b-blue-800/60 dark:text-slate-300 dark:hover:bg-blue-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
    },
    emerald: {
      activeCard: "bg-emerald-500 border-emerald-600 text-white dark:bg-emerald-600 dark:border-emerald-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-emerald-200 border-b-[4px] border-b-emerald-300 text-slate-700 hover:bg-emerald-50 dark:bg-[#242526] dark:border-emerald-900/50 dark:border-b-[4px] dark:border-b-emerald-800/60 dark:text-slate-300 dark:hover:bg-emerald-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
    },
    rose: {
      activeCard: "bg-rose-500 border-rose-600 text-white dark:bg-rose-600 dark:border-rose-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-rose-200 border-b-[4px] border-b-rose-300 text-slate-700 hover:bg-rose-50 dark:bg-[#242526] dark:border-rose-900/50 dark:border-b-[4px] dark:border-b-rose-800/60 dark:text-slate-300 dark:hover:bg-rose-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
    },
    purple: {
      activeCard: "bg-purple-500 border-purple-600 text-white dark:bg-purple-600 dark:border-purple-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-purple-200 border-b-[4px] border-b-purple-300 text-slate-700 hover:bg-purple-50 dark:bg-[#242526] dark:border-purple-900/50 dark:border-b-[4px] dark:border-b-purple-800/60 dark:text-slate-300 dark:hover:bg-purple-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
    },
    orange: {
      activeCard: "bg-orange-500 border-orange-600 text-white dark:bg-orange-600 dark:border-orange-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-orange-200 border-b-[4px] border-b-orange-300 text-slate-700 hover:bg-orange-50 dark:bg-[#242526] dark:border-orange-900/50 dark:border-b-[4px] dark:border-b-orange-800/60 dark:text-slate-300 dark:hover:bg-orange-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
    },
    cyan: {
      activeCard: "bg-cyan-500 border-cyan-600 text-white dark:bg-cyan-600 dark:border-cyan-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-cyan-200 border-b-[4px] border-b-cyan-300 text-slate-700 hover:bg-cyan-50 dark:bg-[#242526] dark:border-cyan-900/50 dark:border-b-[4px] dark:border-b-cyan-800/60 dark:text-slate-300 dark:hover:bg-cyan-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400"
    },
    amber: {
      activeCard: "bg-amber-500 border-amber-600 text-white dark:bg-amber-600 dark:border-amber-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-amber-200 border-b-[4px] border-b-amber-300 text-slate-700 hover:bg-amber-50 dark:bg-[#242526] dark:border-amber-900/50 dark:border-b-[4px] dark:border-b-amber-800/60 dark:text-slate-300 dark:hover:bg-amber-900/20",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
    },
    slate: {
      activeCard: "bg-slate-600 border-slate-700 text-white dark:bg-slate-600 dark:border-slate-500 dark:text-white shadow-md",
      inactiveCard: "bg-white border-slate-200 border-b-[4px] border-b-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-[#242526] dark:border-slate-700 dark:border-b-[4px] dark:border-b-slate-600 dark:text-slate-300 dark:hover:bg-slate-800",
      activeIcon: "bg-white/25 text-white dark:bg-white/20",
      inactiveIcon: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
    }
  };

  const categories = [
    { key: "WEB_DEV", color: "blue", label: "Web Dev", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
    { key: "MOBILE_APP", color: "emerald", label: "Mobile Apps", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
    { key: "GAME_DEV", color: "rose", label: "Game Dev", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg> },
    { key: "DATA_AI", color: "purple", label: "Data & AI", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { key: "DESKTOP_APP", color: "cyan", label: "Desktop Apps", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    { key: "OPEN_SOURCE", color: "slate", label: "Open Source", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { key: "UI_UX", color: "rose", label: "UI/UX Design", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
    { key: "GRAPHIC_DESIGN", color: "orange", label: "Graphic Design", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> },
    { key: "ANIMATION_3D", color: "purple", label: "3D & Animation", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { key: "VIDEO_FILM", color: "amber", label: "Video & Film", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
    { key: "MUSIC_AUDIO", color: "emerald", label: "Music & Audio", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg> },
    { key: "ECOMMERCE", color: "blue", label: "E-Commerce", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { key: "SAAS", color: "cyan", label: "SaaS", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
    { key: "FINTECH", label: "Fintech", color: "emerald", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { key: "SOCIAL_IMPACT", color: "rose", label: "Social Impact", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
    { key: "IOT", color: "amber", label: "IoT", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg> },
    { key: "ROBOTICS", color: "slate", label: "Robotics", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
    { key: "ELECTRONICS", color: "orange", label: "Electronics", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg> },
    { key: "EDTECH", color: "blue", label: "EdTech", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v6" /></svg> },
    { key: "RESEARCH", color: "purple", label: "Research", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
    { key: "OTHER", color: "slate", label: "Other", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg> }
  ];

  const statusFilters = [
    { key: "ALL", label: tHub("filterAll") },
    { key: "FOR_SALE", label: tHub("filterForSale") },
    { key: "RELEASED", label: t("statusReleased") },
    { key: "IN_PROGRESS", label: t("statusInProgress") },
    { key: "OPEN_SOURCE", label: t("statusOpenSource") },
    { key: "SEARCHING_TEAM", label: t("statusSearchingTeam") },
    { key: "HIATUS", label: t("statusHiatus") },
  ];



  const activeCreators = useMemo(() => {
    const userMap = new Map<string, {
      username: string;
      displayName: string;
      avatarUrl: string;
      totalLikes: number;
      totalComments: number;
      totalProjects: number;
    }>();

    projects.forEach((p) => {
      if (!p.user || !p.user.username) return;
      const username = p.user.username;
      const likes = p._count?.likes || 0;
      const comments = p._count?.comments || 0;

      const existing = userMap.get(username);
      if (existing) {
        existing.totalLikes += likes;
        existing.totalComments += comments;
        existing.totalProjects += 1;
      } else {
        userMap.set(username, {
          username,
          displayName: p.user.profile?.displayName || username,
          avatarUrl: p.user.profile?.avatarUrl,
          totalLikes: likes,
          totalComments: comments,
          totalProjects: 1,
        });
      }
    });

    let remainingUsers = Array.from(userMap.values());

    // Sort by most popular (likes primary, comments secondary)
    const sortedByPopularity = [...remainingUsers].sort((a, b) => {
      if (b.totalLikes !== a.totalLikes) return b.totalLikes - a.totalLikes;
      return (b.totalComments || 0) - (a.totalComments || 0);
    });
    const top3Popular = sortedByPopularity.slice(0, 3);

    // Remove top3 from remaining
    const top3Set = new Set(top3Popular.map(u => u.username));
    remainingUsers = remainingUsers.filter(u => !top3Set.has(u.username));

    // Sort remaining by most projects
    const sortedByProjects = [...remainingUsers].sort((a, b) => b.totalProjects - a.totalProjects);
    const top4Projects = sortedByProjects.slice(0, 4);

    // Remove top4 projects from remaining
    const top4ProjectsSet = new Set(top4Projects.map(u => u.username));
    remainingUsers = remainingUsers.filter(u => !top4ProjectsSet.has(u.username));

    // Take 3 random from remainder (only if mounted to prevent hydration mismatch)
    const random3 = [...remainingUsers].sort(() => 0.5 - (mounted ? Math.random() : 0.5)).slice(0, 3);

    const combined = [...top3Popular, ...top4Projects, ...random3];

    return combined.map((c, i) => ({ ...c, isPopular: i < 3 }));
  }, [projects, mounted]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.user?.username?.toLowerCase().includes(q) ||
        p.user?.profile?.displayName?.toLowerCase().includes(q) ||
        p.techStack?.some((t: string) => t.toLowerCase().includes(q));
      let matchStatus = true;
      if (activeStatus === "FOR_SALE") {
        // "For Sale" only shows projects that are released AND marked for sale
        matchStatus = p.status === "RELEASED" && p.isForSale === true;
      } else if (activeStatus !== "ALL") {
        matchStatus = p.status === activeStatus;
      }

      const matchCategory = activeCategory === "ALL" || p.category === activeCategory || (!p.category && activeCategory === "SOFTWARE_IT");
      return matchSearch && matchStatus && matchCategory;
    });
  }, [projects, search, activeStatus, activeCategory]);

  // When search is active, compute matching users from project data
  const searchedUsers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return activeCreators.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q)
    );
  }, [search, activeCreators]);

  const statusKey = (status: string) =>
    ({ RELEASED: "statusReleased", IN_PROGRESS: "statusInProgress", OPEN_SOURCE: "statusOpenSource", SEARCHING_TEAM: "statusSearchingTeam", HIATUS: "statusHiatus" } as Record<string, string>)[status] || "statusReleased";

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-16 overflow-x-hidden">
      {title && subtitle && (
        <div className="flex items-end justify-between mb-1 sm:mb-2 px-3 lg:px-0">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-[#E4E6EB] tracking-tight">{title}</h1>
            <p className="text-gray-500 dark:text-[#B0B3B8] text-xs sm:text-[14px] mt-1 line-clamp-2">{subtitle}</p>
          </div>
        </div>
      )}

      {/* HERO CATEGORIES CAROUSEL */}
      <div ref={carouselRef} className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 sm:pb-4 pt-1 sm:pt-2 px-3 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth max-w-full">
        {categories.map((c) => {
          const count = projects.filter((p) => p.category === c.key || (!p.category && c.key === "WEB_DEV")).length;
          const style = catColors[c.color] || catColors.slate;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(activeCategory === c.key ? "ALL" : c.key)}
              className={`shrink-0 w-[105px] sm:w-[120px] snap-start flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all relative ${activeCategory === c.key
                ? style.activeCard + " translate-y-[2px]"
                : style.inactiveCard + " hover:-translate-y-1 hover:shadow-md transition-all shadow-sm"
                }`}
            >
              <div className={`mb-2 sm:mb-3 p-2 sm:p-2.5 rounded-full transition-colors shadow-xs ${activeCategory === c.key ? style.activeIcon : style.inactiveIcon}`}>
                {c.icon}
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold text-center leading-tight tracking-wide mb-0.5 sm:mb-1">{c.label}</span>
              <span className="text-[9px] sm:text-[10px] font-medium opacity-70">{count} project</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-6 items-start w-full">
        {/* LEFT: Project Cards */}
        <div className="flex-1 min-w-0">

          {/* STATIC HEADER (Only visible when at top, NO EXPAND TRIGGER) */}
          <div ref={staticHeaderRef} className="px-3 py-2 mb-3 sm:bg-white/90 sm:dark:bg-[#242526]/90 sm:backdrop-blur-md sm:px-5 sm:py-3.5 sm:mb-6 sm:border sm:border-gray-200 sm:dark:border-[#4E4F50] sm:shadow-sm sm:rounded-[28px] opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h2 className="text-[13px] sm:text-[15px] font-bold text-gray-800 dark:text-[#E4E6EB] ml-0.5 sm:ml-1 truncate">
                  {tHub("categoryTitle")} <span className="text-purple-600 dark:text-purple-400">{activeCategory === "ALL" ? tHub("allCategories") : categories.find(c => c.key === activeCategory)?.label}</span>
                </h2>
                {activeCategory !== "ALL" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCategory("ALL");
                    }}
                    className="w-5 h-5 shrink-0 rounded-full bg-gray-100 dark:bg-[#3A3B3C] text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"
                    title="Reset Category"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              <div className="hidden sm:flex gap-2 shrink-0">
                <button
                  onClick={() => carouselRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full bg-white dark:bg-[#3A3B3C] border border-gray-200 dark:border-[#535455] shadow-[0_3px_0_0_#d1d5db] dark:shadow-[0_3px_0_0_#1a1a1a] flex items-center justify-center text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200 dark:hover:bg-[#4E4F50] active:shadow-none active:translate-y-[3px] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => carouselRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full bg-white dark:bg-[#3A3B3C] border border-gray-200 dark:border-[#535455] shadow-[0_3px_0_0_#d1d5db] dark:shadow-[0_3px_0_0_#1a1a1a] flex items-center justify-center text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200 dark:hover:bg-[#4E4F50] active:shadow-none active:translate-y-[3px] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

            </div>
          </div>

          {/* CLONED FLOATING HEADER (Appears on scroll, WITH EXPAND TRIGGER) */}
          <div className={`fixed top-14 left-0 right-0 z-40 pointer-events-none flex justify-center ${isScrolledPastHero ? "transition-transform duration-300 translate-y-0" : "transition-none -translate-y-full"}`}>
            <div className="max-w-[1200px] w-full px-3 sm:px-4 flex gap-6">
              {/* Left Column matching */}
              <div className="flex-1 min-w-0 pointer-events-auto">
                <div className="bg-white/95 dark:bg-[#242526]/95 backdrop-blur-md px-3.5 sm:px-5 py-2.5 sm:py-3.5 border border-gray-200 dark:border-[#4E4F50] shadow-sm rounded-2xl sm:rounded-[28px] mt-2 sm:mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <h2 className="text-[13px] sm:text-[15px] font-bold text-gray-800 dark:text-[#E4E6EB] ml-0.5 sm:ml-1 truncate">
                        {tHub("categoryTitle")} <span className="text-purple-600 dark:text-purple-400">{activeCategory === "ALL" ? tHub("allCategories") : categories.find(c => c.key === activeCategory)?.label}</span>
                      </h2>
                      {activeCategory !== "ALL" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCategory("ALL");
                          }}
                          className="w-5 h-5 shrink-0 rounded-full bg-gray-100 dark:bg-[#3A3B3C] text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"
                          title="Reset Category"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                      {showStickyCategories && (
                        <button
                          onClick={() => setShowStickyCategories(false)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors mr-0.5 sm:mr-1"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!showStickyCategories) setShowStickyCategories(true);
                          else stickyCarouselRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-[#3A3B3C] border border-gray-200 dark:border-[#535455] shadow-[0_2px_0_0_#d1d5db] sm:shadow-[0_3px_0_0_#d1d5db] dark:shadow-[0_2px_0_0_#1a1a1a] flex items-center justify-center text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200 dark:hover:bg-[#4E4F50] active:shadow-none active:translate-y-[2px] transition-all"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        onClick={() => {
                          if (!showStickyCategories) setShowStickyCategories(true);
                          else stickyCarouselRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-[#3A3B3C] border border-gray-200 dark:border-[#535455] shadow-[0_2px_0_0_#d1d5db] sm:shadow-[0_3px_0_0_#d1d5db] dark:shadow-[0_2px_0_0_#1a1a1a] flex items-center justify-center text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200 dark:hover:bg-[#4E4F50] active:shadow-none active:translate-y-[2px] transition-all"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className={`grid transition-all duration-300 ease-in-out ${showStickyCategories ? "grid-rows-[1fr] opacity-100 mt-3 sm:mt-4" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
                    <div className="overflow-hidden">
                      <div ref={stickyCarouselRef} className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 sm:pb-4 pt-1 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth max-w-full">
                        {categories.map((c) => {
                          const count = projects.filter((p) => p.category === c.key || (!p.category && c.key === "WEB_DEV")).length;
                          const style = catColors[c.color] || catColors.slate;
                          return (
                            <button
                              key={c.key + "-fixed"}
                              onClick={() => setActiveCategory(activeCategory === c.key ? "ALL" : c.key)}
                              className={`shrink-0 w-[105px] sm:w-[120px] snap-start flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all relative ${activeCategory === c.key
                                ? style.activeCard + " translate-y-[2px]"
                                : style.inactiveCard + " hover:-translate-y-1 hover:shadow-md transition-all shadow-sm"
                                }`}
                            >
                              <div className={`mb-2 sm:mb-3 p-2 sm:p-2.5 rounded-full transition-colors shadow-xs ${activeCategory === c.key ? style.activeIcon : style.inactiveIcon}`}>
                                {c.icon}
                              </div>
                              <span className="text-[11px] sm:text-[12px] font-bold text-center leading-tight tracking-wide mb-0.5 sm:mb-1">{c.label}</span>
                              <span className="text-[9px] sm:text-[10px] font-medium opacity-70">{count} project</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right Column Spacer */}
              <div className="w-[300px] shrink-0 hidden lg:block pointer-events-none"></div>
            </div>
          </div>

          {/* MOBILE SEARCH & FILTER BAR (Only on mobile/tablet < lg) */}
          <div className="lg:hidden flex flex-col gap-3 mb-5 px-3">
            {/* Search Input Mobile */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tHub("searchPlaceholder")}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-[#242526] text-gray-900 dark:text-[#E4E6EB] text-[14px] outline-none border border-gray-200 dark:border-[#4E4F50] focus:border-purple-400 dark:focus:border-purple-500 transition-colors placeholder:text-gray-400 shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Filter Chips (Horizontal Scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-full">
              {statusFilters.map((f) => (
                <button
                  key={f.key + "-mobile"}
                  onClick={() => setActiveStatus(f.key)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activeStatus === f.key
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white dark:bg-[#242526] text-gray-600 dark:text-[#E4E6EB] border border-gray-200 dark:border-[#3A3B3C] hover:bg-gray-50 dark:hover:bg-[#3A3B3C]/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Mobile Creators Section */}
            {search.trim() ? (
              /* ---- Search mode: show matching users ---- */
              <div>
                <p className="text-[13px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wide px-1 mb-2">
                  {tHub("searchResultsTitle")} ({searchedUsers.length})
                </p>
                {searchedUsers.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-4 px-3 text-center">
                    <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      {tHub("searchNoUser")}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto sidebar-scrollbar pr-0.5 overscroll-contain">
                    {searchedUsers.map((user) => (
                      <Link
                        key={user.username + "-m-search"}
                        href={`/${locale}/project/${user.username}`}
                        className="relative flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all group/creator hover:bg-gray-100 dark:hover:bg-[#3A3B3C]/50 shrink-0 min-h-[58px]"
                      >
                        <div className="relative shrink-0 flex items-center">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                              className="w-10 h-10 rounded-full object-cover relative z-10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-[15px] relative z-10 shrink-0">
                              {user.displayName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0 flex-grow relative z-10">
                          <div className="flex items-center w-full">
                            <span className="text-[13px] font-bold text-gray-800 dark:text-[#E4E6EB] group-hover/creator:text-purple-600 dark:group-hover/creator:text-purple-400 truncate leading-tight transition-colors">
                              {tHub("userProjects", { name: user.displayName })}
                            </span>
                            {user.isPopular && (
                              <img
                                src="/red-elektro.gif"
                                alt="Popular Electro"
                                className="h-[22px] w-auto shrink-0 pointer-events-none mix-blend-screen ml-1 -translate-y-0.5"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1 w-full">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate pr-2">
                              @{user.username}
                            </span>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[10px] font-medium shrink-0 opacity-70 group-hover/creator:opacity-100 transition-opacity">
                              <div className="flex items-center gap-0.5" title={t("projects")}>
                                <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                {user.totalProjects}
                              </div>
                              <div className="flex items-center gap-0.5" title={t("stars")}>
                                <img src="/star-label.svg" alt={t("stars")} className="w-[11px] h-[11px] opacity-70 dark:invert shrink-0" />
                                {user.totalLikes}
                              </div>
                              <div className="flex items-center gap-0.5" title={t("comments")}>
                                <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {user.totalComments}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              activeCreators.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-1 mb-2 relative group/info">
                    <p className="text-[13px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wide">
                      {tHub("activeCreators")}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreatorsTooltip(prev => !prev);
                      }}
                      className="p-1 -m-1 text-gray-400 hover:text-purple-500 cursor-pointer rounded-full transition-colors focus:outline-none"
                      title={tHub("activeCreatorsTooltipTitle")}
                      aria-label="Info Kreator Aktif"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    {showCreatorsTooltip && (
                      <div className="fixed inset-0 z-40" onClick={() => setShowCreatorsTooltip(false)} />
                    )}

                    <div className={`absolute left-0 top-full mt-1.5 w-[280px] max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#242526] text-gray-700 dark:text-[#E4E6EB] text-[12px] rounded-xl border border-gray-200 dark:border-[#3A3B3C] shadow-xl p-3 z-50 transition-all ${
                      showCreatorsTooltip 
                        ? "opacity-100 visible pointer-events-auto" 
                        : "opacity-0 invisible pointer-events-none group-hover/info:opacity-100 group-hover/info:visible"
                    }`}>
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100 dark:border-[#3A3B3C]">
                        <p className="font-bold text-gray-800 dark:text-[#E4E6EB] text-[13px]">{tHub("activeCreatorsTooltipTitle")}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreatorsTooltip(false);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <ul className="flex flex-col gap-1.5 text-[11px] font-medium text-gray-600 dark:text-[#B0B3B8] leading-relaxed text-left whitespace-normal break-words">
                        <li>{tHub("activeCreatorsTooltip1")}</li>
                        <li>{tHub("activeCreatorsTooltip2")}</li>
                        <li>{tHub("activeCreatorsTooltip3")}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 transition-all">
                    {(isCreatorsExpanded ? activeCreators : activeCreators.slice(0, 4)).map((creator) => (
                      <Link
                        key={creator.username + "-m-creator"}
                        href={`/${locale}/project/${creator.username}`}
                        className="relative flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all group/creator hover:bg-gray-100 dark:hover:bg-[#3A3B3C]/50 shrink-0 min-h-[58px]"
                      >
                        <div className="relative shrink-0 flex items-center">
                          {creator.avatarUrl ? (
                            <img
                              src={creator.avatarUrl}
                              alt={creator.displayName}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                              className="w-10 h-10 rounded-full object-cover relative z-10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-[15px] relative z-10 shrink-0">
                              {creator.displayName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0 flex-grow relative z-10">
                          <div className="flex items-center w-full">
                            <span className="text-[13px] font-bold text-gray-800 dark:text-[#E4E6EB] group-hover/creator:text-purple-600 dark:group-hover/creator:text-purple-400 truncate leading-tight transition-colors">
                              {tHub("userProjects", { name: creator.displayName })}
                            </span>
                            {creator.isPopular && (
                              <img
                                src="/red-elektro.gif"
                                alt="Popular Electro"
                                className="h-[22px] w-auto shrink-0 pointer-events-none mix-blend-screen ml-1 -translate-y-0.5"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1 w-full">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate pr-2">
                              @{creator.username}
                            </span>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[10px] font-medium shrink-0 opacity-70 group-hover/creator:opacity-100 transition-opacity">
                              <div className="flex items-center gap-0.5" title={t("projects")}>
                                <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                {creator.totalProjects}
                              </div>
                              <div className="flex items-center gap-0.5" title={t("stars")}>
                                <img src="/star-label.svg" alt={t("stars")} className="w-[11px] h-[11px] opacity-70 dark:invert shrink-0" />
                                {creator.totalLikes}
                              </div>
                              <div className="flex items-center gap-0.5" title={t("comments")}>
                                <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {creator.totalComments}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {activeCreators.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatorsExpanded((prev) => !prev)}
                      className="w-full mt-1.5 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[#3A3B3C]/70 dark:hover:bg-[#3A3B3C] dark:text-[#E4E6EB] border border-gray-200/50 dark:border-[#4E4F50]/50 shadow-xs cursor-pointer active:scale-[0.99]"
                    >
                      <span>
                        {isCreatorsExpanded ? tHub("showLess") : tHub("seeAll")}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${
                          isCreatorsExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            )}
          </div>


          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#242526] sm:rounded-2xl sm:border sm:border-gray-100 sm:dark:border-[#3A3B3C]">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 dark:text-[#B0B3B8] font-medium">{tHub("noResults")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-0 sm:gap-5 divide-y-4 divide-[#ADADAD] dark:divide-[#E0E0E0] sm:divide-y-0">
              {filtered.map((p: any) => (
                <ShowcaseCard 
                  key={p.id} 
                  p={p} 
                  locale={locale} 
                  t={t} 
                  tHub={tHub}
                  CATEGORY_COLORS={CATEGORY_COLORS}
                  getCategoryBadgeClasses={getCategoryBadgeClasses}
                  statusKey={statusKey}
                  currentUser={currentUser}
                  currentUserId={currentUser?.id}
                  onOpenStargazers={(projectId: string, projectTitle?: string, anchorRect?: RectLike) => {
                    if (anchorRect) {
                      setStargazersTarget({ projectId, projectTitle, anchorRect });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Search & Filter Sidebar */}
        <div className="hidden lg:flex w-[300px] shrink-0 flex-col self-start sticky top-16 z-20 pb-12">
          <div className="relative shrink-0 pb-4 z-[60]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wide">
                {tHub("searchTitle")}
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={`h-7 px-2.5 rounded-full flex items-center gap-1.5 transition-colors ${showFilter || activeStatus !== "ALL"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                    : "bg-gray-200 text-gray-600 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] hover:bg-gray-300 dark:hover:bg-[#4E4F50]"
                    }`}
                >
                  <span className="text-[11px] font-bold whitespace-nowrap">
                    {statusFilters.find(f => f.key === activeStatus)?.label}
                  </span>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>

                {/* Filter Popup */}
                {showFilter && (
                  <>
                    {/* Invisible overlay to close on outside click */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-[220px] bg-white dark:bg-[#242526] rounded-xl border border-gray-100 dark:border-[#3A3B3C] shadow-lg p-2 z-50">
                      <p className="text-[12px] font-bold text-gray-500 dark:text-[#B0B3B8] px-2 py-1 mb-1 uppercase tracking-wide">{tHub("filterStatus")}</p>
                      <div className="flex flex-col gap-1">
                        {statusFilters.map((f) => (
                          <button
                            key={f.key}
                            onClick={() => { setActiveStatus(f.key); setShowFilter(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeStatus === f.key
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                              : "text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C]"
                              }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tHub("searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#242526] text-gray-900 dark:text-[#E4E6EB] text-[14px] outline-none border border-gray-200 dark:border-[#4E4F50] focus:border-purple-400 dark:focus:border-purple-500 transition-colors placeholder:text-gray-400 shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE CREATORS / SEARCH RESULTS HEADERS */}
          <div className="shrink-0 mb-3 z-50 relative">
            {search.trim() ? (
              <p className="text-[13px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wide px-1">
                {tHub("searchResultsTitle")}
              </p>
            ) : (
              activeCreators.length > 0 && (
                <div className="flex items-center gap-1.5 px-1 relative">
                  <p className="text-[13px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wide">
                    {tHub("activeCreators")}
                  </p>
                  <div className="relative inline-flex items-center group/info">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreatorsTooltip(prev => !prev);
                      }}
                      className="p-1 -m-1 text-gray-400 hover:text-purple-500 cursor-pointer rounded-full transition-colors focus:outline-none"
                      title={tHub("activeCreatorsTooltipTitle")}
                      aria-label="Info Kreator Aktif"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    {showCreatorsTooltip && (
                      <div className="fixed inset-0 z-40" onClick={() => setShowCreatorsTooltip(false)} />
                    )}

                    <div className={`absolute right-0 top-full mt-2 w-[280px] bg-white dark:bg-[#242526] text-gray-700 dark:text-[#E4E6EB] text-[12px] rounded-xl border border-gray-200 dark:border-[#3A3B3C] shadow-xl p-3 z-50 transition-all ${
                      showCreatorsTooltip 
                        ? "opacity-100 visible pointer-events-auto" 
                        : "opacity-0 invisible pointer-events-none group-hover/info:opacity-100 group-hover/info:visible"
                    }`}>
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100 dark:border-[#3A3B3C]">
                        <p className="font-bold text-gray-800 dark:text-[#E4E6EB] text-[13px]">{tHub("activeCreatorsTooltipTitle")}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreatorsTooltip(false);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <ul className="flex flex-col gap-1.5 text-[11px] font-medium text-gray-600 dark:text-[#B0B3B8] leading-relaxed text-left whitespace-normal break-words">
                        <li>{tHub("activeCreatorsTooltip1")}</li>
                        <li>{tHub("activeCreatorsTooltip2")}</li>
                        <li>{tHub("activeCreatorsTooltip3")}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* ACTIVE CREATORS / SEARCH RESULTS LISTS */}
          <div className="flex-1 pr-1 relative">
            {search.trim() ? (
              /* ---- Search mode: show matching users ---- */
              <div className="flex flex-col gap-1">
                {searchedUsers.length === 0 ? (
                  /* No matching users */
                  <div className="flex flex-col items-center gap-2 py-6 px-3 text-center">
                    <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      {tHub("searchNoUser")}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {searchedUsers.map((user) => (
                      <Link
                        key={user.username}
                        href={`/${locale}/project/${user.username}`}
                        className="relative flex items-center gap-3 p-2 rounded-xl border border-transparent transition-all group/creator hover:bg-white dark:hover:bg-[#242526] hover:shadow-sm hover:border-gray-200 dark:hover:border-[#3A3B3C] overflow-hidden shrink-0"
                      >
                        <div className="relative shrink-0 flex items-center">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                              className="w-10 h-10 rounded-full object-cover relative z-10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-[15px] relative z-10 shrink-0">
                              {user.displayName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0 flex-grow relative z-10">
                          <div className="flex items-center w-full">
                            <span className="text-[13px] font-bold text-gray-800 dark:text-[#E4E6EB] group-hover/creator:text-purple-600 dark:group-hover/creator:text-purple-400 truncate leading-tight transition-colors">
                              {tHub("userProjects", { name: user.displayName })}
                            </span>
                            {user.isPopular && (
                              <img
                                src="/red-elektro.gif"
                                alt="Popular Electro"
                                className="h-[22px] w-auto shrink-0 pointer-events-none mix-blend-screen ml-1 -translate-y-0.5"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1 w-full">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate pr-2">
                              @{user.username}
                            </span>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[10px] font-medium shrink-0 opacity-70 group-hover/creator:opacity-100 transition-opacity">
                              <div className="flex items-center gap-0.5" title={t("projects")}>
                                <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                {user.totalProjects}
                              </div>
                              <div className="flex items-center gap-0.5" title={t("stars")}>
                                <img src="/star-label.svg" alt={t("stars")} className="w-[11px] h-[11px] opacity-70 dark:invert shrink-0" />
                                {user.totalLikes}
                              </div>
                              <div className="flex items-center gap-0.5" title={t("comments")}>
                                <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {user.totalComments}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ---- Normal mode: show active creators ---- */
              activeCreators.length > 0 && (
                <div className="flex flex-col gap-1">
                  {activeCreators.map((creator) => (
                    <Link
                      key={creator.username}
                      href={`/${locale}/project/${creator.username}`}
                      className="relative flex items-center gap-3 p-2 rounded-xl border border-transparent transition-all group/creator hover:bg-white dark:hover:bg-[#242526] hover:shadow-sm hover:border-gray-200 dark:hover:border-[#3A3B3C] overflow-hidden shrink-0"
                    >
                      <div className="relative shrink-0 flex items-center">
                        {creator.avatarUrl ? (
                          <img
                            src={creator.avatarUrl}
                            alt={creator.displayName}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                            className="w-10 h-10 rounded-full object-cover relative z-10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-[15px] relative z-10 shrink-0">
                            {creator.displayName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-grow relative z-10">
                        <div className="flex items-center w-full">
                          <span className="text-[13px] font-bold text-gray-800 dark:text-[#E4E6EB] group-hover/creator:text-purple-600 dark:group-hover/creator:text-purple-400 truncate leading-tight transition-colors">
                            {tHub("userProjects", { name: creator.displayName })}
                          </span>
                          {creator.isPopular && (
                            <img
                              src="/red-elektro.gif"
                              alt="Popular Electro"
                              className="h-[22px] w-auto shrink-0 pointer-events-none mix-blend-screen ml-1 -translate-y-0.5"
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1 w-full">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate pr-2">
                            @{creator.username}
                          </span>
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[10px] font-medium shrink-0 opacity-70 group-hover/creator:opacity-100 transition-opacity">
                            <div className="flex items-center gap-0.5" title={t("projects")}>
                              <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              {creator.totalProjects}
                            </div>
                            <div className="flex items-center gap-0.5" title={t("stars")}>
                              <img src="/star-label.svg" alt={t("stars")} className="w-[11px] h-[11px] opacity-70 dark:invert shrink-0" />
                              {creator.totalLikes}
                            </div>
                            <div className="flex items-center gap-0.5" title={t("comments")}>
                              <svg className="w-[11px] h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              {creator.totalComments}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Floating Stargazers Mini Popups (Desktop & Mobile, rendered at root container level) */}
      {stargazersTarget && (
        <>
          <ProjectStargazersPopupDesktop
            isOpen={!!stargazersTarget}
            onClose={() => setStargazersTarget(null)}
            projectId={stargazersTarget.projectId}
            projectTitle={stargazersTarget.projectTitle}
            anchorRect={stargazersTarget.anchorRect}
          />
          <ProjectStargazersPopupMobile
            isOpen={!!stargazersTarget}
            onClose={() => setStargazersTarget(null)}
            projectId={stargazersTarget.projectId}
            projectTitle={stargazersTarget.projectTitle}
            anchorRect={stargazersTarget.anchorRect}
          />
        </>
      )}
    </div>
  );
}
