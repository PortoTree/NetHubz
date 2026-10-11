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
  getWhatsAppShareUrl,
  getFacebookShareUrl,
  getTelegramShareUrl,
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
    return filterFriends(friends, searchQuery);
  }, [friends, searchQuery]);

  if (!mounted || !isOpen || !shareData) return null;

  const fallbackText = shareData.type === "PROJECT" ? t("defaultFallbackProject") : t("defaultFallbackPost");
  const shareText = formatShareMessage(shareData.title, shareData.text, fallbackText);
  const waUrl = getWhatsAppShareUrl(shareData.url, shareText);
  const fbUrl = getFacebookShareUrl(shareData.url);
  const tgUrl = getTelegramShareUrl(shareData.url, shareText);

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

  const handleInstagramShare = async () => {
    await copyShareLink(shareData.url);
    toast.success(t("toastInstagram"));
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const handleOtherShare = async () => {
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

            {/* List Teman */}
            <div className="max-h-[170px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
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
                filteredFriends.map((friend) => {
                  const isSent = sentFriendIds.has(friend.id);
                  const fAvatar = friend.avatarUrl
                    ? getOptimizedUrl(friend.avatarUrl, "avatar") || friend.avatarUrl
                    : "/default-avatar.svg";

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={fAvatar}
                          alt={friend.displayName}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 truncate leading-snug">
                            {friend.displayName}
                          </p>
                          <p className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendToFriend(friend)}
                        disabled={isSent}
                        className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all shrink-0 ${
                          isSent
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        }`}
                      >
                        {isSent ? `${t("sent")} ✓` : t("send")}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bagian 2: Media Sosial Eksternal (Clean Icon tanpa bulatan pembungkus) */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#3E4042]">
            <span className="text-[13.5px] font-bold text-gray-900 dark:text-[#E4E6EB] block mb-3">
              {t("socialTitle")}
            </span>
            <div className="flex items-center gap-6 px-1">
              {/* WhatsApp */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                aria-label="WhatsApp"
                className="transition-transform duration-200 hover:scale-120 active:scale-95 cursor-pointer flex items-center justify-center text-[#25D366] hover:opacity-90"
              >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.79 14.04c-.24.68-1.2 1.25-1.65 1.33-.42.08-.96.11-1.56-.08-.36-.12-.84-.28-1.46-.55-2.59-1.12-4.28-3.77-4.41-3.94-.13-.17-1.05-1.4-1.05-2.67 0-1.27.67-1.89.9-2.15.24-.26.52-.33.7-.33.17 0 .35 0 .5.01.16.01.37-.06.58.44.22.52.74 1.8.8 1.93.07.13.11.29.02.46-.08.17-.13.28-.26.43-.13.15-.27.34-.39.46-.13.13-.26.27-.11.53.15.26.68 1.12 1.46 1.81 1 .89 1.85 1.17 2.11 1.3.26.13.41.11.57-.07.15-.17.65-.76.82-1.02.17-.26.35-.22.58-.13.24.08 1.5.71 1.76.84.26.13.43.2.5.3.06.12.06.68-.18 1.36z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                aria-label="Facebook"
                className="transition-transform duration-200 hover:scale-120 active:scale-95 cursor-pointer flex items-center justify-center text-[#1877F2] hover:opacity-90"
              >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Telegram */}
              <a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram"
                aria-label="Telegram"
                className="transition-transform duration-200 hover:scale-120 active:scale-95 cursor-pointer flex items-center justify-center text-[#229ED9] hover:opacity-90"
              >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.91-2.12 5.89-2.54 2.81-1.17 3.39-1.37 3.77-1.38.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                </svg>
              </a>

              {/* Instagram */}
              <button
                onClick={handleInstagramShare}
                title="Instagram"
                aria-label="Instagram"
                className="transition-transform duration-200 hover:scale-120 active:scale-95 cursor-pointer flex items-center justify-center text-[#E4405F] hover:opacity-90"
              >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </button>

              {/* Other / Lainnya (System Share Sheet) */}
              <button
                onClick={handleOtherShare}
                title={t("other")}
                aria-label={t("other")}
                className="transition-transform duration-200 hover:scale-120 active:scale-95 cursor-pointer flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <svg className="w-8 h-8 fill-none stroke-current" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
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
