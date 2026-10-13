"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { MediaRenderer } from "@/components/MediaRenderer";
import { CATEGORY_COLORS, getCategoryBadgeClasses, getStatusBadgeClasses } from "@/components/ProjectCard";
import { useUser } from "@/contexts/UserContext";
import { toggleLike, toggleSave, checkInteractionState } from "@/app/actions/interactions";
import toast from "react-hot-toast";
import { interactionsCache } from "@/utils/cache";
import SaveToFolderModal from "./SaveToFolderModal";
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

interface HorizontalProjectCardProps {
  project: any;
  locale: string;
  username: string;
  isOwnProfile?: boolean;
  currentUser?: any;
  currentUserId?: string;
  onEdit?: (project: any) => void;
  onDelete?: (project: any) => void;
  disableAutoFetch?: boolean;
}

export default function HorizontalProjectCard({
  project: p,
  locale,
  username,
  isOwnProfile,
  currentUser: currentUserProp,
  currentUserId,
  onEdit,
  onDelete,
  disableAutoFetch = false,
}: HorizontalProjectCardProps) {
  const router = useRouter();
  const { openShareModal } = useShareModal();
  const tProject = useTranslations("project");
  const tGlobal = useTranslations();
  const { currentUser: contextUser } = useUser();
  const effectiveCurrentUser = currentUserProp || contextUser;

  const [user, setUser] = useState<any>(() => {
    if (effectiveCurrentUser) return effectiveCurrentUser;
    if (typeof window !== "undefined") {
      return getClientTokenUser();
    }
    return null;
  });

  useEffect(() => {
    if (effectiveCurrentUser) {
      setUser(effectiveCurrentUser);
    } else if (typeof window !== "undefined") {
      const tokenUser = getClientTokenUser();
      if (tokenUser) setUser(tokenUser);
    }
  }, [effectiveCurrentUser]);

  const activeUserId = currentUserId || effectiveCurrentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isInteractionLoading, setIsInteractionLoading] = useState(true);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(p._count?.likes ?? p.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(
    p.comments ? p.comments.filter((c: any) => !c.parentId).length : (p._count?.comments ?? p.commentCount ?? 0)
  );
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const [isSaved, setIsSaved] = useState(p.savedBy?.some((s: any) => s.userId === activeUserId) || false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [stargazersAnchor, setStargazersAnchor] = useState<RectLike | null>(null);

  const loadInteractions = useCallback(() => {
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const resolvedActiveUserId = currentUserId || effectiveCurrentUser?.id || user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);

    const userKey = resolveInteractionUserKey(resolvedActiveUserId, hasToken);

    if (!userKey) {
      setIsInteractionLoading(true);
      return;
    }

    const cacheKey = `interaction_project_${p.id}_${userKey}`;
    if (interactionsCache.has(cacheKey)) {
      const cached = interactionsCache.get(cacheKey);
      setMyReaction(cached.myReaction || null);
      setLikeCount(cached.likeCount ?? p._count?.likes ?? p.likeCount ?? 0);
      if (cached.commentCount !== undefined) {
        setCommentCount(cached.commentCount);
      }
      setIsSaved(cached.hasSaved || false);
      setIsInteractionLoading(false);
      return;
    }

    if (userKey === "guest") {
      setMyReaction(null);
      setLikeCount(p._count?.likes ?? p.likeCount ?? 0);
      setCommentCount(p.comments ? p.comments.filter((c: any) => !c.parentId).length : (p._count?.comments ?? p.commentCount ?? 0));
      setIsSaved(false);
      setIsInteractionLoading(false);
      return;
    }

    setIsInteractionLoading(true);
    checkInteractionState(resolvedActiveUserId, "project", p.id).then(interaction => {
      if (interaction && interaction.success) {
        setMyReaction((interaction.myReaction as string | null) || null);
        setLikeCount(interaction.likeCount || 0);
        if (interaction.commentCount !== undefined) {
          setCommentCount(interaction.commentCount);
        }
        setIsSaved(interaction.hasSaved || false);
        const existing = interactionsCache.get(cacheKey) || {};
        interactionsCache.set(cacheKey, {
          ...existing,
          myReaction: interaction.myReaction || null,
          likeCount: interaction.likeCount || 0,
          commentCount: interaction.commentCount ?? commentCount,
          hasSaved: interaction.hasSaved || false
        });
      }
      setIsInteractionLoading(false);
    }).catch(() => setIsInteractionLoading(false));
  }, [p.id, p._count, p.likeCount, p.comments, p.commentCount, currentUserId, effectiveCurrentUser?.id, user?.id]);

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
      commentCount,
      topReactions: [],
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
          likeCount,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("project_interaction_updated", {
            detail: {
              projectId: p.id,
              myReaction: prevStarred ? "STAR" : null,
              likeCount,
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
        likeCount,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("project_interaction_updated", {
          detail: {
            projectId: p.id,
            myReaction: prevStarred ? "STAR" : null,
            likeCount,
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
    if (!activeUserId || isSaveLoading) return;
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    setIsSaveLoading(true);

    const cacheKey = `interaction_project_${p.id}_${activeUserId}`;
    if (interactionsCache.has(cacheKey)) {
      interactionsCache.set(cacheKey, {
        ...interactionsCache.get(cacheKey),
        hasSaved: newIsSaved
      });
    } else {
      interactionsCache.set(cacheKey, { hasSaved: newIsSaved });
    }

    const res = await toggleSave(activeUserId, "project", p.id);
    
    if (!res.success) {
      setIsSaved(!newIsSaved);
      if (interactionsCache.has(cacheKey)) {
        interactionsCache.set(cacheKey, {
          ...interactionsCache.get(cacheKey),
          hasSaved: !newIsSaved
        });
      }
      console.error(res.error);
    } else if (res.action === "saved") {
      const savedMsg = tGlobal("saveFolderModal.savedToast");
      const titleMsg = tGlobal("saveFolderModal.title");
      toast.custom((toastItem) => (
        <div className={`${toastItem.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-[#0A3622]/95 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-lg pointer-events-auto flex ring-1 ring-black/20 border border-emerald-600/30 backdrop-blur-md`}>
          <div className="flex-1 w-0 p-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{savedMsg}</span>
              <button 
                onClick={() => { 
                  toast.dismiss(toastItem.id);
                  setIsSaveModalOpen(true);
                }} 
                className="text-emerald-300 hover:text-emerald-200 font-bold ml-4 transition-colors"
              >
                {titleMsg}
              </button>
            </div>
          </div>
        </div>
      ), { duration: 4000 });
    }
    setIsSaveLoading(false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const owner = p.user?.username || username;
    const url = `${origin}/${locale}/project/${owner}/${p.id}`;
    openShareModal({
      id: p.id,
      type: "PROJECT",
      title: p.title || undefined,
      text: p.description || undefined,
      url,
      authorName: p.user?.profile?.displayName || owner,
      authorUsername: owner,
      authorAvatar: p.user?.profile?.avatarUrl,
    });
  };

  const coverUrls = (p.coverUrls && p.coverUrls.length > 0) ? p.coverUrls : (p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls : []);
  const cover = coverUrls[0];
  const projectOwner = p.user?.username || username;
  const displayName = p.user?.profile?.displayName || projectOwner;
  const avatarUrl = p.user?.profile?.avatarUrl;

  const statusKey = ({ RELEASED: "statusReleased", IN_PROGRESS: "statusInProgress", OPEN_SOURCE: "statusOpenSource", SEARCHING_TEAM: "statusSearchingTeam", HIATUS: "statusHiatus" } as Record<string, string>)[p.status] || "statusReleased";

  return (
    <div
      key={p.id}
      className="bg-white dark:bg-[#242526] rounded-[20px] shadow-sm border border-gray-100 dark:border-[#3A3B3C] transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col md:flex-row min-h-[180px] group/card relative"
    >
      <div className="w-full md:w-[260px] md:shrink-0 relative group/cover cursor-pointer rounded-t-[20px] md:rounded-tr-none md:rounded-l-[20px] overflow-hidden">
        <div className="absolute top-3 left-3 z-20">
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
            <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 0 : 2} d={isSaved ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
            </svg>
          </button>
        </div>

        <div 
          onClick={() => { if (typeof window !== 'undefined' && (window as any).NProgress) (window as any).NProgress.start(); router.push(`/${locale}/project/${projectOwner}/${p.id}`); }}
          className="w-full aspect-video md:aspect-auto md:absolute md:inset-0 relative z-0"
        >
          {cover ? (
            <MediaRenderer url={cover} className="absolute inset-0 w-full h-full object-cover bg-gray-100 dark:bg-[#3A3B3C]" />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 p-1.5 pr-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10" onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/project/${projectOwner}`); }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-600/50 shrink-0 flex items-center justify-center text-white font-bold text-[10px] ring-1 ring-white/20">
                {displayName[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span className="text-xs font-medium text-white/95 truncate max-w-[120px] shadow-sm">
              {displayName}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow relative z-10 w-full min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/${locale}/project/${projectOwner}/${p.id}`}
              onClick={() => { if (typeof window !== 'undefined' && (window as any).NProgress) (window as any).NProgress.start(); }}
              className="text-gray-900 dark:text-[#E4E6EB] font-bold text-[17px] line-clamp-2 after:absolute after:inset-0 after:z-0 hover:text-purple-600 dark:hover:text-purple-400"
            >
              {p.title}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 relative z-10">
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
          
          <div className="flex flex-col items-end gap-2 relative z-10 shrink-0 mt-0.5">
            <span className={getStatusBadgeClasses(p.status)}>
              {tProject(statusKey)}
            </span>
            {isOwnProfile && (
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#4E4F50] text-gray-500 dark:text-gray-400 transition-colors"
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
                        onClick={() => {
                          if (onEdit) onEdit(p);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-50 dark:hover:bg-[#4E4F50] flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {tProject("editProject") || "Edit Project"}
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-[#4E4F50] my-1" />
                      <button 
                        onClick={() => {
                          if (onDelete) onDelete(p);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {tProject("deleteProject") || "Hapus Project"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-600 dark:text-[#B0B3B8] text-[13px] whitespace-pre-line line-clamp-3 mb-4 flex-grow">
          {p.description}
        </p>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap gap-1.5">
              {p.techStack?.length > 0 && p.techStack.slice(0, 4).map((tech: string) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-colors bg-gray-100 text-gray-600 dark:bg-[#3A3B3C] dark:text-[#E4E6EB]"
                >
                  {tech}
                </span>
              ))}
              {p.techStack?.length > 4 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-[#3A3B3C] dark:text-[#E4E6EB]">
                  +{p.techStack.length - 4}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-[#3A3B3C]">
            <div className="flex items-center gap-1.5 sm:gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
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
              
              {/* Comment Button */}
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).NProgress) (window as any).NProgress.start();
                  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
                  const targetUrl = isMobile 
                    ? `/${locale}/project/${projectOwner}/${p.id}?openComments=true` 
                    : `/${locale}/project/${projectOwner}/${p.id}#comments`;
                  router.push(targetUrl);
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-[#3A3B3C] transition-colors font-medium text-[13px] bg-transparent"
                title={tProject("comment") || "Komentar"}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {isInteractionLoading ? (
                  <div className="w-3 h-4 bg-gray-200 dark:bg-[#3A3B3C] animate-pulse rounded ml-0.5"></div>
                ) : commentCount > 0 ? (
                  <span className="ml-0.5 text-gray-500 dark:text-gray-400">{commentCount}</span>
                ) : null}
              </button>
              
              <div className="w-px h-4 bg-gray-300 dark:bg-[#4E4F50]"></div>

              {/* Share Button */}
              <button 
                onClick={handleShare}
                className="flex items-center justify-center px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-[#3A3B3C] dark:hover:text-purple-400 transition-colors bg-transparent"
                title={tProject("share") || "Bagikan"}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeUserId && (
        <SaveToFolderModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          userId={activeUserId}
          targetType="project"
          targetId={p.id}
        />
      )}

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
  );
}
