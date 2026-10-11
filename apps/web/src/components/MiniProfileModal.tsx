"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { getMiniProfileData } from "@/app/actions/profile";
import { toggleFollow } from "@/app/actions/connections";
import { useUser } from "@/contexts/UserContext";
import { calculatePopoverPosition, shouldCloseOnScroll, RectLike } from "@/utils/popoverPosition";
import { getProfileActions, calculateOptimisticFollow, getProfileUrl } from "@/utils/profileActions";

export interface MiniProfileTarget {
  id?: string;
  userId?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
  };
}

interface MiniProfileModalProps {
  isOpen: boolean;
  targetUser: MiniProfileTarget | null;
  anchorRect?: RectLike | null;
  onClose: () => void;
}

function formatCount(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

export default function MiniProfileModal({
  isOpen,
  targetUser,
  anchorRect,
  onClose,
}: MiniProfileModalProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "id";
  const t = useTranslations();
  const { currentUser } = useUser();

  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [profileData, setProfileData] = useState<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    bio: string | null;
  } | null>(null);

  const [stats, setStats] = useState<{
    followers: number;
    friends: number;
    posts: number;
  } | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute flexible popover position whenever opened or anchor changes
  useEffect(() => {
    if (!isOpen) {
      setCardPosition(null);
      return;
    }

    const cardWidth = window.innerWidth < 400 ? Math.min(320, window.innerWidth - 24) : 340;
    const estimatedCardHeight = 310;

    if (anchorRect) {
      const pos = calculatePopoverPosition(
        anchorRect,
        { width: cardWidth, height: estimatedCardHeight },
        { width: window.innerWidth, height: window.innerHeight }
      );
      setCardPosition({ top: pos.top, left: pos.left });
    } else {
      // Centered floating fallback when no anchor is provided
      const top = Math.max(20, Math.round((window.innerHeight - estimatedCardHeight) / 2));
      const left = Math.max(12, Math.round((window.innerWidth - cardWidth) / 2));
      setCardPosition({ top, left });
    }
  }, [isOpen, anchorRect]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close popup immediately when user scrolls or gestures to scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollEvent = (e: Event) => {
      const isInsideCard = !!(
        cardRef.current &&
        e.target instanceof Node &&
        cardRef.current.contains(e.target)
      );

      if (shouldCloseOnScroll(e.type, isInsideCard)) {
        onClose();
      }
    };

    window.addEventListener("scroll", handleScrollEvent, { capture: true, passive: true });
    window.addEventListener("wheel", handleScrollEvent, { passive: true });
    window.addEventListener("touchmove", handleScrollEvent, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollEvent, { capture: true });
      window.removeEventListener("wheel", handleScrollEvent);
      window.removeEventListener("touchmove", handleScrollEvent);
    };
  }, [isOpen, onClose]);

  // Load data whenever targetUser changes
  useEffect(() => {
    if (!isOpen || !targetUser) {
      setProfileData(null);
      setStats(null);
      setIsFollowing(false);
      return;
    }

    const initialUserId = targetUser.id || targetUser.userId || "";
    const initialUsername = targetUser.username || "";
    const initialDisplayName =
      targetUser.profile?.displayName || targetUser.displayName || initialUsername;
    const initialAvatar = targetUser.profile?.avatarUrl || targetUser.avatarUrl || null;
    const initialCover = targetUser.profile?.coverUrl || targetUser.coverUrl || null;
    const initialBio = targetUser.profile?.bio || targetUser.bio || null;

    setProfileData({
      id: initialUserId,
      username: initialUsername,
      displayName: initialDisplayName,
      avatarUrl: initialAvatar,
      coverUrl: initialCover,
      bio: initialBio,
    });
    setStats(null);
    setIsLoading(true);

    let isMounted = true;

    getMiniProfileData(
      {
        userId: initialUserId || undefined,
        username: initialUsername || undefined,
      },
      currentUser?.id
    )
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setProfileData({
            id: res.data.id,
            username: res.data.username,
            displayName: res.data.displayName,
            avatarUrl: res.data.avatarUrl,
            coverUrl: res.data.coverUrl,
            bio: res.data.bio,
          });
          setStats(res.data.stats);
          setIsFollowing(res.data.isFollowing);
        }
      })
      .catch((err) => {
        console.error("Failed to load mini profile data:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUser, currentUser?.id]);

  const handleFollowToggle = useCallback(async () => {
    if (!profileData?.id || isFollowLoading) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token || !currentUser?.id) {
      router.push(`/${locale}/login`);
      return;
    }

    const currentFollowers = stats?.followers ?? 0;
    const optimistic = calculateOptimisticFollow(isFollowing, currentFollowers);

    // Apply optimistic update
    setIsFollowing(optimistic.isFollowing);
    setStats((prev) => (prev ? { ...prev, followers: optimistic.followersCount } : null));
    setIsFollowLoading(true);

    try {
      const res = await toggleFollow(token, currentUser.id, profileData.id);
      if (!res.success) {
        // Revert on server error
        setIsFollowing(isFollowing);
        setStats((prev) => (prev ? { ...prev, followers: currentFollowers } : null));
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setIsFollowing(isFollowing);
      setStats((prev) => (prev ? { ...prev, followers: currentFollowers } : null));
    } finally {
      setIsFollowLoading(false);
    }
  }, [profileData?.id, isFollowing, stats?.followers, isFollowLoading, currentUser?.id, locale, router]);

  const handleViewProfile = useCallback(() => {
    if (!profileData) return;
    onClose();
    const username = profileData.username;
    const id = profileData.id || username;
    router.push(getProfileUrl(username, id, locale));
  }, [profileData, onClose, locale, router]);

  if (!mounted || !isOpen || !profileData) return null;

  const actions = getProfileActions({
    currentUserId: currentUser?.id,
    currentUsername: currentUser?.username,
    targetUserId: profileData.id,
    targetUsername: profileData.username,
    isFollowing,
  });

  const avatarSrc = profileData.avatarUrl
    ? getOptimizedUrl(profileData.avatarUrl, "avatar") || profileData.avatarUrl
    : "/default-avatar.svg";

  const coverSrc = profileData.coverUrl
    ? getOptimizedUrl(profileData.coverUrl, "cover") || profileData.coverUrl
    : null;

  return createPortal(
    <>
      {/* Transparent Click-Outside Overlay (No Black Screen / No Fullscreen Dimming) */}
      <div
        className="fixed inset-0 z-[200000] bg-transparent cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Flexible Popover Card */}
      <div
        ref={cardRef}
        style={
          cardPosition
            ? {
                top: `${cardPosition.top}px`,
                left: `${cardPosition.left}px`,
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }
        }
        className="fixed z-[200001] w-[320px] sm:w-[340px] bg-white dark:bg-[#242526] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.22)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-gray-200/90 dark:border-[#393A3B] overflow-hidden select-none transition-all duration-150 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Banner */}
        <div className="relative h-24 w-full bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-purple-600/30 overflow-hidden">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-[#2A2B2D] dark:via-[#353638] dark:to-[#2A2B2D]" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Close Button X */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("profilePopup.close") || "Tutup"}
            className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-md cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar (Overlapping cover) */}
        <div className="relative -mt-9 px-4 flex items-end justify-between">
          <div className="w-18 h-18 rounded-full ring-4 ring-white dark:ring-[#242526] overflow-hidden bg-gray-100 dark:bg-[#3A3B3C] shadow-lg shrink-0">
            <img
              src={avatarSrc}
              alt={profileData.displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (!e.currentTarget.src.includes("/default-avatar.svg")) {
                  e.currentTarget.src = "/default-avatar.svg";
                }
              }}
            />
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 pt-2 pb-1">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-[#E4E6EB] truncate leading-tight">
            {profileData.displayName}
          </h3>
          <p className="text-xs font-medium text-gray-500 dark:text-[#B0B3B8] truncate mt-0.5">
            @{profileData.username}
          </p>
          {profileData.bio && (
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mt-2 leading-relaxed">
              {profileData.bio}
            </p>
          )}
        </div>

        {/* 3-Column Statistics */}
        <div className="mx-4 my-2.5 py-2 px-1 rounded-xl bg-gray-50 dark:bg-[#18191A] border border-gray-100 dark:border-[#3A3B3C]/50 grid grid-cols-3 divide-x divide-gray-200 dark:divide-[#3A3B3C] text-center">
          {/* Followers */}
          <div className="px-1 flex flex-col items-center justify-center">
            {isLoading && !stats ? (
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded my-0.5" />
            ) : (
              <span className="text-sm font-bold text-gray-900 dark:text-[#E4E6EB] leading-none">
                {formatCount(stats?.followers ?? 0)}
              </span>
            )}
            <span className="text-[11px] font-medium text-gray-500 dark:text-[#B0B3B8] mt-1">
              {t("profilePopup.followers") || "Pengikut"}
            </span>
          </div>

          {/* Friends */}
          <div className="px-1 flex flex-col items-center justify-center">
            {isLoading && !stats ? (
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded my-0.5" />
            ) : (
              <span className="text-sm font-bold text-gray-900 dark:text-[#E4E6EB] leading-none">
                {formatCount(stats?.friends ?? 0)}
              </span>
            )}
            <span className="text-[11px] font-medium text-gray-500 dark:text-[#B0B3B8] mt-1">
              {t("profilePopup.friends") || "Teman"}
            </span>
          </div>

          {/* Posts */}
          <div className="px-1 flex flex-col items-center justify-center">
            {isLoading && !stats ? (
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded my-0.5" />
            ) : (
              <span className="text-sm font-bold text-gray-900 dark:text-[#E4E6EB] leading-none">
                {formatCount(stats?.posts ?? 0)}
              </span>
            )}
            <span className="text-[11px] font-medium text-gray-500 dark:text-[#B0B3B8] mt-1">
              {t("profilePopup.posts") || "Postingan"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 pt-1">
          {actions.isSelf ? (
            /* Only [Lihat Profile] for self-account */
            <button
              type="button"
              onClick={handleViewProfile}
              className="w-full py-2 px-3 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t("profilePopup.viewProfile") || "Lihat Profil"}</span>
            </button>
          ) : (
            /* [Follow / Mengikuti] + [Lihat Profile] for other users */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={`flex-1 py-1.5 px-2.5 rounded-xl font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                  isFollowing
                    ? "bg-gray-200 dark:bg-[#3A3B3C] text-gray-800 dark:text-[#E4E6EB] hover:bg-gray-300 dark:hover:bg-[#4E4F50]"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                {isFollowing ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t("profilePopup.following") || "Mengikuti"}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t("profilePopup.follow") || "Ikuti"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleViewProfile}
                className="flex-1 py-1.5 px-2.5 rounded-xl font-semibold text-xs bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-900 dark:text-[#E4E6EB] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t("profilePopup.viewProfile") || "Lihat Profil"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
