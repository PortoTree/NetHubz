"use client";

import React, { useState, useEffect, useMemo } from "react";
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

interface ShareModalDesktopProps {
  isOpen: boolean;
  shareData: SharePayload | null;
  onClose: () => void;
}

export default function ShareModalDesktop({
  isOpen,
  shareData,
  onClose,
}: ShareModalDesktopProps) {
  const t = useTranslations("shareModal");
  const { currentUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch friends when opened
  useEffect(() => {
    if (!isOpen || !currentUser?.id) {
      setSearchQuery("");
      setSentFriendIds(new Set());
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
        console.error("Error loading friends for share modal:", err);
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingFriends(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, currentUser?.id]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredFriends = useMemo(() => {
    return filterFriends(friends, searchQuery, 8);
  }, [friends, searchQuery]);

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

  return createPortal(
    <div
      className="fixed inset-0 z-[100050] bg-black/60 hidden md:flex items-center justify-center p-4 transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-white dark:bg-[#242526] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_65px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-[#3E4042] overflow-hidden flex flex-col max-h-[85vh] transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3E4042]">
          <div>
            <h2 className="font-bold text-[18px] text-gray-900 dark:text-white">
              {shareData.type === "PROJECT" ? t("titleProject") : t("titlePost")}
            </h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
              {t("subtitleDesktop")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-600 dark:text-[#E4E6EB] flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Preview Card */}
          <div className="p-3.5 bg-gray-50 dark:bg-[#1C1D1E] rounded-xl border border-gray-200/80 dark:border-[#363738] flex items-start gap-3">
            <img
              src={authorAvatar}
              alt="Author"
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-[13.5px] text-gray-900 dark:text-gray-100 truncate">
                  {shareData.authorName || shareData.authorUsername || "NetHubz User"}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {shareData.type === "PROJECT" ? t("projectBadge") : t("postBadge")}
                </span>
              </div>
              {shareData.title && (
                <p className="font-medium text-[13px] text-gray-800 dark:text-gray-200 truncate">
                  {shareData.title}
                </p>
              )}
              {shareData.text && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                  {shareData.text}
                </p>
              )}
            </div>
          </div>

          {/* Bagian 1: Kirim Langsung ke Teman NetHubz */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13.5px] font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("friendsTitle")}
              </span>
              <span className="text-[11.5px] text-gray-400 dark:text-gray-500">
                {t("friendsCount", { count: friends.length })}
              </span>
            </div>

            {/* Input Pencarian Teman */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-[13px] bg-gray-100 dark:bg-[#18191A] border border-transparent focus:border-blue-500 rounded-xl outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-colors"
              />
            </div>

            {/* List Teman (Horizontal 4x2 grid) */}
            <div className="max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {isLoadingFriends ? (
                <div className="py-6 flex items-center justify-center gap-2 text-[12.5px] text-gray-400">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>{t("loadingFriends")}</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-gray-400">
                  {t("noFriends")}
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-gray-400">
                  {t("noMatchingFriends")}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-y-3.5 gap-x-3 py-1">
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
                        className={`group flex flex-col items-center text-center p-2 rounded-xl transition-all cursor-pointer ${
                          isSent
                            ? "opacity-90 cursor-default"
                            : "hover:bg-gray-100 dark:hover:bg-[#3A3B3C]/60 active:scale-95"
                        }`}
                      >
                        <div className="relative mb-1.5">
                          <img
                            src={fAvatar}
                            alt={friend.displayName}
                            className={`w-13 h-13 rounded-full object-cover transition-all ${
                              isSent
                                ? "ring-2 ring-emerald-500 scale-95"
                                : "ring-1 ring-gray-200 dark:ring-gray-700 group-hover:ring-2 group-hover:ring-blue-500 group-hover:scale-105"
                            }`}
                          />
                          {isSent && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 truncate w-full leading-tight">
                          {friend.displayName}
                        </span>
                        <span className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate w-full leading-tight mt-0.5">
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
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-teal-500 to-emerald-400 hover:from-purple-500 hover:via-teal-400 hover:to-emerald-300 text-white font-semibold text-[14px] shadow-sm hover:shadow-md hover:shadow-purple-500/10 active:scale-[0.98] transition-all cursor-pointer"
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

          {/* Salin Tautan Box */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#3E4042]">
            <span className="text-[13.5px] font-bold text-gray-900 dark:text-[#E4E6EB] block mb-2">
              {t("copyTitle")}
            </span>
            <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-[#18191A] border border-gray-200 dark:border-[#3E4042] rounded-xl">
              <input
                type="text"
                readOnly
                value={shareData.url}
                className="flex-1 bg-transparent px-3 text-[12.5px] text-gray-700 dark:text-gray-300 outline-none truncate select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold transition-all shrink-0 ${
                  isCopied
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                {isCopied ? `${t("copied")} ✓` : t("copy")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
