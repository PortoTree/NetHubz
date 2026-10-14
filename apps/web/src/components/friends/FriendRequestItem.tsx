"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import FriendActionMenuDesktop from "@/components/friends/FriendActionMenuDesktop";

interface FriendRequestItemProps {
  request: {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    profession?: string | null;
    createdAt?: Date | string;
  };
  locale: string;
  isCompact?: boolean;
  onAccept: (requesterId: string) => void;
  onRejectPrompt: (user: { displayName: string; username: string; avatarUrl?: string | null; id: string }) => void;
  onBlockPrompt?: (user: { id: string; username: string; displayName: string; avatarUrl?: string | null }) => void;
}

export default function FriendRequestItem({
  request,
  locale,
  isCompact = false,
  onAccept,
  onRejectPrompt,
  onBlockPrompt,
}: FriendRequestItemProps) {
  const t = useTranslations("friends");

  return (
    <div
      className={`flex flex-col ${
        isCompact
          ? "gap-2 p-2 rounded-xl"
          : "gap-3 p-4 bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3E4042] shadow-sm"
      }`}
    >
      {/* Baris Atas: Info Profil + Menu Titik 3 */}
      <div className="flex items-center justify-between gap-2 w-full">
        <Link
          href={`/${locale}/p/${request.username}/${request.userId}`}
          className="inline-flex items-center gap-3 min-w-0 flex-1 group cursor-pointer"
        >
          <img
            src={request.avatarUrl || "/default-avatar.svg"}
            alt={request.displayName}
            className={`${isCompact ? "w-11 h-11" : "w-12 h-12"} rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity`}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-[14px] text-gray-900 dark:text-[#E4E6EB] truncate group-hover:underline">
              {request.displayName}
            </span>
            <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
              @{request.username}
            </span>
            {request.profession && !isCompact && (
              <span className="text-[12px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {request.profession}
              </span>
            )}
          </div>
        </Link>

        {/* Menu Titik 3 di Pojok Kanan Atas */}
        <FriendActionMenuDesktop
          user={{
            id: request.userId,
            username: request.username,
            displayName: request.displayName,
            avatarUrl: request.avatarUrl,
          }}
          locale={locale}
          onBlockPrompt={onBlockPrompt}
        />
      </div>

      {/* Baris Bawah: 2 Tombol Sejajar (Konfirmasi & Hapus) */}
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={() => onAccept(request.userId)}
          className={`${isCompact ? "py-1.5 text-[12px]" : "py-2 text-[13px]"} flex-1 font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 rounded-xl transition-all duration-150 shadow-sm select-none flex items-center justify-center gap-1.5`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {t("confirm")}
        </button>

        <button
          type="button"
          onClick={() => onRejectPrompt({
            id: request.userId,
            displayName: request.displayName,
            username: request.username,
            avatarUrl: request.avatarUrl,
          })}
          className={`${isCompact ? "py-1.5 text-[12px]" : "py-2 text-[13px]"} flex-1 font-semibold text-gray-700 dark:text-[#E4E6EB] bg-gray-200/80 hover:bg-rose-50 hover:text-rose-600 dark:bg-[#3A3B3C] dark:hover:bg-rose-950/40 dark:hover:text-rose-400 active:scale-95 rounded-xl transition-all duration-150 select-none flex items-center justify-center gap-1.5`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {t("deleteRequest")}
        </button>
      </div>
    </div>
  );
}
