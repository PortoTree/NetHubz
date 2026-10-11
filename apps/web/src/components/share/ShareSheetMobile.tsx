"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { SharePayload } from "@/contexts/ShareContext";
import { useUser } from "@/contexts/UserContext";
import { getFriends } from "@/app/actions/connections";
import {
  FriendItem,
  formatShareMessage,
  filterFriends,
  copyShareLink,
  triggerNativeShare,
} from "@/utils/shareHelpers";
import { getOptimizedUrl } from "@/utils/cloudinary";

interface ShareSheetMobileProps {
  isOpen: boolean;
  shareData: SharePayload | null;
  onClose: () => void;
}

export default function ShareSheetMobile({
  isOpen,
  shareData,
  onClose,
}: ShareSheetMobileProps) {
  const t = useTranslations("shareModal");
  const { currentUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const [isCopied, setIsCopied] = useState(false);

  // Drag-to-dismiss gesture states & slide animation
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatedIn, setIsAnimatedIn] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const pointerStartY = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Slide-in animation trigger on mount/open
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setDragOffset(0);
      const raf = requestAnimationFrame(() => {
        setIsAnimatedIn(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsAnimatedIn(false);
    }
  }, [isOpen]);

  // Fetch friends when opened
  useEffect(() => {
    if (!isOpen || !currentUser?.id) {
      setSearchQuery("");
      setSentFriendIds(new Set());
      setDragOffset(0);
      setIsDragging(false);
      setFriends([]);
      return;
    }

    let isSubscribed = true;
    setIsLoadingFriends(true);

    getFriends(currentUser.id)
      .then((res) => {
        if (!isSubscribed) return;
        if (res.success && res.data) {
          setFriends(res.data);
        }
      })
      .catch((err) => {
        console.error("Error loading friends for mobile share sheet:", err);
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingFriends(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, currentUser?.id]);

  const filteredFriends = useMemo(() => {
    return filterFriends(friends, searchQuery, 8);
  }, [friends, searchQuery]);

  // Smooth slide-down dismiss
  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 240);
  };

  // Drag gesture handlers on handle bar (supports both Touch & Mouse pointer)
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartY.current = e.clientY;
    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientY - pointerStartY.current;
    if (delta > 0) {
      setDragOffset(delta);
    } else {
      setDragOffset(delta * 0.15); // gentle rubber-band resistance on pull-up
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (dragOffset > 70) {
      handleDismiss();
    } else {
      setDragOffset(0);
    }
  };

  if (!mounted || !isOpen || !shareData) return null;

  const fallbackText = shareData.type === "PROJECT" ? t("defaultFallbackProject") : t("defaultFallbackPost");
  const shareText = formatShareMessage(shareData.title, shareData.text, fallbackText);

  const handleCopy = async () => {
    const success = await copyShareLink(shareData.url);
    if (success) {
      setIsCopied(true);
      toast.success(t("toastCopied"));
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error(t("toastCopyFailed"));
    }
  };

  const handlePlatformShare = async () => {
    const success = await triggerNativeShare({
      title: shareData.title,
      text: shareText,
      url: shareData.url,
    });
    if (!success) {
      handleCopy();
    }
  };

  const handleSendToFriend = (friend: FriendItem) => {
    setSentFriendIds((prev) => new Set(prev).add(friend.id));
    toast.success(t("toastSent", { name: friend.displayName || friend.username }));
  };

  const authorAvatar = shareData.authorAvatar
    ? getOptimizedUrl(shareData.authorAvatar, "avatar") || shareData.authorAvatar
    : "/default-avatar.svg";

  const translateY = isClosing
    ? "100%"
    : isDragging
    ? `${Math.max(0, dragOffset)}px`
    : isAnimatedIn
    ? `${dragOffset}px`
    : "100%";

  return createPortal(
    <div className="fixed inset-0 z-[100050] flex md:hidden flex-col justify-end">
      {/* Dark Transparent Backdrop (No Blur) */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-200 ${
          isAnimatedIn && !isClosing ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Native Slide Bottom Sheet */}
      <div
        style={{
          transform: `translateY(${translateY})`,
          transition: isDragging ? "none" : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative z-10 w-full bg-white dark:bg-[#242526] rounded-t-[28px] shadow-[0_-12px_45px_rgba(0,0,0,0.4)] border-t border-gray-200 dark:border-[#3E4042] flex flex-col max-h-[85vh] overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Bar Header */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="pt-3.5 pb-2 px-4 cursor-grab active:cursor-grabbing flex flex-col items-center touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <div className="w-full flex items-center justify-between mt-2.5 px-2">
            <div>
              <h2 className="font-bold text-[17px] text-gray-900 dark:text-white">
                {shareData.type === "PROJECT" ? t("titleProject") : t("titlePost")}
              </h2>
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                {t("subtitleMobile")}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              aria-label={t("close")}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] text-gray-600 dark:text-[#E4E6EB] flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 pt-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-8">
          {/* Mini Preview Card */}
          <div className="p-3 bg-gray-50 dark:bg-[#1C1D1E] rounded-xl border border-gray-200/80 dark:border-[#363738] flex items-start gap-2.5">
            <img
              src={authorAvatar}
              alt="Author"
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 truncate">
                  {shareData.authorName || shareData.authorUsername || "NetHubz User"}
                </span>
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {shareData.type === "PROJECT" ? t("projectBadge") : t("postBadge")}
                </span>
              </div>
              {shareData.title && (
                <p className="font-medium text-[12.5px] text-gray-800 dark:text-gray-200 truncate">
                  {shareData.title}
                </p>
              )}
              {shareData.text && (
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                  {shareData.text}
                </p>
              )}
            </div>
          </div>

          {/* Bagian 1: Kirim Langsung ke Teman NetHubz */}
          <div>
            <div className="mb-2">
              <span className="text-[13px] font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("friendsTitle")}
              </span>
            </div>

            {/* Input Pencarian Teman */}
            <div className="relative mb-2.5">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-[#18191A] border border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-xl text-[12.5px] text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none"
              />
            </div>

            {/* Friends list (Horizontal 4x2 grid) */}
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-0.5">
              {isLoadingFriends ? (
                <div className="py-6 text-center text-gray-400 text-[12.5px] flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  {t("loadingFriends")}
                </div>
              ) : friends.length === 0 ? (
                <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-[12px]">
                  {t("noFriends")}
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-[12px]">
                  {t("noMatchingFriends")}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 py-1">
                  {filteredFriends.map((friend) => {
                    const isSent = sentFriendIds.has(friend.id);
                    const fAvatar = friend.avatarUrl
                      ? getOptimizedUrl(friend.avatarUrl, "avatar") || friend.avatarUrl
                      : "/default-avatar.svg";

                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleSendToFriend(friend)}
                        disabled={isSent}
                        className={`group flex flex-col items-center text-center p-1.5 rounded-xl transition-all cursor-pointer ${
                          isSent
                            ? "opacity-90 cursor-default"
                            : "hover:bg-gray-100 dark:hover:bg-[#3A3B3C]/50 active:scale-95"
                        }`}
                      >
                        <div className="relative mb-1">
                          <img
                            src={fAvatar}
                            alt={friend.displayName}
                            className={`w-12 h-12 rounded-full object-cover transition-all ${
                              isSent
                                ? "ring-2 ring-emerald-500 scale-95"
                                : "ring-1 ring-gray-200 dark:ring-gray-700 active:ring-blue-500"
                            }`}
                          />
                          {isSent && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shadow-md">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[11.5px] font-semibold text-gray-900 dark:text-gray-100 truncate w-full leading-tight">
                          {friend.displayName}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full leading-tight mt-0.5">
                          @{friend.username}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tombol Bagikan ke Platform */}
          <div className="pt-1 border-t border-gray-200 dark:border-[#3E4042]">
            <button
              onClick={handlePlatformShare}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-teal-500 to-emerald-400 active:from-purple-700 active:via-teal-600 active:to-emerald-500 text-white font-semibold text-[14px] shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 fill-none stroke-current shrink-0" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span>{t("shareToPlatform")}</span>
            </button>
          </div>


        </div>
      </div>
    </div>,
    document.body
  );
}
