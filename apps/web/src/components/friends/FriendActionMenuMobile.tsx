"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface FriendActionMenuMobileProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  locale: string;
  showUnfriend?: boolean;
  onUnfriend?: (friendId: string) => void;
  onBlockPrompt?: (user: { id: string; username: string; displayName: string; avatarUrl?: string | null }) => void;
}

export default function FriendActionMenuMobile({
  user,
  locale,
  showUnfriend = false,
  onUnfriend,
  onBlockPrompt,
}: FriendActionMenuMobileProps) {
  const t = useTranslations("friends");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSendMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    router.push(`/${locale}/chatting?user=${user.id}`);
  };

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    if (onBlockPrompt) {
      onBlockPrompt(user);
    }
  };

  const handleUnfriendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    if (onUnfriend) {
      onUnfriend(user.id);
    }
  };

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Menu"
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-[#B0B3B8] active:scale-90 transition-transform duration-150 select-none"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex flex-col justify-end bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full bg-white dark:bg-[#242526] rounded-t-[28px] p-5 border-t border-gray-100 dark:border-[#3E4042] flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 dark:bg-[#4E4F50] rounded-full mx-auto mb-1" />

            {/* User Info Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-[#3E4042]">
              <img
                src={user.avatarUrl || "/default-avatar.svg"}
                alt={user.displayName}
                className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-[#3E4042]"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[14px] text-gray-900 dark:text-[#E4E6EB] truncate">
                  {user.displayName}
                </span>
                <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
                  @{user.username}
                </span>
              </div>
            </div>

            {/* 1. Lihat Profile */}
            <Link
              href={`/${locale}/p/${user.username}/${user.id}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#3A3B3C] active:scale-95 transition-transform duration-150 select-none text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB]"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t("viewProfile")}
            </Link>

            {/* 2. Kirim Pesan */}
            <button
              type="button"
              onClick={handleSendMessage}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#3A3B3C] active:scale-95 transition-transform duration-150 select-none text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] text-left"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t("sendMessage")}
            </button>

            {/* Opsional: Hapus Pertemanan */}
            {showUnfriend && onUnfriend && (
              <button
                type="button"
                onClick={handleUnfriendClick}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 active:scale-95 transition-transform duration-150 select-none text-[14px] font-semibold text-left"
              >
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                {t("unfriend")}
              </button>
            )}

            {/* 3. Blokir */}
            <button
              type="button"
              onClick={handleBlockClick}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 active:scale-95 transition-transform duration-150 select-none text-[14px] font-semibold text-left"
            >
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {t("block")}
            </button>

            {/* Batal */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mt-1 py-3 rounded-2xl bg-gray-100 dark:bg-[#3A3B3C] text-[14px] font-semibold text-gray-600 dark:text-[#E4E6EB] active:scale-95 transition-transform duration-150 select-none text-center"
            >
              {t("blockModal.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
