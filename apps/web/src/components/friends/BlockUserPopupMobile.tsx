"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";

interface BlockUserPopupMobileProps {
  isOpen: boolean;
  targetUser: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function BlockUserPopupMobile({
  isOpen,
  targetUser,
  isSubmitting,
  onClose,
  onConfirm,
}: BlockUserPopupMobileProps) {
  const t = useTranslations("friends");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex flex-col justify-end bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        className="w-full bg-white dark:bg-[#242526] rounded-t-[28px] p-5 border-t border-gray-100 dark:border-[#3E4042] flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-300 dark:bg-[#4E4F50] rounded-full mx-auto" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-[16px] text-gray-900 dark:text-[#E4E6EB]">
              {t("blockModal.title")}
            </h3>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#18191A] rounded-2xl border border-gray-100 dark:border-[#3E4042]">
          <img
            src={targetUser.avatarUrl || "/default-avatar.svg"}
            alt={targetUser.displayName}
            className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-[#3E4042]"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[14px] text-gray-900 dark:text-[#E4E6EB] truncate">
              {targetUser.displayName}
            </span>
            <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
              @{targetUser.username}
            </span>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-gray-600 dark:text-[#B0B3B8]">
          {t("blockModal.description")}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-3 text-[14px] font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-transform duration-150 rounded-2xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 select-none"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {t("blockModal.confirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3 text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] bg-gray-100 dark:bg-[#3A3B3C] active:scale-[0.98] transition-transform duration-150 rounded-2xl select-none"
          >
            {t("blockModal.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
