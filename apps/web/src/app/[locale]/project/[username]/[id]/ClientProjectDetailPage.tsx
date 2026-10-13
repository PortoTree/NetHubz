"use client";

import React, { useEffect, useState, useCallback, use, useRef } from "react";
import { useTranslations } from "next-intl";
import { getProjectById } from "@/app/actions/projects";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { getProfile } from "@/app/actions/profile";
import { toggleLike, addComment, getComments, getCommentReplies, checkInteractionState, toggleSave } from "@/app/actions/interactions";
import { interactionsCache, commentsCache } from "@/utils/cache";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Link from "next/link";
import { MediaRenderer } from "@/components/MediaRenderer";
import { useRouter, useSearchParams } from "next/navigation";
import FloatingUserMenu from "@/components/FloatingUserMenu";
import FloatingProjectHubBtn from "@/components/FloatingProjectHubBtn";
import { CATEGORY_COLORS, getCategoryBadgeClasses, getStatusBadgeClasses } from "@/components/ProjectCard";
import ProjectStarButtonDesktop from "@/components/ProjectStarButtonDesktop";
import ProjectStarButtonMobile from "@/components/ProjectStarButtonMobile";
import ProjectStargazersPopupDesktop from "@/components/ProjectStargazersPopupDesktop";
import ProjectStargazersPopupMobile from "@/components/ProjectStargazersPopupMobile";
import {
  calculateOptimisticStar,
  isProjectStarredByUser,
  getClientTokenUser,
  resolveInteractionUserKey,
  RectLike,
  invalidateStargazersCache,
} from "@/utils/projectStar";
import { formatPostTime } from "@/components/PostCard";
import { CommentItem, InlineReplyInput } from "@/components/PostDetailModal";
import CommentInput from "@/components/CommentInput";
import ProjectCommentsModalMobile from "@/components/ProjectCommentsModalMobile";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { getMentionSuggestion } from "@/utils/mentionSuggestion";
import toast from "react-hot-toast";
import SaveToFolderModal from "@/components/SaveToFolderModal";
import { useShareModal } from "@/contexts/ShareContext";


// ─── Gallery ─────────────────────────────────────────────────────────────────

const ProjectGallery = ({ mediaUrls }: { mediaUrls: string[] }) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const handleNext = (e?: React.MouseEvent) => { e?.stopPropagation(); if (selectedMediaIndex !== null) setSelectedMediaIndex((selectedMediaIndex + 1) % mediaUrls.length); };
  const handlePrev = (e?: React.MouseEvent) => { e?.stopPropagation(); if (selectedMediaIndex !== null) setSelectedMediaIndex((selectedMediaIndex - 1 + mediaUrls.length) % mediaUrls.length); };

  const renderGrid = () => {
    if (mediaUrls.length === 1) return (
      <div onClick={() => setSelectedMediaIndex(0)} className="w-full aspect-video bg-black rounded-none overflow-hidden mb-8 shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
        <MediaRenderer url={mediaUrls[0]} className="w-full h-full object-contain mx-auto" variant="detail" />
      </div>
    );
    if (mediaUrls.length === 2) return (
      <div className="grid grid-cols-2 gap-1 mb-8 aspect-[2/1]">
        {mediaUrls.map((url, i) => <div key={i} onClick={() => setSelectedMediaIndex(i)} className="w-full h-full bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={url} className="w-full h-full object-cover mx-auto" variant="detail" /></div>)}
      </div>
    );
    if (mediaUrls.length === 3) return (
      <div className="grid grid-cols-3 grid-rows-2 gap-1 mb-8 aspect-[2/1]">
        <div onClick={() => setSelectedMediaIndex(0)} className="col-span-2 row-span-2 bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[0]} className="w-full h-full object-cover mx-auto" variant="detail" /></div>
        <div onClick={() => setSelectedMediaIndex(1)} className="col-span-1 row-span-1 bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[1]} className="w-full h-full object-cover mx-auto" variant="detail" /></div>
        <div onClick={() => setSelectedMediaIndex(2)} className="col-span-1 row-span-1 bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[2]} className="w-full h-full object-cover mx-auto" variant="detail" /></div>
      </div>
    );
    return (
      <div className="flex flex-col gap-1 mb-8">
        <div onClick={() => setSelectedMediaIndex(0)} className="w-full aspect-[2/1] bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"><MediaRenderer url={mediaUrls[0]} className="w-full h-full object-contain mx-auto" variant="detail" /></div>
        <div className="grid grid-cols-4 gap-1 aspect-[4/1]">
          {mediaUrls.slice(1, 5).map((url, i) => (
            <div key={i} onClick={() => setSelectedMediaIndex(i + 1)} className="relative w-full h-full bg-black rounded-none overflow-hidden shadow-sm border border-gray-100 dark:border-[#3A3B3C] flex items-center justify-center cursor-pointer group">
              <MediaRenderer url={url} className="w-full h-full object-cover mx-auto group-hover:opacity-75 transition-opacity" variant="detail" />
              {i === 3 && mediaUrls.length > 5 && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"><span className="text-white font-bold text-xl md:text-2xl">+{mediaUrls.length - 5}</span></div>)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderGrid()}
      {selectedMediaIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col justify-between items-center backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedMediaIndex(null)}>
          <button className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 active:bg-white/30 text-white transition-all duration-150 select-none" onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex(null); }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="relative flex-1 w-full flex items-center justify-center px-12 md:px-24">
            {mediaUrls.length > 1 && (<button className="absolute left-4 md:left-10 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 active:bg-white/30 text-white transition-all duration-150 select-none" onClick={handlePrev}><svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>)}
            <div className="w-full max-w-6xl h-[75vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <MediaRenderer url={mediaUrls[selectedMediaIndex]} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" variant="detail" />
            </div>
            {mediaUrls.length > 1 && (<button className="absolute right-4 md:right-10 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 active:bg-white/30 text-white transition-all duration-150 select-none" onClick={handleNext}><svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>)}
          </div>
          {mediaUrls.length > 1 && (
            <div className="w-full pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 snap-x max-w-full no-scrollbar">
                {mediaUrls.map((url, idx) => (
                  <button key={idx} onClick={() => setSelectedMediaIndex(idx)} className={`relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-lg overflow-hidden snap-center transition-all duration-150 active:scale-95 select-none ${selectedMediaIndex === idx ? 'ring-2 ring-purple-500 scale-110 opacity-100 z-10' : 'opacity-50 hover:opacity-100'}`}>
                    <MediaRenderer url={url} className="w-full h-full object-cover" variant="thumb" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientProjectDetailPage({ 
  locale, username, id, initialProject 
}: { 
  locale: string; username: string; id: string; initialProject: any 
}) {
  
  const decodedUsername = decodeURIComponent(username);
  const t = useTranslations("project");
  const tGlobal = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openShareModal } = useShareModal();

  const [project, setProject] = useState<any>(initialProject);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return getClientTokenUser();
    }
    return null;
  });

  // Like
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isInteractionLoading, setIsInteractionLoading] = useState(true);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Save
  const [isSaved, setIsSaved] = useState(initialProject?.hasSaved || false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [stargazersAnchor, setStargazersAnchor] = useState<RectLike | null>(null);


  // Comments
  const [comments, setComments] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const activeUserId = getClientTokenUser()?.id || "guest";
      const cached = commentsCache.get(`project_${id}_${activeUserId}`);
      if (cached?.comments) return cached.comments;
    }
    return [];
  });
  const [isLoadingComments, setIsLoadingComments] = useState(() => {
    if (typeof window !== "undefined") {
      const activeUserId = getClientTokenUser()?.id || "guest";
      return !commentsCache.has(`project_${id}_${activeUserId}`);
    }
    return true;
  });
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string, name: string, parentId?: string, username?: string, id?: string, rootId?: string } | null>(null);
  const [traceInfo, setTraceInfo] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);
  const [commentsBoxHeight, setCommentsBoxHeight] = useState(500);
  const commentsBoxHeightRef = useRef(500);

  const handleCommentsBoxResizeDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const startY = e.clientY;
    const startHeight = commentsBoxHeightRef.current;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      const maxHeight = 1200;
      const newHeight = Math.max(380, Math.min(maxHeight, startHeight + deltaY));
      commentsBoxHeightRef.current = newHeight;
      setCommentsBoxHeight(newHeight);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try {
        (e.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      } catch {}
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }, []);

  const handleCommentsBoxTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    const startY = touch.clientY;
    const startHeight = commentsBoxHeightRef.current;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const currentTouch = moveEvent.touches[0];
      if (!currentTouch) return;
      const deltaY = currentTouch.clientY - startY;
      const maxHeight = 1200;
      const newHeight = Math.max(380, Math.min(maxHeight, startHeight + deltaY));
      commentsBoxHeightRef.current = newHeight;
      setCommentsBoxHeight(newHeight);
    };

    const onTouchEnd = () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
  }, []);

  // Collab
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabMessage, setCollabMessage] = useState("");
  const [isCollabMessageSent, setIsCollabMessageSent] = useState(false);

  // Close emoji picker on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setIsEmojiOpen(false);
      }
    }
    if (isEmojiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEmojiOpen]);

  const [isUserLoaded, setIsUserLoaded] = useState(false);

  useEffect(() => {
    const tokenUser = getClientTokenUser();
    if (tokenUser) {
      setUser(tokenUser);
    }
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub || payload.id || payload._id || payload.userId || "1";
        setUser((prev: any) => ({ ...(prev || {}), id: userId, username: payload.username || "Guest" }));
        getProfile(userId).then(res => {
          if (res?.success && res?.profile) setUser((prev: any) => ({ ...(prev || {}), profile: res.profile }));
        });
      } catch (e) { console.error("Invalid token"); }
    }
    setIsUserLoaded(true);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") { setIsDarkMode(false); document.documentElement.classList.remove("dark"); }
    else { setIsDarkMode(true); document.documentElement.classList.add("dark"); }
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    if (isDarkMode) { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [isDarkMode, themeLoaded]);

  const fetchComments = useCallback(async (cursor?: string) => {
    const activeUserId = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    const userKey = activeUserId || "guest";
    const cacheKey = `project_${id}_${userKey}`;

    // SWR Pattern (Kategori 4 Client-Only): render instan 0 ms jika cache ada
    if (!cursor) {
      const cached = commentsCache.get(cacheKey);
      if (cached) {
        setComments(cached.comments);
        setNextCursor(cached.nextCursor);
        setIsLoadingComments(false);
      } else {
        setIsLoadingComments(true);
      }
    }

    const res = await getComments("project", id, activeUserId, cursor, 20);
    if (res.success) {
      if (cursor) {
        setComments(prev => {
          const next = [...prev, ...(res.comments || [])];
          commentsCache.set(cacheKey, { comments: next, nextCursor: res.nextCursor });
          return next;
        });
      } else {
        setComments(res.comments || []);
        commentsCache.set(cacheKey, { comments: res.comments || [], nextCursor: res.nextCursor });
      }
      setNextCursor(res.nextCursor);
    }
    if (!cursor) setIsLoadingComments(false);
  }, [id, user?.id]);

  const loadInteractions = useCallback(() => {
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const activeUserId = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    const userKey = resolveInteractionUserKey(activeUserId, hasToken);

    if (!userKey) {
      setIsInteractionLoading(true);
      return;
    }

    const cacheKey = `interaction_project_${id}_${userKey}`;
    if (interactionsCache.has(cacheKey)) {
      const cached = interactionsCache.get(cacheKey);
      setMyReaction(cached.myReaction || null);
      setLikeCount(cached.likeCount ?? project?._count?.likes ?? 0);
      setCommentCount(cached.commentCount ?? project?._count?.comments ?? 0);
      setIsSaved(cached.hasSaved || false);
      setIsInteractionLoading(false);
      return;
    }

    if (userKey === "guest") {
      setMyReaction(null);
      setLikeCount(project?._count?.likes ?? 0);
      setCommentCount(project?._count?.comments ?? 0);
      setIsSaved(false);
      setIsInteractionLoading(false);
      return;
    }

    setIsInteractionLoading(true);
    checkInteractionState(activeUserId, "project", id).then(interaction => {
      if (interaction && interaction.success) {
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
          hasSaved: interaction.hasSaved || false,
        });
      }
      setIsInteractionLoading(false);
    }).catch(() => setIsInteractionLoading(false));
  }, [id, user?.id, project?._count]);

  useEffect(() => {
    loadInteractions();
    fetchComments();
    const handleRefresh = () => { loadInteractions(); fetchComments(); };
    window.addEventListener("refresh_projects", handleRefresh);
    return () => window.removeEventListener("refresh_projects", handleRefresh);
  }, [loadInteractions, fetchComments]);

  useEffect(() => {
    if (isLoading) return;

    const isMobile = window.innerWidth < 1024;
    const hasOpenCommentsParam = searchParams.get('openComments') === 'true' || searchParams.get('comments') === 'open' || searchParams.get('commentId');
    const hasCommentsHash = window.location.hash === '#comments';

    if (isMobile) {
      if (hasOpenCommentsParam || hasCommentsHash) {
        setIsMobileCommentsOpen(true);
        if (hasCommentsHash) {
          // Bersihkan hash #comments supaya browser mobile tidak scroll ke posisi bawah
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    } else {
      if (hasCommentsHash || hasOpenCommentsParam) {
        const timer = setTimeout(() => {
          const el = document.getElementById('comments');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, searchParams]);

  const handleToggleStar = async () => {
    const activeUserId = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    if (!activeUserId) {
      toast.error(t("mustLoginToInteract") || "Silakan login terlebih dahulu");
      router.push(`/${locale}/login`);
      return;
    }
    if (isLikeLoading) return;
    setIsLikeLoading(true);

    const prevStarred = isProjectStarredByUser(myReaction);
    const next = calculateOptimisticStar({ isStarred: prevStarred, starCount: likeCount });

    const cacheKey = `interaction_project_${id}_${activeUserId}`;
    setMyReaction(next.isStarred ? "STAR" : null);
    setLikeCount(next.starCount);

    interactionsCache.set(cacheKey, {
      ...interactionsCache.get(cacheKey),
      myReaction: next.isStarred ? "STAR" : null,
      likeCount: next.starCount,
    });
    invalidateStargazersCache(id);

    try {
      const res = await toggleLike(activeUserId, "project", id, "STAR");
      if (!res.success) {
        setMyReaction(prevStarred ? "STAR" : null);
        setLikeCount(likeCount);
        interactionsCache.set(cacheKey, {
          ...interactionsCache.get(cacheKey),
          myReaction: prevStarred ? "STAR" : null,
          likeCount: likeCount,
        });
      } else {
        window.dispatchEvent(new Event("refresh_projects"));
      }
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

  const handleShare = () => {
    openShareModal({
      id,
      type: "PROJECT",
      title: project?.title || undefined,
      text: project?.description || undefined,
      url: typeof window !== "undefined" ? window.location.href : "",
      authorName: project?.user?.profile?.displayName || project?.user?.username,
      authorUsername: project?.user?.username,
      authorAvatar: project?.user?.profile?.avatarUrl,
    });
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Silakan login untuk menyimpan.");
      return;
    }
    if (isSaveLoading) return;
    setIsSaveLoading(true);
    
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    
    const cacheKey = `interaction_project_${id}_${user.id}`;
    if (interactionsCache.has(cacheKey)) {
      interactionsCache.set(cacheKey, {
        ...interactionsCache.get(cacheKey),
        hasSaved: newIsSaved
      });
    }
    
    const res = await toggleSave(user.id, "project", id);
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

  const handleLikeComment = async (commentId: string, reactionType: string = "LIKE") => {
    const activeUserId = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    if (!activeUserId) return;

    const userKey = activeUserId || "guest";
    const cacheKey = `project_${id}_${userKey}`;

    // Optimistically update comments in state and cache
    setComments(prev => {
      const updateReactionInList = (list: any[]): any[] => {
        return list.map(c => {
          if (c.id === commentId) {
            const isRemoving = c.myReaction === reactionType;
            const newReaction = isRemoving ? null : reactionType;
            const currentLikes = c._count?.likes ?? 0;
            const newLikes = isRemoving ? Math.max(0, currentLikes - 1) : (!c.myReaction ? currentLikes + 1 : currentLikes);

            let newTopReactions = Array.isArray(c.topReactions) ? [...c.topReactions] : [];
            if (!isRemoving && !newTopReactions.includes(reactionType)) {
              newTopReactions = [reactionType, ...newTopReactions];
            } else if (isRemoving && newLikes === 0) {
              newTopReactions = newTopReactions.filter(r => r !== reactionType);
            }

            return {
              ...c,
              myReaction: newReaction,
              topReactions: newTopReactions,
              _count: {
                ...(c._count || {}),
                likes: newLikes,
              }
            };
          }
          if (c.optimisticReplies && c.optimisticReplies.length > 0) {
            return { ...c, optimisticReplies: updateReactionInList(c.optimisticReplies) };
          }
          return c;
        });
      };
      const updated = updateReactionInList(prev);
      const existing = commentsCache.get(cacheKey);
      commentsCache.set(cacheKey, { comments: updated, nextCursor: existing?.nextCursor });
      return updated;
    });

    try {
      await toggleLike(activeUserId, "comment", commentId, reactionType);
    } catch (e) {
      console.error("Failed to like comment:", e);
    }
  };

  const handleReplyClick = (uname: string, uid: string, displayName: string, exactCommentId: string, parentIdForDB?: string, rootId?: string) => {
    setReplyingTo({ commentId: exactCommentId, name: displayName, parentId: parentIdForDB, username: uname, id: uid, rootId });
  };

  const handleInlineSubmit = async (text: string, parentId: string) => {
    if (!user) return;
    const res = await addComment(user.id, "project", id, text, parentId);
    if (res.success && res.comment) {
      const appendReply = (list: any[], pid: string): any[] => list.map(c => {
        if (c.id === pid) return { ...c, optimisticReplies: [...(c.optimisticReplies || []), res.comment] };
        if (c.optimisticReplies) return { ...c, optimisticReplies: appendReply(c.optimisticReplies, pid) };
        return c;
      });
      setComments(prev => {
        const next = appendReply(prev, parentId);
        const userKey = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : "guest");
        const cacheKey = `project_${id}_${userKey}`;
        const existing = commentsCache.get(cacheKey);
        commentsCache.set(cacheKey, { comments: next, nextCursor: existing?.nextCursor });
        return next;
      });
      setReplyingTo(null);
    }
  };

  const getMentionsText = (ed: any) => {
    const json = ed.getJSON();
    let text = '';
    const parseNode = (node: any) => {
      if (node.type === 'text') text += node.text;
      if (node.type === 'mention') text += `@[${node.attrs.label}](${node.attrs.id})`;
      if (node.content) node.content.forEach(parseNode);
    };
    if (json.content) json.content.forEach(parseNode);
    return text.trim();
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ bold: false, italic: false, strike: false, code: false, codeBlock: false, heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({
        placeholder: t("writeComment") || "Tulis komentar...",
        emptyEditorClass: 'is-editor-empty text-gray-400',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-blue-500 dark:text-blue-400 font-bold underline cursor-pointer bg-blue-50 dark:bg-blue-900/30 rounded px-1',
        },
        suggestion: getMentionSuggestion(),
      }),
    ],
    onUpdate: ({ editor }) => {
      setCommentInput(getMentionsText(editor));
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[24px] overflow-y-auto outline-none custom-scrollbar',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          if (document.getElementById('mention-popup-container')) {
            return false;
          }
          event.preventDefault();
          handleTopLevelSubmit();
          return true;
        }
        return false;
      },
    },
  });

  const handleTopLevelSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !commentInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const res = await addComment(user.id, "project", id, commentInput);
    if (res.success && res.comment) { 
      setComments(prev => {
        const next = [res.comment, ...prev];
        const userKey = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : "guest");
        const cacheKey = `project_${id}_${userKey}`;
        const existing = commentsCache.get(cacheKey);
        commentsCache.set(cacheKey, { comments: next, nextCursor: existing?.nextCursor });
        return next;
      }); 
      setCommentCount(prev => prev + 1);
      setCommentInput(""); 
      if (editor) editor.commands.clearContent();
    }
    setIsSubmitting(false);
  };
  const renderCommentContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@\[.*?\]\([^\)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[(.*?)\]\(([^\)]+)\)/);
      if (match) {
        const matchedUsername = match[2].split('/')[0];
        const idStr = match[2].split('/')[1] || matchedUsername;
        const isCurrentUser = user && (idStr === user.id || matchedUsername === user.username);
        const colorClass = isCurrentUser ? "text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1 rounded" : "text-sky-500 dark:text-sky-400";
        return <span key={i} className={`${colorClass} cursor-pointer hover:underline`} onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/p/${matchedUsername}/${idStr}`); }}>@{match[1]}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] pt-20 pb-4 md:pb-10">
        <div className="max-w-[900px] mx-auto w-full px-4 animate-pulse">
          <div className="w-48 h-6 bg-gray-300 dark:bg-[#3A3B3C] rounded mb-6"></div>
          <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-gray-300 dark:bg-[#3A3B3C] rounded-2xl mb-10"></div>
          <div className="flex flex-col gap-4"><div className="w-3/4 h-10 bg-gray-300 dark:bg-[#3A3B3C] rounded-lg"></div><div className="w-full h-4 bg-gray-300 dark:bg-[#3A3B3C] rounded"></div></div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const p = project;
  const profileUser = p.user;
  const displayName = profileUser.profile?.displayName || profileUser.username;
  const avatar = profileUser.profile?.avatarUrl ? getOptimizedUrl(profileUser.profile.avatarUrl, 'thumb') : null;
  const statusKey = ({ RELEASED: "statusReleased", IN_PROGRESS: "statusInProgress", OPEN_SOURCE: "statusOpenSource", SEARCHING_TEAM: "statusSearchingTeam", HIATUS: "statusHiatus" } as Record<string, string>)[p.status] || "statusReleased";



  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] pt-20 pb-4 md:pb-20">
      <FloatingProjectHubBtn customHref={`/${locale}/project/${decodedUsername}`} customText={`${displayName}'s Projects`} variant="with-dropdown" />
      <FloatingUserMenu isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <div className="max-w-[900px] mx-auto w-full px-4">

        <ProjectGallery mediaUrls={p.mediaUrls?.length ? p.mediaUrls : p.coverUrls || []} />

        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-5 sm:gap-6 border-b border-gray-200 dark:border-[#3A3B3C] pb-8">
            <div className="flex flex-col gap-2.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-[#E4E6EB] leading-tight break-words">
                {p.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {p.category && (
                  <span className={getCategoryBadgeClasses(CATEGORY_COLORS[p.category] || "blue")}>
                    {p.category === "OTHER" ? p.customCategory : t(`cat_${p.category}` as any)}
                  </span>
                )}
                <span className={getStatusBadgeClasses(p.status)}>
                  {t(statusKey)}
                </span>
                {p.isForSale && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FOR SALE
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <Link href={`/${locale}/p/${profileUser.username}/${profileUser.id}`} className="flex items-center gap-3.5 group w-fit active:scale-95 transition-transform duration-150">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-sm ring-2 ring-gray-100 dark:ring-[#3A3B3C]/80" />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xl ring-2 ring-gray-100 dark:ring-[#3A3B3C]/80">
                    {displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-[#E4E6EB] tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
                    {displayName}
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-[#A0A3A8] leading-tight">
                    @{profileUser.username}
                  </p>
                </div>
              </Link>

              <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 sm:gap-3 ml-auto">
                <div className="flex items-center gap-2.5 sm:gap-3 bg-white dark:bg-[#242526] px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-sm border border-gray-100 dark:border-[#3A3B3C]">
                  <div className="flex items-center relative">
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
                  </div>
                  <div className="w-px h-5 bg-gray-200 dark:bg-[#4E4F50]"></div>
                  <button 
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setIsMobileCommentsOpen(true);
                      } else {
                        document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }} 
                    className="flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 font-semibold transition-all duration-150 active:scale-95 select-none text-[14px]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    {isInteractionLoading ? <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" /> : <span>{commentCount}</span>}
                  </button>
                  <div className="w-px h-5 bg-gray-200 dark:bg-[#4E4F50]"></div>
                  {isInteractionLoading ? (
                    <div className="w-6 h-6 bg-gray-200 dark:bg-[#4E4F50] rounded-full animate-pulse mx-1" />
                  ) : (
                    <button 
                      onClick={handleSave} 
                      disabled={isSaveLoading}
                      className="flex items-center gap-2 font-semibold transition-all duration-150 active:scale-90 select-none text-[14px]"
                    >
                      <svg className={`w-5 h-5 ${isSaved ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`} fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 0 : 2} d={isSaved ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
                      </svg>
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={handleShare} 
                  title={t("share") || "Bagikan"}
                  aria-label={t("share") || "Bagikan"}
                  className="flex shrink-0 items-center justify-center w-[40px] h-[40px] sm:w-[42px] sm:h-[42px] bg-white dark:bg-[#242526] rounded-full shadow-sm border border-gray-100 dark:border-[#3A3B3C] text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 active:scale-90 active:bg-gray-100 dark:active:bg-[#3A3B3C] transition-all duration-150 select-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E6EB] mb-4">{t("aboutProject") || "About this Project"}</h3>
            <p className="text-gray-700 dark:text-[#B0B3B8] text-[16px] leading-relaxed whitespace-pre-line">{p.description}</p>
          </div>

          {p.roleNeeded && p.status === "SEARCHING_TEAM" && (
            <div className="p-5 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-bold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>{t("roleNeeded")}</h3>
                <p className="text-purple-700 dark:text-purple-400 text-[15px]">{p.roleNeeded}</p>
              </div>
              <button onClick={() => { setCollabMessage(t("collabMessageDefault") || "Halo, saya tertarik untuk berkolaborasi dalam project ini."); setIsCollabMessageSent(false); setIsCollabModalOpen(true); }} className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 active:bg-purple-800 text-white font-bold rounded-xl transition-all duration-150 shadow-sm shadow-purple-200 dark:shadow-none select-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                {t("sendMessage") || "Kirim pesan"}
              </button>
            </div>
          )}

          {p.techStack && p.techStack.length > 0 && (
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-[#E4E6EB] mb-3">{t("technologies") || "Technologies"}</h3>
              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {p.techStack.map((tech: string) => (
                  <span key={tech} className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[13px] sm:text-[14px] font-bold tracking-wide uppercase bg-gray-200/90 text-gray-800 dark:bg-[#2A2B2D] dark:text-[#E4E6EB] border border-gray-300/40 dark:border-white/5 transition-colors">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(p.repoUrl || p.demoUrl) && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-3">
              {p.repoUrl && (
                <a
                  href={p.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold text-[14px] sm:text-[15px] tracking-tight leading-none rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span>{t("viewRepo")}</span>
                </a>
              )}
              {p.demoUrl && (
                <a
                  href={p.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[14px] sm:text-[15px] tracking-tight leading-none rounded-xl transition-all shadow-sm shadow-purple-500/20 dark:shadow-none active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>{t("viewDemo")}</span>
                </a>
              )}
            </div>
          )}

          <hr className="border-gray-200 dark:border-[#3A3B3C] my-8" />

          {/* Comments Section */}
          <div id="comments" className="pt-2 pb-10">
            <div className="flex flex-col lg:flex-row gap-8">

              {/* Left Column: Comments (Desktop) */}
              <div 
                className="hidden lg:flex lg:flex-1 lg:max-w-[60%] lg:self-start border border-gray-200 dark:border-[#3A3B3C] rounded-2xl bg-white dark:bg-[#242526] flex-col overflow-hidden relative shadow-sm shrink-0"
                style={{ height: `${commentsBoxHeight}px`, minHeight: "380px" }}
              >
                <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] bg-gray-50 dark:bg-[#1f2021] rounded-none sm:rounded-t-2xl shrink-0 z-10">
                  <h3 className="text-[17px] font-bold text-gray-900 dark:text-[#E4E6EB] flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                    {t("comments") || "Comments"} <span className="text-gray-500 dark:text-[#B0B3B8] font-medium">({comments.length})</span>
                  </h3>
                </div>

                <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-20">
                  {isLoadingComments ? (
                    [1,2,3].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
                        <div className="flex-1 flex flex-col gap-2 pt-1"><div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/4" /><div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4" /></div>
                      </div>
                    ))
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 flex-1">
                      <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <p className="text-gray-500 dark:text-[#B0B3B8] font-medium text-[15px]">{t("noCommentsYet") || "Belum ada komentar."}</p>
                    </div>
                  ) : (
                    <>
                      {comments.map(c => (
                        <CommentItem
                          key={c.id}
                          comment={c}
                          locale={locale}
                          t={tGlobal}
                          router={router}
                          currentUser={user}
                          handleLikeComment={handleLikeComment}
                          handleReplyClick={handleReplyClick}
                          replyingTo={replyingTo}
                          isExpanded={isExpanded}
                          traceInfo={traceInfo}
                          setTraceInfo={setTraceInfo}
                          rootId={c.id}
                          bgColorClass="bg-white dark:bg-[#242526]"
                          renderCommentContent={renderCommentContent}
                          renderInput={(commentId: string) => {
                            if (replyingTo?.commentId !== commentId) return null;
                            return (
                              <InlineReplyInput
                                currentUser={user}
                                t={tGlobal}
                                initialMention={{
                                  username: (replyingTo as any).username,
                                  id: (replyingTo as any).id,
                                  displayName: replyingTo.name,
                                  commentId: replyingTo.commentId
                                }}
                                onCancel={() => setReplyingTo(null)}
                                onSubmit={async (text: string) => { await handleInlineSubmit(text, replyingTo?.parentId || commentId); }}
                              />
                            );
                          }}
                        />
                      ))}
                      {nextCursor && (
                        <button onClick={() => fetchComments(nextCursor)} className="text-purple-500 hover:underline text-[13px] font-semibold mt-2 self-center">
                          Muat lebih banyak komentar
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Floating Comment Input (Same UI/UX as PostDetailModal) */}
                <CommentInput
                  editor={editor}
                  commentText={commentInput}
                  isSubmitting={isSubmitting}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  handleSubmitComment={handleTopLevelSubmit}
                  isEmojiOpen={isEmojiOpen}
                  setIsEmojiOpen={setIsEmojiOpen}
                  emojiRef={emojiRef}
                  isOpen={isInputOpen}
                  setIsOpen={setIsInputOpen}
                  containerClassName="bottom-10"
                />

                {/* Bottom drag handle to expand comments box downwards */}
                <div 
                  onPointerDown={handleCommentsBoxResizeDown}
                  onTouchStart={handleCommentsBoxTouchStart}
                  className="w-full h-[38px] flex items-center justify-center cursor-ns-resize bg-gray-50 dark:bg-[#1E1F20] hover:bg-gray-100 dark:hover:bg-[#2A2B2D] active:bg-gray-200 dark:active:bg-[#333436] border-t border-gray-200 dark:border-[#3A3B3C] transition-colors group shrink-0 touch-none select-none rounded-none sm:rounded-b-2xl mt-auto z-20 active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                  title={t("expandComments") || "Tarik ke bawah untuk memperbesar area komentar"}
                >
                  <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-purple-500 group-active:bg-purple-500 transition-colors pointer-events-none" />
                </div>
              </div>

              {/* Right Column: Profile CTA */}
              <div className="w-full lg:w-[40%] shrink-0">
                <div className="sticky top-24 flex flex-col items-center text-center">
                  {avatar ? <img src={avatar} alt={displayName} className="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-white dark:ring-[#18191A] mb-4" /> : <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-3xl ring-4 ring-white dark:ring-[#18191A] mb-4">{displayName[0].toUpperCase()}</div>}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E6EB] leading-tight">{displayName}</h3>
                  <p className="text-[15px] text-gray-500 dark:text-[#B0B3B8] mt-1 mb-6">@{profileUser.username}</p>
                  <div className="flex flex-col gap-3 w-full max-w-[280px]">
                    <Link href={`/${locale}/p/${profileUser.username}/${profileUser.id}`} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-center text-[15px] transition-all hover:-translate-y-0.5 shadow-sm shadow-purple-200 dark:shadow-none">{t("viewProfile") || "Lihat Profil"}</Link>
                    <Link href={`/${locale}/project/${profileUser.username}`} className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-800 dark:text-[#E4E6EB] font-bold rounded-xl text-[14px] text-center transition-colors">{t("viewOtherProjects") || "Project Lain"}</Link>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mt-6 w-fit mx-auto">
                    <div className="flex items-center gap-1 bg-white dark:bg-[#242526] px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-[#3A3B3C]">
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
                    </div>
                    <button 
                      onClick={handleShare} 
                      title={t("share") || "Bagikan"}
                      aria-label={t("share") || "Bagikan"}
                      className="flex shrink-0 items-center justify-center w-10 h-10 bg-white dark:bg-[#242526] rounded-2xl shadow-sm border border-gray-100 dark:border-[#3A3B3C] text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="mt-20 flex justify-center pb-2">
        <img src="/logo-horizontal.png" alt="Mencari" className="h-16 grayscale opacity-50 dark:opacity-40" />
      </div>

      {/* Collaboration Message Modal */}
      {isCollabModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#242526] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {!isCollabMessageSent && (<div className="p-4 border-b border-gray-100 dark:border-[#3A3B3C] flex justify-between items-center bg-gray-50 dark:bg-[#1f2021]"><h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">{t("sendCollabTitle") || "Kirim Pesan Kolaborasi"}</h3><button onClick={() => setIsCollabModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>)}
            <div className="p-5">
              {!isCollabMessageSent ? (
                <>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-4">Kirim pesan ke <span className="font-bold text-gray-900 dark:text-gray-200">@{profileUser.username}</span> terkait project <span className="font-bold">"{p.title}"</span>.</p>
                  <textarea value={collabMessage} onChange={(e) => setCollabMessage(e.target.value)} className="w-full bg-gray-100 dark:bg-[#3A3B3C] border-none rounded-xl p-3 text-[14px] text-gray-900 dark:text-[#E4E6EB] focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[100px]" placeholder="Tulis pesan Anda disini..." />
                  <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setIsCollabModalOpen(false)} className="px-4 py-2 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors">Batal</button>
                    <button onClick={() => setIsCollabMessageSent(true)} className="px-4 py-2 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">{t("send") || "Kirim"}</button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                  <h4 className="font-bold text-gray-900 dark:text-[#E4E6EB] mb-2 text-xl">Pesan terkirim!</h4>
                  <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8 mt-1">{t("messageSentSubtext") || "Cek menu obrolan secara berkala"}</p>
                  <button onClick={() => setIsCollabModalOpen(false)} className="px-6 py-2 font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm">{t("viewProject") || "Lihat project"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user && (
        <SaveToFolderModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          userId={user.id}
          targetType="project"
          targetId={id}
        />
      )}

      {/* Floating Stargazers Mini Popups (Desktop & Mobile) */}
      {stargazersAnchor && (
        <>
          <ProjectStargazersPopupDesktop
            isOpen={!!stargazersAnchor}
            onClose={() => setStargazersAnchor(null)}
            projectId={id}
            projectTitle={project?.title}
            anchorRect={stargazersAnchor}
          />
          <ProjectStargazersPopupMobile
            isOpen={!!stargazersAnchor}
            onClose={() => setStargazersAnchor(null)}
            projectId={id}
            projectTitle={project?.title}
            anchorRect={stargazersAnchor}
          />
        </>
      )}

      {/* Mobile Comments Modal */}
      <ProjectCommentsModalMobile
        isOpen={isMobileCommentsOpen}
        onClose={() => setIsMobileCommentsOpen(false)}
        comments={comments}
        isLoadingComments={isLoadingComments}
        nextCursor={nextCursor}
        fetchComments={fetchComments}
        locale={locale}
        t={t}
        tGlobal={tGlobal}
        router={router}
        currentUser={user}
        handleLikeComment={handleLikeComment}
        handleReplyClick={handleReplyClick}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        handleInlineSubmit={handleInlineSubmit}
        handleTopLevelSubmit={handleTopLevelSubmit}
        renderCommentContent={renderCommentContent}
        editor={editor}
        commentInput={commentInput}
        isSubmitting={isSubmitting}
        isEmojiOpen={isEmojiOpen}
        setIsEmojiOpen={setIsEmojiOpen}
        emojiRef={emojiRef}
        isInputOpen={isInputOpen}
        setIsInputOpen={setIsInputOpen}
        isExpanded={isExpanded}
        traceInfo={traceInfo}
        setTraceInfo={setTraceInfo}
      />
    </div>
  );
}
