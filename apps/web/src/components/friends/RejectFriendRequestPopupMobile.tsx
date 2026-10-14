"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";

interface RejectFriendRequestPopupMobileProps {
  isOpen: boolean;
  targetUser: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RejectFriendRequestPopupMobile({
  isOpen,
  targetUser,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectFriendRequestPopupMobileProps) {
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
      className="fixed inset-0 z-[999999] flex flex-col justify-end bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="w-full bg-white dark:bg-[#242526] rounded-t-[28px] shadow-2xl border-t border-gray-100 dark:border-[#3E4042] overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle pill */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-[#4E4F50] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[#3E4042]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-bold text-[16px] text-gray-900 dark:text-[#E4E6EB]">
              {t("rejectModal.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] active:scale-90 transition-transform duration-150 select-none disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          {/* Target user preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#18191A] rounded-2xl border border-gray-100 dark:border-[#3E4042]">
            <img
              src={targetUser.avatarUrl || "/default-avatar.svg"}
              alt={targetUser.displayName}
              className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[15px] text-gray-900 dark:text-[#E4E6EB] truncate">
                {targetUser.displayName}
              </span>
              <span className="text-[13px] text-gray-500 dark:text-[#B0B3B8] truncate">
                @{targetUser.username}
              </span>
            </div>
          </div>

          <p className="text-[14px] leading-relaxed text-gray-600 dark:text-[#B0B3B8]">
            {t("rejectModal.description")}
          </p>
        </div>

        {/* Actions (Full width stacked buttons with touch feedback) */}
        <div className="p-4 bg-gray-50/60 dark:bg-[#1C1D1E] border-t border-gray-100 dark:border-[#3E4042] flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-3 text-[15px] font-semibold text-white bg-rose-600 active:bg-rose-700 active:scale-95 rounded-2xl transition-all duration-150 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 select-none"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {t("rejectModal.confirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3 text-[15px] font-semibold text-gray-700 dark:text-[#E4E6EB] bg-gray-200/70 dark:bg-[#3A3B3C] active:scale-95 rounded-2xl transition-all duration-150 select-none disabled:opacity-50"
          >
            {t("rejectModal.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
