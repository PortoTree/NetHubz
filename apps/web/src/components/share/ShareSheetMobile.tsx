"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { SharePayload } from "@/contexts/ShareContext";
import { useUser } from "@/contexts/UserContext";
import { getFriends } from "@/app/actions/connections";
import {
  FriendItem,
  formatShareMessage,
  getWhatsAppShareUrl,
  getTelegramShareUrl,
  getTwitterShareUrl,
  filterFriends,
  copyShareLink,
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
  const { currentUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const [isCopied, setIsCopied] = useState(false);

  // Drag-to-dismiss touch gesture states
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch friends when opened
  useEffect(() => {
    if (!isOpen || !currentUser?.id) {
      setSearchQuery("");
      setSentFriendIds(new Set());
      setDragOffset(0);
      setIsDragging(false);
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
    return filterFriends(friends, searchQuery);
  }, [friends, searchQuery]);

  // Touch drag gesture handlers on handle bar
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY.current;
    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset > 75) {
      // Threshold passed -> dismiss
      onClose();
    } else {
      // Snap back
      setDragOffset(0);
    }
  };

  if (!mounted || !isOpen || !shareData) return null;

  const shareText = formatShareMessage(shareData.title, shareData.text, shareData.type);
  const waUrl = getWhatsAppShareUrl(shareData.url, shareText);
  const tgUrl = getTelegramShareUrl(shareData.url, shareText);
  const twUrl = getTwitterShareUrl(shareData.url, shareText);

  const handleCopy = async () => {
    const success = await copyShareLink(shareData.url);
    if (success) {
      setIsCopied(true);
      toast.success("Tautan berhasil disalin!");
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error("Gagal menyalin tautan");
    }
  };

  const handleSendToFriend = (friend: FriendItem) => {
    setSentFriendIds((prev) => new Set(prev).add(friend.id));
    toast.success(`Berhasil dikirim ke ${friend.displayName || friend.username}!`);
  };

  const authorAvatar = shareData.authorAvatar
    ? getOptimizedUrl(shareData.authorAvatar, "avatar") || shareData.authorAvatar
    : "/default-avatar.svg";

  return createPortal(
    <div className="fixed inset-0 z-[100050] flex flex-col justify-end">
      {/* Dark Transparent Backdrop (No Blur) */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Native Slide Bottom Sheet */}
      <div
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative z-10 w-full bg-white dark:bg-[#242526] rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] border-t border-gray-200 dark:border-[#3E4042] flex flex-col max-h-[88vh] overflow-hidden select-none animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Bar Header */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-3 pb-2 px-4 cursor-grab active:cursor-grabbing flex flex-col items-center"
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <div className="w-full flex items-center justify-between mt-2.5 px-2">
            <div>
              <h2 className="font-bold text-[17px] text-gray-900 dark:text-white">
                Bagikan {shareData.type === "PROJECT" ? "Project" : "Postingan"}
              </h2>
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400">
                Geser ke bawah untuk menutup
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] text-gray-600 dark:text-[#E4E6EB] flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 pt-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-10">
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
                  {shareData.type === "PROJECT" ? "Project" : "Post"}
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

          {/* Bagian 1: Kirim ke Teman NetHubz */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-gray-900 dark:text-[#E4E6EB]">
                Kirim ke Teman NetHubz
              </span>
              <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                {friends.length} teman
              </span>
            </div>

            {/* Quick Search */}
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
                placeholder="Cari teman..."
                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-[#18191A] border border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-xl text-[12.5px] text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none"
              />
            </div>

            {/* Friends list */}
            <div className="max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-0.5">
              {isLoadingFriends ? (
                <div className="py-5 text-center text-gray-400 text-[12.5px] flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Memuat teman...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-5 text-center text-gray-500 dark:text-gray-400 text-[12px]">
                  {searchQuery ? "Teman tidak ditemukan." : "Belum ada teman terhubung."}
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
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#3A3B3C] active:bg-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={fAvatar}
                          alt={friend.displayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[12.5px] text-gray-900 dark:text-gray-100 truncate leading-snug">
                            {friend.displayName}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendToFriend(friend)}
                        disabled={isSent}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all shrink-0 ${
                          isSent
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-blue-600 active:bg-blue-700 text-white shadow-sm"
                        }`}
                      >
                        {isSent ? "Terkirim ✓" : "Kirim"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bagian 2: Media Sosial Eksternal */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#3E4042]">
            <span className="text-[13px] font-bold text-gray-900 dark:text-[#E4E6EB] block mb-2.5">
              Bagikan ke Media Sosial
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-50 active:bg-emerald-100 dark:bg-emerald-950/30 dark:active:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold text-[12.5px] border border-emerald-200 dark:border-emerald-800/40"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.79 14.04c-.24.68-1.2 1.25-1.65 1.33-.42.08-.96.11-1.56-.08-.36-.12-.84-.28-1.46-.55-2.59-1.12-4.28-3.77-4.41-3.94-.13-.17-1.05-1.4-1.05-2.67 0-1.27.67-1.89.9-2.15.24-.26.52-.33.7-.33.17 0 .35 0 .5.01.16.01.37-.06.58.44.22.52.74 1.8.8 1.93.07.13.11.29.02.46-.08.17-.13.28-.26.43-.13.15-.27.34-.39.46-.13.13-.26.27-.11.53.15.26.68 1.12 1.46 1.81 1 .89 1.85 1.17 2.11 1.3.26.13.41.11.57-.07.15-.17.65-.76.82-1.02.17-.26.35-.22.58-.13.24.08 1.5.71 1.76.84.26.13.43.2.5.3.06.12.06.68-.18 1.36z" />
                </svg>
                WhatsApp
              </a>

              {/* Telegram */}
              <a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-sky-50 active:bg-sky-100 dark:bg-sky-950/30 dark:active:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold text-[12.5px] border border-sky-200 dark:border-sky-800/40"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.91-2.12 5.89-2.54 2.81-1.17 3.39-1.37 3.77-1.38.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                </svg>
                Telegram
              </a>

              {/* X / Twitter */}
              <a
                href={twUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gray-100 active:bg-gray-200 dark:bg-black/50 dark:active:bg-black/70 text-gray-900 dark:text-white font-semibold text-[12.5px] border border-gray-200 dark:border-[#3E4042]"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X
              </a>
            </div>
          </div>

          {/* Salin Tautan Box */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#3E4042]">
            <span className="text-[13px] font-bold text-gray-900 dark:text-[#E4E6EB] block mb-2">
              Salin Tautan
            </span>
            <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-[#18191A] border border-gray-200 dark:border-[#3E4042] rounded-xl">
              <input
                type="text"
                readOnly
                value={shareData.url}
                className="flex-1 bg-transparent px-2.5 text-[12px] text-gray-700 dark:text-gray-300 outline-none truncate select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all shrink-0 ${
                  isCopied
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-blue-600 active:bg-blue-700 text-white shadow-sm"
                }`}
              >
                {isCopied ? "Tersalin ✓" : "Salin"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
