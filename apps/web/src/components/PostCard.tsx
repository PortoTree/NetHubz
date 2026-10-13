"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/actions/posts";
import { toggleLike, toggleSave, incrementShareCount } from "@/app/actions/interactions";
import CreatePostModal from "./CreatePostModal";
import { MediaRenderer } from "./MediaRenderer";
import GiveawayCard from "./GiveawayCard";
import { ReactionSummaryPopup } from "./ReactionSummaryPopup";

import { ReactionButton, ReactionType, REACTION_CONFIG } from "./ReactionButton";
import Image from "next/image";
import toast from "react-hot-toast";
import SaveToFolderModal from "./SaveToFolderModal";
import { useMiniProfile } from "@/contexts/MiniProfileContext";
import { useShareModal } from "@/contexts/ShareContext";
import { getProfileUrl } from "@/utils/profileActions";
import { interactionsCache } from "@/utils/cache";

export function formatPostTime(timestamp: number | Date, t: any, locale: string) {
  const ts = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 5) {
    return t("time.justNow");
  } else if (hours < 1) {
    return t("time.minsAgo", { min: minutes });
  } else if (days < 1) {
    return t("time.hoursAgo", { hour: hours });
  } else if (days < 7) {
    return t("time.daysAgo", { day: days });
  } else {
    const d = new Date(ts);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
    const year = d.getFullYear();
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} | ${h}.${m}`;
  }
}

export default function PostCard({ post, currentUser, onProfileClick, isHighlighted = false, hideFooter = false, disableClicks = false, showAllReactions = false }: { post: any; currentUser: any; onProfileClick?: (user: any, event?: React.MouseEvent) => void; isHighlighted?: boolean; hideFooter?: boolean; disableClicks?: boolean; showAllReactions?: boolean; }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { openMiniProfile } = useMiniProfile();
  const { openShareModal } = useShareModal();

  const handleUserClick = (user: any, e?: React.MouseEvent) => {
    if (onProfileClick) {
      onProfileClick(user, e);
    } else {
      openMiniProfile(user, e);
    }
  };

  const [activePostMenu, setActivePostMenu] = useState<boolean>(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [modalViewMode, setModalViewMode] = useState<"GRID" | "CAROUSEL">("GRID");
  const [isTagListModalOpen, setIsTagListModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const activeUserId = currentUser?.id;
  const cacheKey = activeUserId ? `interaction_post_${post.id}_${activeUserId}` : null;

  const [isLiked, setIsLiked] = useState<ReactionType | null>(() => {
    if (cacheKey && interactionsCache.has(cacheKey)) {
      return interactionsCache.get(cacheKey).myReaction ?? null;
    }
    return post.myReaction || null;
  });
  const [likeCount, setLikeCount] = useState<number>(() => {
    if (cacheKey && interactionsCache.has(cacheKey)) {
      return interactionsCache.get(cacheKey).likeCount ?? post._count?.likes ?? 0;
    }
    return post._count?.likes || 0;
  });
  const [topReactions, setTopReactions] = useState<ReactionType[]>(() => {
    if (cacheKey && interactionsCache.has(cacheKey)) {
      return interactionsCache.get(cacheKey).topReactions ?? post.topReactions ?? [];
    }
    return post.topReactions || [];
  });
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const [isSaved, setIsSaved] = useState<boolean>(() => {
    if (cacheKey && interactionsCache.has(cacheKey)) {
      return interactionsCache.get(cacheKey).hasSaved ?? post.hasSaved ?? false;
    }
    return post.hasSaved || false;
  });
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [shareCount, setShareCount] = useState(post._count?.shares || 0);
  const [commentCount, setCommentCount] = useState<number>(() => {
    if (cacheKey && interactionsCache.has(cacheKey)) {
      return interactionsCache.get(cacheKey).commentCount ?? post._count?.comments ?? 0;
    }
    return post._count?.comments || 0;
  });

  // Sync with interactionsCache and cross-component broadcast events (SWR Pattern)
  useEffect(() => {
    if (!cacheKey) return;
    if (!interactionsCache.has(cacheKey)) {
      interactionsCache.set(cacheKey, {
        myReaction: post.myReaction || null,
        likeCount: post._count?.likes || 0,
        commentCount: post._count?.comments || 0,
        topReactions: post.topReactions || [],
        hasSaved: post.hasSaved || false,
      });
    } else {
      const cached = interactionsCache.get(cacheKey);
      if (cached.myReaction !== undefined) setIsLiked(cached.myReaction);
      if (cached.likeCount !== undefined) setLikeCount(cached.likeCount);
      if (cached.commentCount !== undefined) setCommentCount(cached.commentCount);
      if (cached.topReactions !== undefined) setTopReactions(cached.topReactions);
      if (cached.hasSaved !== undefined) setIsSaved(cached.hasSaved);
    }

    const handleSync = (e: any) => {
      if (e.detail?.postId === post.id) {
        if (e.detail.myReaction !== undefined) setIsLiked(e.detail.myReaction);
        if (e.detail.likeCount !== undefined) setLikeCount(e.detail.likeCount);
        if (e.detail.commentCount !== undefined) setCommentCount(e.detail.commentCount);
        if (e.detail.topReactions !== undefined) setTopReactions(e.detail.topReactions);
        if (e.detail.hasSaved !== undefined) setIsSaved(e.detail.hasSaved);
      }
    };

    window.addEventListener("post_interaction_updated", handleSync);
    return () => window.removeEventListener("post_interaction_updated", handleSync);
  }, [post.id, cacheKey]);

  const handleLike = async (reactionType: ReactionType = "LIKE") => {
    if (!currentUser || isLikeLoading) return;
    setIsLikeLoading(true);
    
    // Optimistic Update
    const prevReaction = isLiked as ReactionType | null;
    const isSameReaction = prevReaction === reactionType;
    const isRemovingLike = prevReaction && isSameReaction;
    const isAddingLike = !prevReaction;

    const nextReaction: ReactionType | null = isRemovingLike ? null : reactionType;
    const nextLikeCount: number = isRemovingLike ? Math.max(0, likeCount - 1) : (isAddingLike ? likeCount + 1 : likeCount);
    let nextTopReactions: ReactionType[] = topReactions;
    if (isRemovingLike) {
      nextTopReactions = topReactions.filter(r => r !== reactionType);
    } else {
      nextTopReactions = [reactionType, ...topReactions.filter(r => r !== reactionType)];
    }

    setIsLiked(nextReaction);
    setLikeCount(nextLikeCount);
    setTopReactions(nextTopReactions);

    if (cacheKey) {
      interactionsCache.set(cacheKey, {
        myReaction: nextReaction,
        likeCount: nextLikeCount,
        topReactions: nextTopReactions,
        hasSaved: isSaved,
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("post_interaction_updated", {
        detail: {
          postId: post.id,
          myReaction: nextReaction,
          likeCount: nextLikeCount,
          topReactions: nextTopReactions,
          hasSaved: isSaved,
        }
      }));
    }

    try {
      const res = await toggleLike(currentUser.id, "post", post.id, reactionType);
      if (!res.success) {
        // Revert on error
        setIsLiked(prevReaction);
        setLikeCount(likeCount);
        setTopReactions(topReactions);
        if (cacheKey) {
          interactionsCache.set(cacheKey, {
            myReaction: prevReaction,
            likeCount: likeCount,
            topReactions: topReactions,
            hasSaved: isSaved,
          });
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("post_interaction_updated", {
            detail: {
              postId: post.id,
              myReaction: prevReaction,
              likeCount: likeCount,
              topReactions: topReactions,
              hasSaved: isSaved,
            }
          }));
        }
        console.error(res.error);
      }
    } catch (error) {
      setIsLiked(prevReaction);
      setLikeCount(likeCount);
      setTopReactions(topReactions);
      if (cacheKey) {
        interactionsCache.set(cacheKey, {
          myReaction: prevReaction,
          likeCount: likeCount,
          topReactions: topReactions,
          hasSaved: isSaved,
        });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("post_interaction_updated", {
          detail: {
            postId: post.id,
            myReaction: prevReaction,
            likeCount: likeCount,
            topReactions: topReactions,
            hasSaved: isSaved,
          }
        }));
      }
      console.error(error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser || isSaveLoading) return;
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    setIsSaveLoading(true);

    if (cacheKey) {
      const existing = interactionsCache.get(cacheKey) || {};
      interactionsCache.set(cacheKey, {
        ...existing,
        hasSaved: newIsSaved,
      });
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("post_interaction_updated", {
        detail: {
          postId: post.id,
          hasSaved: newIsSaved,
        }
      }));
    }

    const res = await toggleSave(currentUser.id, "post", post.id);
    if (!res.success) {
      // Revert on failure
      setIsSaved(!newIsSaved);
      if (cacheKey) {
        const existing = interactionsCache.get(cacheKey) || {};
        interactionsCache.set(cacheKey, { ...existing, hasSaved: !newIsSaved });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("post_interaction_updated", {
          detail: { postId: post.id, hasSaved: !newIsSaved }
        }));
      }
      console.error(res.error);
    } else if (res.action === "saved") {
      const savedMsg = t("saveFolderModal.savedToast");
      const titleMsg = t("saveFolderModal.title");
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
      ), { duration: 5000 });
    }
    setIsSaveLoading(false);
  };

  const handleShare = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const username = post.author?.username || "user";
    const authorId = post.authorId || post.author?.id || username;
    const url = `${origin}/${locale}/p/${username}/${authorId}?postId=${post.id}`;

    openShareModal({
      id: post.id,
      type: "POST",
      title: post.title || undefined,
      text: post.content || undefined,
      url,
      authorName: post.author?.profile?.displayName || post.author?.username,
      authorUsername: post.author?.username,
      authorAvatar: post.author?.profile?.avatarUrl,
    });
  };

  useEffect(() => {
    setIsLiked(post.myReaction || null);
    setLikeCount(post._count?.likes || 0);
    setCommentCount(post._count?.comments || 0);
    setIsSaved(post.hasSaved || false);
    if (post.topReactions) setTopReactions(post.topReactions);
  }, [post.myReaction, post._count?.likes, post._count?.comments, post.hasSaved, post.topReactions]);

  useEffect(() => {
    if (isDeleteModalOpen || isMediaModalOpen || isTagListModalOpen || isEditModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isDeleteModalOpen, isMediaModalOpen, isTagListModalOpen, isEditModalOpen]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deletePost(post.id, currentUser.id);
    if (res.success) {
      window.dispatchEvent(new Event("refresh_feed"));
    } else {
      alert(res.error || "Failed to delete post");
    }
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
  };

  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    
    // Split by URLs, @mentions (allowing dots), and #hashtags
    const regex = /(https?:\/\/[^\s]+|@[\w.]+|#[\w_]+)/g;
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      if (part.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent font-medium hover:opacity-80 transition-opacity break-all" onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        );
      } else if (part.match(/^@[\w.]+$/)) {
        const username = part.slice(1);
        const taggedUser = post.taggedUsers?.find((u: any) => u.username === username);
        if (taggedUser) {
          const isCurrentUser = currentUser?.id === taggedUser.id || currentUser?.username === taggedUser.username;
          const colorClass = isCurrentUser ? "text-blue-500 font-semibold bg-blue-50 dark:bg-[#263951] px-1 rounded" : "text-sky-500 dark:text-sky-400";
          return (
            <span 
              key={i} 
              className={`${colorClass} hover:underline cursor-pointer`}
              onClick={(e) => {
                e.stopPropagation();
                handleUserClick(taggedUser, e);
              }}
            >
              {part}
            </span>
          );
        } else {
          return <span key={i} className="text-sky-500 dark:text-sky-400">{part}</span>;
        }
      } else if (part.match(/^#[\w_]+$/)) {
        const tag = part.slice(1).toLowerCase();
        return (
          <span 
            key={i} 
            className="text-blue-500 hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/explore?tag=${tag}`);
            }}
          >
            {part}
          </span>
        );
      }
      const renderTextFormatting = (raw: string, keyPrefix = ''): React.ReactNode => {
        if (!raw) return null;
        const match = raw.match(/(\*[^\*\n]+\*|_[^_\n]+_|~[^~\n]+~)/);
        if (!match || match.index === undefined) return raw;
        
        const index = match.index;
        const matchedStr = match[0];
        const before = raw.slice(0, index);
        const after = raw.slice(index + matchedStr.length);
        
        const char = matchedStr[0];
        const innerText = matchedStr.slice(1, -1);
        
        let formattedInner;
        if (char === '*') {
          formattedInner = <b key={keyPrefix + 'b'}>{renderTextFormatting(innerText, keyPrefix + 'in')}</b>;
        } else if (char === '_') {
          formattedInner = <i key={keyPrefix + 'i'}>{renderTextFormatting(innerText, keyPrefix + 'in')}</i>;
        } else if (char === '~') {
          formattedInner = <del key={keyPrefix + 'd'}>{renderTextFormatting(innerText, keyPrefix + 'in')}</del>;
        }

        return (
          <Fragment key={keyPrefix + 'frag'}>
            {before}
            {formattedInner}
            {renderTextFormatting(after, keyPrefix + 'after')}
          </Fragment>
        );
      };
      
      return <span key={i}>{renderTextFormatting(part)}</span>;
    });
  };



  // Fallbacks
  const authorName = post.author?.profile?.displayName || post.author?.username || "Pengguna";
  const authorAvatar = post.author?.profile?.avatarUrl || "/default-avatar.svg";
  
  // Custom Post Subtitle based on Label
  let postSubtitle = null;
  if (post.label === "MENCARI") {
    postSubtitle = (
      <span className="font-bold flex items-center gap-1">
        <svg className="w-3 h-3 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <span className="bg-gradient-to-r from-emerald-800 to-emerald-500 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent">
          Mencari...
        </span>
      </span>
    );
  } else if (post.label === "LOKASI" && post.author?.profile?.locationName) {
    postSubtitle = (
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
        {post.author.profile.locationName}
      </span>
    );
  } else if (post.label === "PROFESI" && post.author?.profile?.profession) {
    postSubtitle = (
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
        {post.author.profile.profession}
      </span>
    );
  } else if (post.label === "SEKOLAH" && post.author?.profile?.school) {
    postSubtitle = (
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>
        {post.author.profile.school}
      </span>
    );
  }

  return (
    <>
    <div className={`bg-transparent sm:bg-white sm:dark:bg-[#242526] rounded-none sm:rounded-xl shadow-none sm:shadow-sm border-0 sm:border border-b border-gray-300 dark:border-[#3E4042] pt-2 sm:pt-4 px-0 transition-all duration-1000 ${isHighlighted ? "sm:border-yellow-400 sm:dark:border-yellow-500 sm:shadow-[0_0_15px_rgba(250,204,21,0.4)] bg-yellow-50/50 sm:bg-white" : "sm:border-gray-300 sm:dark:border-[#3E4042]"}`}>
      {isHighlighted && (
        <div className="px-4 pb-2 mb-2 border-b border-gray-100 dark:border-[#3E4042] text-xs font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
          Postingan yang Anda cari
        </div>
      )}
      <div className="flex items-center justify-between pb-2 px-4 relative">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-150 select-none"
          onClick={(e) => {
            handleUserClick(post.author, e);
          }}
        >
          <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-emerald-600 dark:border-emerald-400">
            <img
              src={authorAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-black dark:text-[#E4E6EB] text-[15px] leading-tight hover:underline">
              {authorName}
            </h3>
            <div className="text-[12px] text-gray-500 dark:text-[#B0B3B8] flex items-center gap-1">
              {postSubtitle && (
                <>
                  {postSubtitle}
                  <span>·</span>
                </>
              )}
              <span>
                {formatPostTime(post.createdAt, t, locale)}
              </span>
              {/* Privacy Icon */}
              <span>·</span>
              {post.visibility === "PUBLIC" ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" /></svg>
              ) : post.visibility === "FRIENDS" ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
          <button
            onClick={() => setActivePostMenu(!activePostMenu)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-90 active:bg-gray-300 dark:active:bg-[#4E4F50] text-gray-500 dark:text-[#B0B3B8] transition-all duration-150 select-none"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>

          {activePostMenu && (
            <>
              {/* Overlay for clicking outside to close menu */}
              <div className="fixed inset-0 z-[10100]" onClick={() => setActivePostMenu(false)}></div>
              
              <div className="absolute right-0 mt-1 w-[260px] bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-[#3E4042] p-2 z-[10200]">
                <button 
                  onClick={() => { handleSave(); setActivePostMenu(false); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-[0.98] active:bg-gray-200 dark:active:bg-[#3A3B3C] transition-all text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px] select-none"
                >
                  <svg className={`w-6 h-6 ${isSaved ? 'text-orange-500' : 'text-gray-600 dark:text-[#B0B3B8]'}`} fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 0 : 2} d={isSaved ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
                  </svg>
                  {isSaved ? (t("postMenu.unsavePost") || "Hapus dari Tersimpan") : (t("postMenu.savePost") || "Simpan Postingan")}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePostMenu(false);
                    const username = post.author?.username;
                    const id = post.author?.id || post.authorId || username;
                    router.push(getProfileUrl(username, id, locale));
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-[0.98] active:bg-gray-200 dark:active:bg-[#3A3B3C] transition-all text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px] select-none"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t("postMenu.showProfile") || "Lihat Profil"}
                </button>
                
                {post.authorId === currentUser?.id && (
                  <>
                    <button onClick={() => { setIsEditModalOpen(true); setActivePostMenu(false); }} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-[0.98] active:bg-gray-200 dark:active:bg-[#3A3B3C] transition-all text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px] select-none">
                      <svg className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t("postMenu.editPost") || "Edit Postingan"}
                    </button>
                    <button onClick={() => { setIsDeleteModalOpen(true); setActivePostMenu(false); }} disabled={isDeleting} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-[0.98] active:bg-red-50 dark:active:bg-red-950/20 transition-all text-left text-red-500 font-semibold text-[15px] select-none">
                      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {isDeleting ? "Menghapus..." : (t("postMenu.deletePost") || "Hapus Postingan")}
                    </button>
                  </>
                )}

                {post.authorId !== currentUser?.id && (
                  <>
                    <div className="h-[1px] bg-gray-200 dark:bg-[#3E4042] my-1 mx-2" />
                    <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-[0.98] active:bg-red-50 dark:active:bg-red-950/20 transition-all text-left text-red-500 font-semibold text-[15px] select-none">
                      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {t("postMenu.reportPost") || "Laporkan"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="mb-3 px-4">
        <p className="text-black dark:text-[#E4E6EB] text-[15px] whitespace-pre-wrap break-words inline">
          {renderContentWithLinks((!isContentExpanded && post.content?.length > 185) ? post.content.slice(0, 185) + "..." : post.content)}
        </p>
        {!isContentExpanded && post.content?.length > 185 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsContentExpanded(true); }}
            className="text-gray-500 dark:text-[#B0B3B8] font-semibold underline ml-1 inline-block active:scale-95 transition-transform duration-150 select-none"
          >
            {t("common.seeMore") || "Lihat Selengkapnya"}
          </button>
        )}
        {isContentExpanded && post.content?.length > 185 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsContentExpanded(false); }}
            className="text-gray-500 dark:text-[#B0B3B8] font-semibold underline ml-1 inline-block active:scale-95 transition-transform duration-150 select-none"
          >
            {t("common.seeLess") || "Lebih Sedikit"}
          </button>
        )}
      </div>

      {/* Link Preview (If any) */}
      {post.linkMetadata && (
        <div className="px-4 mb-3">
          <a href={post.linkMetadata.url} target="_blank" rel="noopener noreferrer" className="block border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-[#242526] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors">
            {post.linkMetadata.image && (
              <div className="w-full h-48 bg-gray-200 dark:bg-[#3A3B3C] border-b border-gray-200 dark:border-gray-700">
                <img src={post.linkMetadata.image} alt={post.linkMetadata.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <p className="text-[12px] text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1 truncate">{post.linkMetadata.domain}</p>
              <h3 className="font-semibold text-[16px] text-black dark:text-[#E4E6EB] leading-tight mb-1 line-clamp-2">{post.linkMetadata.title}</h3>
              {post.linkMetadata.description && (
                <p className="text-[14px] text-gray-600 dark:text-[#B0B3B8] line-clamp-2">{post.linkMetadata.description}</p>
              )}
            </div>
          </a>
        </div>
      )}

      {/* Giveaway Card (If any) */}
      {post.giveaway && (
        <GiveawayCard giveaway={post.giveaway} currentUser={currentUser} />
      )}

      {/* Tagged Users Preview */}
      {post.taggedUsers && post.taggedUsers.length > 0 && (
        <div className="px-4 mb-3">
          {post.taggedUsers.length === 1 ? (
            <div 
              onClick={(e) => {
                handleUserClick(post.taggedUsers[0], e);
              }}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#3A3B3C] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors"
            >
              <img src={post.taggedUsers[0].profile?.avatarUrl || "/default-avatar.svg"} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex flex-col">
                <span className="font-semibold text-[15px] dark:text-[#E4E6EB]">{post.taggedUsers[0].profile?.displayName || post.taggedUsers[0].username}</span>
                <span className="text-[13px] text-gray-500">@{post.taggedUsers[0].username}</span>
              </div>
            </div>
          ) : post.taggedUsers.length === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {post.taggedUsers.map((user: any, idx: number) => (
                <div 
                  key={idx} 
                  onClick={(e) => {
                    handleUserClick(user, e);
                  }}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#3A3B3C] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors"
                >
                  <img src={user.profile?.avatarUrl || "/default-avatar.svg"} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-[14px] dark:text-[#E4E6EB] truncate w-full block">{user.profile?.displayName || user.username}</span>
                    <span className="text-[12px] text-gray-500 truncate w-full block">@{user.username}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={() => setIsTagListModalOpen(true)}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#3A3B3C] border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors"
            >
              <div className="flex -space-x-2 overflow-hidden">
                {post.taggedUsers.slice(0, 3).map((user: any, idx: number) => (
                  <img key={idx} src={user.profile?.avatarUrl || "/default-avatar.svg"} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#3A3B3C] object-cover" />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px] dark:text-[#E4E6EB]">{t("feed.taggedPeople")}</span>
                <span className="text-[13px] text-gray-500">{t("feed.peopleCount", { count: post.taggedUsers.length })}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Media (If any) */}

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="w-full mb-2">
          {post.mediaLayout === "CAROUSEL" && post.mediaUrls.length > 1 ? (
            <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
              <div 
                className="w-full h-full cursor-pointer flex items-center justify-center"
                onClick={() => {
                  setModalViewMode("CAROUSEL");
                  setIsMediaModalOpen(true);
                }}
              >
                <MediaRenderer 
                  url={post.mediaUrls[currentCarouselIndex]} 
                  alt={`Post media ${currentCarouselIndex + 1}`} 
                  className="w-full h-full object-contain"
                />
              </div>
              {currentCarouselIndex > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentCarouselIndex(prev => prev - 1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center transition-colors hover:bg-black/70"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              {currentCarouselIndex < post.mediaUrls.length - 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentCarouselIndex(prev => prev + 1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center transition-colors hover:bg-black/70"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.mediaUrls.map((_: any, idx: number) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentCarouselIndex ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            </div>
          ) : (
            /* Grid Layout (Default) */
            <div className={`grid gap-1 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {post.mediaUrls.slice(0, 2).map((url: string, idx: number) => (
                <div 
                  key={idx} 
                  className={`relative bg-[#F0F2F5] dark:bg-[#3A3B3C] flex items-center justify-center overflow-hidden cursor-pointer ${post.mediaUrls.length === 1 ? 'max-h-[500px]' : 'aspect-square'}`}
                  onClick={() => {
                    setModalViewMode(post.mediaUrls.length === 1 ? "CAROUSEL" : "GRID");
                    setCurrentCarouselIndex(idx);
                    setIsMediaModalOpen(true);
                  }}
                >
                  <div className="w-full h-full pointer-events-none">
                    <MediaRenderer url={url} alt={`Post media ${idx+1}`} className="w-full h-full object-cover" />
                  </div>
                  {idx === 1 && post.mediaUrls.length > 2 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors">
                      <span className="text-white text-3xl font-bold">+{post.mediaUrls.length - 2}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {/* Embedded Project */}
      {post.project && (
        <div className="px-4 pb-3">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/project/${post.author?.username || post.authorId}/${post.project.id}`);
            }}
            className="border border-gray-200 dark:border-[#4E4F50] rounded-xl overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3A3B3C]/50 transition-colors bg-white dark:bg-[#242526] flex flex-col sm:flex-row"
          >
            <div className="w-full sm:w-[140px] shrink-0 relative pointer-events-none border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-[#4E4F50]">
              {post.project.coverUrls?.[0] || post.project.mediaUrls?.[0] ? (
                <MediaRenderer url={post.project.coverUrls?.[0] || post.project.mediaUrls?.[0]} className="w-full h-full object-cover sm:aspect-auto aspect-video sm:min-h-[140px]" />
              ) : (
                <div className="w-full h-full sm:min-h-[140px] aspect-video sm:aspect-auto bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300 dark:text-[#4E4F50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>
            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-center">
              <div className="flex items-start justify-between mb-1 gap-2">
                <h3 className="font-bold text-[16px] text-gray-900 dark:text-[#E4E6EB] leading-tight line-clamp-2">{post.project.title}</h3>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 ${
                  post.project.status === "RELEASED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  post.project.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                  post.project.status === "OPEN_SOURCE" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                }`}>
                  {post.project.status.replace('_', ' ')}
                </span>
              </div>
              
              {post.project.techStack && post.project.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto">
                  {post.project.techStack.slice(0, 5).map((tech: string, i: number) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-[#3A3B3C] text-gray-600 dark:text-[#E4E6EB] rounded-full">
                      {tech}
                    </span>
                  ))}
                  {post.project.techStack.length > 5 && (
                    <span className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-[#3A3B3C] text-gray-500 rounded-full">
                      +{post.project.techStack.length - 5}
                    </span>
                  )}
                </div>
              )}
              
              {/* Project Engagement Counters */}
              <div className="flex items-center gap-4 mt-3 text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                  <span>{post.project._count?.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <span>{post.project._count?.comments || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery badge — tampil jika postingan terkait album */}
      {post.gallery && (
        <div className="px-4 pb-2 flex justify-start">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/p/${post.author?.username}/${post.authorId}?tab=gallery&galleryId=${post.gallery.id}`);
            }}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[13px] font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors max-w-full"
            title={post.gallery.name}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{post.gallery.name}</span>
          </button>
        </div>
      )}

      {/* Reaction Summary & Counts */}
      <div className="px-4 pb-2 flex items-center justify-between text-[#65676B] dark:text-[#B0B3B8] text-[15px]">
        <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
          <div className="flex items-center -space-x-1 z-0">
            {topReactions.length > 0 ? (
              (showAllReactions ? topReactions : topReactions.slice(0, 3)).map((r, i) => (
                <ReactionSummaryPopup key={r} targetId={post.id} targetType="POST" likeCount={likeCount} topReactions={topReactions} filterReactionType={r}>
                  <div className="w-[18px] h-[18px] rounded-full bg-white dark:bg-[#242526] relative z-10 flex items-center justify-center shadow-sm hover:z-20 hover:opacity-80 transition-opacity">
                     <Image src={REACTION_CONFIG[r].src} alt={r} fill className="object-contain" />
                  </div>
                </ReactionSummaryPopup>
              ))
            ) : likeCount > 0 ? (
              <ReactionSummaryPopup targetId={post.id} targetType="POST" likeCount={likeCount} topReactions={topReactions}>
                <div className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center shadow-sm hover:z-20 hover:opacity-80 transition-opacity">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                </div>
              </ReactionSummaryPopup>
            ) : null}
          </div>
          {likeCount > 0 && <span onClick={() => { if (!disableClicks) {
                  (window as any).__NethubzPrefetchedPost = post;
                  const searchParams = new URLSearchParams(window.location.search);
                  searchParams.set('postId', post.id);
                  router.push(`${window.location.pathname}?${searchParams.toString()}`, { scroll: false });
                } }}>{likeCount}</span>}
        </div>
        <div className="flex items-center gap-3">
          {commentCount > 0 && (
            <span className="cursor-pointer hover:underline" onClick={() => { if (!disableClicks) {
                  (window as any).__NethubzPrefetchedPost = post;
                  const searchParams = new URLSearchParams(window.location.search);
                  searchParams.set('postId', post.id);
                  router.push(`${window.location.pathname}?${searchParams.toString()}`, { scroll: false });
                } }}>
              {commentCount} {t("feed.comment") || "Komentar"}
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-4 mt-2">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-1 pt-0 sm:pt-1 border-t-0 sm:border-t border-gray-100 dark:border-[#3E4042]">

          {/* Action Buttons */}
          <div className="flex items-center justify-end sm:justify-between flex-1 sm:flex-auto sm:w-full gap-3 sm:gap-2">
            <ReactionButton myReaction={isLiked} onReact={handleLike} count={0} containerClassName="flex-none sm:flex-1" />
          <button 
            onClick={() => { if (!disableClicks) {
                  (window as any).__NethubzPrefetchedPost = post;
                  const searchParams = new URLSearchParams(window.location.search);
                  searchParams.set('postId', post.id);
                  router.push(`${window.location.pathname}?${searchParams.toString()}`, { scroll: false });
                } }}
            className="flex-none sm:flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-0 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-95 active:bg-gray-200/60 dark:active:bg-[#3A3B3C] text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] transition-all duration-150 bg-transparent select-none"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span>{t("feed.comment") || "Komentar"}</span>
          </button>
          <button 
            onClick={handleShare}
            className="flex-none sm:flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-0 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-95 active:bg-gray-200/60 dark:active:bg-[#3A3B3C] text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] transition-all duration-150 bg-transparent select-none"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            <span className="hidden sm:inline">{t("feed.share") || "Bagikan"}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
      
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 dark:bg-black/70 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col relative border border-gray-200 dark:border-[#3E4042] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <h2 className="text-[20px] font-bold text-black dark:text-[#E4E6EB]">
                {t("postMenu.deletePost") || "Hapus Postingan"}
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-9 h-9 bg-gray-200 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-[#4E4F50] active:scale-90 active:bg-gray-300 dark:active:bg-[#4E4F50] transition-all duration-150 text-gray-600 dark:text-[#B0B3B8] select-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-[15px] text-gray-600 dark:text-[#B0B3B8] mb-6">
                {t("postMenu.confirmDelete") || "Apakah Anda yakin ingin menghapus postingan ini?"}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2 rounded-lg font-semibold text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-95 active:bg-gray-300 dark:active:bg-[#4E4F50] transition-all duration-150 select-none">
                  {t("postMenu.cancel") || "Batal"}
                </button>
                <button onClick={handleDelete} disabled={isDeleting} className="px-5 py-2 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-95 active:bg-red-700 disabled:opacity-50 transition-all duration-150 flex items-center gap-2 select-none">
                  {isDeleting ? (t("postMenu.deleting") || "Menghapus...") : (t("postMenu.delete") || "Hapus")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CreatePostModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} currentUser={currentUser} initialPost={post} />
      
      {/* Submodal for Tagged Users List */}
      {isTagListModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 dark:bg-black/70 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col relative border border-gray-200 dark:border-[#3E4042] overflow-hidden max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <h2 className="text-[20px] font-bold text-black dark:text-[#E4E6EB]">
                {t("feed.taggedPeople")}
              </h2>
              <button onClick={() => setIsTagListModalOpen(false)} className="w-9 h-9 bg-gray-200 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors text-gray-600 dark:text-[#B0B3B8]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2">
              {post.taggedUsers?.map((user: any) => (
                <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors">
                  <img src={user.profile?.avatarUrl || "/default-avatar.svg"} className="w-10 h-10 rounded-full object-cover cursor-pointer" onClick={(e) => {
                      setIsTagListModalOpen(false);
                      handleUserClick(user, e);
                    }} />
                  <div className="flex flex-col flex-1 cursor-pointer" onClick={(e) => {
                      setIsTagListModalOpen(false);
                      handleUserClick(user, e);
                    }}>
                    <span className="font-semibold text-[15px] dark:text-[#E4E6EB]">{user.profile?.displayName || user.username}</span>
                    <span className="text-[13px] text-gray-500">@{user.username}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      setIsTagListModalOpen(false);
                      handleUserClick(user, e);
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-[#4E4F50] hover:bg-gray-200 dark:hover:bg-[#5C5D5F] rounded-lg text-sm font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                  >
                    {t("feed.profile")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      
      {isMediaModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/95 flex flex-col">
          {/* Header */}
          <div className={`${modalViewMode === "CAROUSEL" ? "absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/80 to-transparent" : "bg-black/95 shrink-0"} flex justify-between items-center p-4`}>
            <div className="text-white font-medium">{post.author?.displayName}</div>
            {post.mediaLayout === "GRID" && modalViewMode === "CAROUSEL" && post.mediaUrls.length > 1 ? (
              <button onClick={() => setModalViewMode("GRID")} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors" title="Kembali ke Grid">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            ) : (
              <button onClick={() => setIsMediaModalOpen(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors" title="Tutup Modal">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          
          <div className="flex-1 w-full h-full flex flex-col min-h-0">
            {modalViewMode === "CAROUSEL" ? (
              <div className="flex flex-col h-full w-full">
                {/* Main Carousel View */}
                <div className="relative flex-1 flex items-center justify-center min-h-0 w-full">
                  <MediaRenderer 
                    url={post.mediaUrls[currentCarouselIndex]} 
                    alt={`Modal media ${currentCarouselIndex + 1}`} 
                    className="w-full h-full object-contain"
                  />
                  {currentCarouselIndex > 0 && (
                    <button 
                      onClick={() => setCurrentCarouselIndex(prev => prev - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  )}
                  {currentCarouselIndex < post.mediaUrls.length - 1 && (
                    <button 
                      onClick={() => setCurrentCarouselIndex(prev => prev + 1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>
                {/* Thumbnails below the main image (if > 1) */}
                {post.mediaUrls.length > 1 && (
                  <div className="h-24 min-h-[96px] bg-black/50 p-2 flex items-center justify-center gap-2 overflow-x-auto">
                    {post.mediaUrls.map((url: string, idx: number) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentCarouselIndex(idx)}
                        className={`relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 transition-all ${idx === currentCarouselIndex ? 'ring-2 ring-white scale-105' : 'opacity-50 hover:opacity-100'}`}
                      >
                        <div className="w-full h-full pointer-events-none">
                          <MediaRenderer url={url} className="w-full h-full object-cover" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Modal Grid View */
              <div className="flex-1 w-full overflow-y-auto py-10 px-4">
                <div className="grid gap-3 w-full max-w-xl mx-auto grid-cols-2">
                  {post.mediaUrls.map((url: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="relative aspect-square bg-white/5 flex items-center justify-center rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform shadow-sm"
                      onClick={() => {
                        setCurrentCarouselIndex(idx);
                        setModalViewMode("CAROUSEL");
                      }}
                    >
                      <div className="w-full h-full pointer-events-none">
                        <MediaRenderer url={url} alt={`Modal media ${idx+1}`} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}


      {/* Save to Folder Modal */}
      <SaveToFolderModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        userId={currentUser?.id || ""}
        targetType="post"
        targetId={post.id}
      />
    </>
  );
}


