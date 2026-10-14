"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import FriendActionMenuMobile from "@/components/friends/FriendActionMenuMobile";

interface FriendCardMobileProps {
  friend: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    profession?: string | null;
    locationName?: string | null;
  };
  locale: string;
  onUnfriend: (friendId: string) => void;
  onSendMessage?: (friendId: string, username: string) => void;
  onBlockPrompt?: (user: { id: string; username: string; displayName: string; avatarUrl?: string | null }) => void;
}

export default function FriendCardMobile({
  friend,
  locale,
  onUnfriend,
  onSendMessage,
  onBlockPrompt,
}: FriendCardMobileProps) {
  const t = useTranslations("friends");

  return (
    <div className="bg-white dark:bg-[#242526] rounded-2xl p-3.5 border border-gray-100 dark:border-[#3E4042] shadow-sm flex items-center justify-between gap-3 relative">
      <Link
        href={`/${locale}/p/${friend.username}/${friend.id}`}
        className="inline-flex items-center gap-3 min-w-0 w-fit group cursor-pointer active:scale-[0.98] transition-transform duration-150 select-none"
      >
        <img
          src={friend.avatarUrl || "/default-avatar.svg"}
          alt={friend.displayName}
          className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[15px] text-gray-900 dark:text-[#E4E6EB] truncate group-hover:underline">
            {friend.displayName}
          </span>
          <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
            @{friend.username}
          </span>
          {friend.profession && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {friend.profession}
            </span>
          )}
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onSendMessage ? onSendMessage(friend.id, friend.username) : undefined}
          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[12px] font-semibold active:scale-95 transition-transform duration-150 select-none flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {t("sendMessage")}
        </button>

        {/* 3-dots Menu Button */}
        <FriendActionMenuMobile
          user={friend}
          locale={locale}
          showUnfriend={true}
          onUnfriend={onUnfriend}
          onBlockPrompt={onBlockPrompt}
        />
      </div>
    </div>
  );
}
