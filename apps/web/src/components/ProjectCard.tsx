"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import NProgress from "nprogress";
import toast from "react-hot-toast";
import { MediaRenderer } from "./MediaRenderer";
import { checkInteractionState, toggleLike } from "@/app/actions/interactions";
import { interactionsCache } from "@/utils/cache";
import Image from "next/image";
import { useShareModal } from "@/contexts/ShareContext";
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

interface ProjectCardProps {
  project: any;
  locale: string;
  username: string;
  isOwnProfile: boolean;
  currentUser?: any;
  currentUserId?: string;
  onEdit?: (project: any) => void;
  onDelete?: (project: any) => void;
  disableAutoFetch?: boolean;
}

export const CATEGORY_COLORS: Record<string, string> = {
  WEB_DEV: "blue", MOBILE_APP: "emerald", GAME_DEV: "rose", DATA_AI: "purple", DESKTOP_APP: "cyan",
  OPEN_SOURCE: "slate", UI_UX: "rose", GRAPHIC_DESIGN: "orange", ANIMATION_3D: "purple",
  VIDEO_FILM: "amber", MUSIC_AUDIO: "emerald", ECOMMERCE: "blue", SAAS: "cyan",
  FINTECH: "emerald", SOCIAL_IMPACT: "rose", IOT: "amber", ROBOTICS: "slate",
  ELECTRONICS: "orange", EDTECH: "blue", RESEARCH: "purple", OTHER: "slate"
};

export const getCategoryBadgeClasses = (color: string) => {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-100 dark:border-purple-500/20",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-100 dark:border-cyan-500/20",
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-100 dark:border-slate-500/20",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${map[color] || map.blue}`;
};

export const getStatusColorClasses = (status: string) => {
  const map: Record<string, string> = {
    RELEASED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-400 dark:border-emerald-500/40",
    IN_PROGRESS: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-400 dark:border-amber-500/40",
    OPEN_SOURCE: "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-zinc-100 border-zinc-400 dark:border-zinc-500",
    SEARCHING_TEAM: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-400 dark:border-purple-500/40",
    HIATUS: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-400 dark:border-rose-500/40",
  };
  return map[status] || "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border-gray-400 dark:border-gray-600";
};

export const getStatusBadgeClasses = (status: string) => {
  return `inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border border-dashed ${getStatusColorClasses(status)}`;
};

export default function ProjectCard({
  project: p,
  locale,
  username,
  isOwnProfile,
  currentUser,
  currentUserId,
  onEdit,
  onDelete,
  disableAutoFetch = false,
}: ProjectCardProps) {
  const router = useRouter();
  const { openShareModal } = useShareModal();
  const tProject = useTranslations("project");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [user, setUser] = useState<any>(() => {
    if (currentUser) return currentUser;
    if (typeof window !== "undefined") {
      return getClientTokenUser();
    }
    return null;
  });
  const [isUserLoaded, setIsUserLoaded] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else if (typeof window !== "undefined" && !user) {
      const cu = getClientTokenUser();
      if (cu) setUser(cu);
    }
  }, [currentUser, user]);

  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isInteractionLoading, setIsInteractionLoading] = useState(true);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(p._count?.likes || 0);
  const [commentCount, setCommentCount] = useState(p._count?.comments || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [stargazersAnchor, setStargazersAnchor] = useState<RectLike | null>(null);

  const loadInteractions = useCallback(() => {
    if (!isUserLoaded) return;
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const activeUserId = currentUserId || currentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);

    const userKey = resolveInteractionUserKey(activeUserId, hasToken);

    // If client has token but userId is still being resolved, do NOT resolve as guest: keep skeleton active!
    if (!userKey) {
      setIsInteractionLoading(true);
      return;
    }

    const cacheKey = `interaction_project_${p.id}_${userKey}`;
    if (interactionsCache.has(cacheKey)) {
      const cached = interactionsCache.get(cacheKey);
      setMyReaction(cached.myReaction || null);
      setLikeCount(cached.likeCount ?? p._count?.likes ?? p.likeCount ?? 0);
      setCommentCount(cached.commentCount ?? p._count?.comments ?? p.commentCount ?? 0);
      setIsSaved(cached.hasSaved || false);
      setIsInteractionLoading(false);
      return;
    }

    // Guest fallback: immediately resolve without waiting ONLY IF definitely guest (no token)
    if (userKey === "guest") {
      setMyReaction(null);
      setLikeCount(p._count?.likes ?? p.likeCount ?? 0);
      setCommentCount(p._count?.comments ?? p.commentCount ?? 0);
      setIsSaved(false);
      setIsInteractionLoading(false);
      return;
    }

    // For logged-in user, keep skeleton active while fetching
    setIsInteractionLoading(true);

    if (disableAutoFetch) {
      // Waiting for batch fetch from parent. Safety fallback timeout so it never hangs indefinitely
      const fallbackTimer = setTimeout(() => {
        if (!interactionsCache.has(cacheKey)) {
          if (activeUserId) {
            checkInteractionState(activeUserId, "project", p.id).then((interaction) => {
              if (interaction.success) {
                setMyReaction((interaction.myReaction as string | null) || null);
                setLikeCount(interaction.likeCount || 0);
                setCommentCount(interaction.commentCount || 0);
                setIsSaved(interaction.hasSaved || false);
                interactionsCache.set(cacheKey, {
                  myReaction: interaction.myReaction || null,
                  likeCount: interaction.likeCount || 0,
                  commentCount: interaction.commentCount || 0,
                  hasSaved: interaction.hasSaved || false,
                });
              }
              setIsInteractionLoading(false);
            }).catch(() => setIsInteractionLoading(false));
          } else {
            setLikeCount(p._count?.likes ?? p.likeCount ?? 0);
            setCommentCount(p._count?.comments ?? p.commentCount ?? 0);
            setIsInteractionLoading(false);
          }
        }
      }, 3000);
      return () => clearTimeout(fallbackTimer);
    }

    setIsInteractionLoading(true);
    checkInteractionState(activeUserId, "project", p.id).then(interaction => {
      if (interaction.success) {
        setMyReaction((interaction.myReaction as string | null) || null);
        setLikeCount(interaction.likeCount || 0);
        setCommentCount(interaction.commentCount || 0);
        setIsSaved(interaction.hasSaved || false);
        const existing = interactionsCache.get(cacheKey) || {};
        interactionsCache.set(cacheKey, {
          ...existing,
          myReaction: interaction.myReaction || null,
          likeCount: interaction.likeCount || 0,
          commentCount: interaction.commentCount || 0,
          hasSaved: interaction.hasSaved || false
        });
      }
      setIsInteractionLoading(false);
    }).catch(() => setIsInteractionLoading(false));
  }, [p.id, p._count, p.likeCount, p.commentCount, currentUserId, currentUser?.id, user?.id, isUserLoaded, disableAutoFetch]);

  useEffect(() => {
    loadInteractions();
    const handleRefresh = () => loadInteractions();
    window.addEventListener("refresh_projects", handleRefresh);
    return () => window.removeEventListener("refresh_projects", handleRefresh);
  }, [loadInteractions]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const activeUserId = currentUserId || currentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    if (!activeUserId || isSaveLoading) return;
    
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    setIsSaveLoading(true);

    const cacheKey = `interaction_project_${p.id}_${activeUserId}`;
    const existing = interactionsCache.get(cacheKey) || {};
    interactionsCache.set(cacheKey, { ...existing, hasSaved: newIsSaved });

    try {
      const { toggleSave } = await import("@/app/actions/interactions");
      const res = await toggleSave(activeUserId, "project", p.id);
      
      if (!res.success) {
        setIsSaved(!newIsSaved);
        interactionsCache.set(cacheKey, { ...existing, hasSaved: !newIsSaved });
      } else {
        const titleMsg = newIsSaved ? tProject("savedTitle") || "Tersimpan" : tProject("unsavedTitle") || "Dihapus";
        const descMsg = newIsSaved ? tProject("savedDesc") || "Project telah disimpan ke koleksi Anda" : tProject("unsavedDesc") || "Project telah dihapus dari koleksi Anda";
        
        const toastItem = toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-[#18191A]/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl pointer-events-auto border border-[#242526]`}>
            <div className="p-4 border-b border-[#3A3B3C]/50">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-[#E4E6EB]">{titleMsg}</p>
                  <p className="mt-1 text-[13px] text-[#B0B3B8]">{descMsg}</p>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 4000 });
      }
    } catch (err) {
      setIsSaved(!newIsSaved);
      interactionsCache.set(cacheKey, { ...existing, hasSaved: !newIsSaved });
    } finally {
      setIsSaveLoading(false);
    }
  };

  const handleToggleStar = async () => {
    const activeUserId = currentUserId || currentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    if (!activeUserId) {
      toast.error(tProject("mustLoginToInteract") || "Silakan login terlebih dahulu");
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
      topReactions: [],
    });
    invalidateStargazersCache(p.id);

    try {
      await toggleLike(activeUserId, "project", p.id, "STAR");
      window.dispatchEvent(new Event("refresh_projects"));
    } catch (e) {
      setMyReaction(prevStarred ? "STAR" : null);
      setLikeCount(likeCount);
      interactionsCache.set(cacheKey, {
        ...interactionsCache.get(cacheKey),
        myReaction: prevStarred ? "STAR" : null,
        likeCount: likeCount,
      });
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${locale}/project/${username}/${p.id}`;
    openShareModal({
      id: p.id,
      type: "PROJECT",
      title: p.title || undefined,
      text: p.description || undefined,
      url,
      authorName: p.user?.profile?.displayName || p.user?.username || username,
      authorUsername: p.user?.username || username,
      authorAvatar: p.user?.profile?.avatarUrl,
    });
  };

  const coverUrls = (p.coverUrls && p.coverUrls.length > 0) ? p.coverUrls : (p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls : []);
  const hasMultiple = coverUrls.length > 1;
  const cover = coverUrls[0];
  const statusKey = ({ RELEASED: "statusReleased", IN_PROGRESS: "statusInProgress", OPEN_SOURCE: "statusOpenSource", SEARCHING_TEAM: "statusSearchingTeam", HIATUS: "statusHiatus" } as Record<string, string>)[p.status] || "statusReleased";

  return (
    <div className="bg-white dark:bg-[#242526] rounded-[20px] shadow-sm border border-gray-100 dark:border-[#3A3B3C] overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 group block">
      {(hasMultiple || cover) ? (
        <div className="relative">
          {hasMultiple ? (
            <div onClick={() => { NProgress.start(); router.push(`/${locale}/project/${username}/${p.id}`); }} className="w-full aspect-video flex gap-1 bg-gray-100 dark:bg-[#3A3B3C] cursor-pointer">
              <div className="flex-1 relative h-full">
                <MediaRenderer url={coverUrls[0]} className="w-full h-full object-cover" />
                <div className="absolute inset-0 z-10" />
              </div>
              <div className="w-1/3 relative h-full">
                <MediaRenderer url={coverUrls[1]} className="w-full h-full object-cover" />
                <div className="absolute inset-0 z-10" />
                {coverUrls.length > 2 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                    <span className="text-white font-bold text-xl">+{coverUrls.length - 2}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div onClick={() => { NProgress.start(); router.push(`/${locale}/project/${username}/${p.id}`); }} className="cursor-pointer relative">
              <MediaRenderer url={cover} className="w-full aspect-video object-cover bg-gray-100 dark:bg-[#3A3B3C]" />
              <div className="absolute inset-0 z-10" />
            </div>
          )}
          <div className="absolute -bottom-4 right-0 z-30 bg-white dark:bg-[#242526] p-[3px] pr-0 rounded-l-[10px] rounded-r-none shadow-sm shadow-black/5 dark:shadow-black/40 border border-r-0 border-gray-100 dark:border-[#3A3B3C]/60">
            <span className={`block px-2.5 py-1 rounded-l-[7px] rounded-r-none text-[11px] font-bold uppercase tracking-wider border border-r-0 border-dashed ${getStatusColorClasses(p.status)}`}>
              {tProject(statusKey)}
            </span>
          </div>
        </div>
      ) : null}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="project-title-container flex-1 max-w-[85%]">
            <h3 
              onClick={() => { NProgress.start(); router.push(`/${locale}/project/${username}/${p.id}`); }}
              className="text-gray-900 dark:text-[#E4E6EB] font-bold text-[17px] cursor-pointer hover:underline project-title-text"
            >
              {p.title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {p.category && (
                <span className={getCategoryBadgeClasses(CATEGORY_COLORS[p.category] || "blue")}>
                  {p.category === "OTHER" ? p.customCategory : tProject(`cat_${p.category}` as any)}
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
          <div className="flex items-center gap-2">
            {isInteractionLoading ? (
              <div className="w-[32px] h-[32px] rounded-full bg-gray-200 dark:bg-[#3A3B3C] animate-pulse"></div>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaveLoading}
                className={`p-1.5 rounded-full transition-all duration-150 active:scale-90 select-none ${
                  isSaved 
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400 active:bg-orange-100 dark:active:bg-orange-500/20' 
                    : 'bg-gray-50 dark:bg-[#3A3B3C] text-gray-500 dark:text-[#B0B3B8] hover:bg-gray-100 dark:hover:bg-[#4E4F50] active:bg-gray-200 dark:active:bg-[#4E4F50]'
                } ${isSaveLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isSaved ? tProject("savedTitle") || "Tersimpan" : tProject("saveProject") || "Simpan Project"}
              >
                <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 2 : 2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {!(hasMultiple || cover) && (
              <span className={getStatusBadgeClasses(p.status)}>
                {tProject(statusKey)}
              </span>
            )}
            {isOwnProfile && (
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#4E4F50] text-gray-500 dark:text-gray-400 active:scale-90 active:bg-gray-200 dark:active:bg-[#4E4F50] transition-all duration-150 select-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
                
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMenuOpen(false);
                      }}
                    />
                    <div 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#3A3B3C] rounded-xl shadow-lg border border-gray-100 dark:border-[#4E4F50] py-1 z-50 overflow-hidden"
                    >
                      <button 
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-50 dark:hover:bg-[#4E4F50] active:scale-[0.98] active:bg-gray-100 dark:active:bg-[#4E4F50] transition-all flex items-center gap-2 select-none"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {tProject("publish")}
                      </button>
                      <button 
                        onClick={() => {
                          if (onEdit) onEdit(p);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-50 dark:hover:bg-[#4E4F50] active:scale-[0.98] active:bg-gray-100 dark:active:bg-[#4E4F50] transition-all flex items-center gap-2 select-none"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {tProject("editProject")}
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-[#4E4F50] my-1" />
                      <button 
                        onClick={() => {
                          if (onDelete) onDelete(p);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-[0.98] active:bg-red-100 dark:active:bg-red-500/20 transition-all flex items-center gap-2 font-medium select-none"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {tProject("deleteProject")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-gray-600 dark:text-[#B0B3B8] text-[14px] whitespace-pre-line line-clamp-4 mb-3">{p.description}</p>
        {p.techStack?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {p.techStack.map((tech: string) => (
              <span key={tech} className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-gray-100 text-gray-700 dark:bg-[#3A3B3C] dark:text-[#E4E6EB]">{tech}</span>
            ))}
          </div>
        )}
        {/* Actions Row */}
        <div className="flex items-center justify-end border-t border-gray-100 dark:border-[#3E4042] pt-2 mt-2 relative z-10" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 sm:gap-2 -mr-2">
            
            {/* Star Buttons (Desktop & Mobile) */}
            <ProjectStarButtonDesktop
              isStarred={isProjectStarredByUser(myReaction)}
              starCount={likeCount}
              isLoading={isLikeLoading}
              isInteractionLoading={isInteractionLoading}
              onToggleStar={handleToggleStar}
              onOpenStargazers={(rect) => setStargazersAnchor(rect)}
            />
            <ProjectStarButtonMobile
              isStarred={isProjectStarredByUser(myReaction)}
              starCount={likeCount}
              isLoading={isLikeLoading}
              isInteractionLoading={isInteractionLoading}
              onToggleStar={handleToggleStar}
              onOpenStargazers={(rect) => setStargazersAnchor(rect)}
            />

            {/* Comments & Share */}
            <button 
              onClick={() => { 
                NProgress.start(); 
                const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
                const targetUrl = isMobile 
                  ? `/${locale}/project/${username}/${p.id}?openComments=true` 
                  : `/${locale}/project/${username}/${p.id}#comments`;
                router.push(targetUrl); 
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-[#3A3B3C] dark:hover:text-purple-400 active:scale-95 active:bg-gray-200/60 dark:active:bg-[#3A3B3C] transition-all duration-150 font-medium text-[14px] bg-transparent select-none"
              title={tProject("comment") || "Komentar"}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {isInteractionLoading ? (
                <div className="w-3 h-4 bg-gray-200 dark:bg-[#3A3B3C] animate-pulse rounded"></div>
              ) : commentCount > 0 ? (
                <span>{commentCount}</span>
              ) : null}
            </button>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-[#4E4F50]"></div>
            
            <button 
              onClick={handleShare}
              className="flex items-center justify-center px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-[#3A3B3C] dark:hover:text-purple-400 active:scale-90 active:bg-gray-200/60 dark:active:bg-[#3A3B3C] transition-all duration-150 bg-transparent select-none"
              title={tProject("share") || "Bagikan"}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
        </div>

        {/* Floating Stargazers Mini Popups (Desktop & Mobile) */}
        {stargazersAnchor && (
          <>
            <ProjectStargazersPopupDesktop
              isOpen={!!stargazersAnchor}
              onClose={() => setStargazersAnchor(null)}
              projectId={p.id}
              projectTitle={p.title}
              anchorRect={stargazersAnchor}
            />
            <ProjectStargazersPopupMobile
              isOpen={!!stargazersAnchor}
              onClose={() => setStargazersAnchor(null)}
              projectId={p.id}
              projectTitle={p.title}
              anchorRect={stargazersAnchor}
            />
          </>
        )}
      </div>
    </div>
  );
}
