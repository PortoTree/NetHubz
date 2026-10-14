"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";

interface BlockUserPopupDesktopProps {
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

export default function BlockUserPopupDesktop({
  isOpen,
  targetUser,
  isSubmitting,
  onClose,
  onConfirm,
}: BlockUserPopupDesktopProps) {
  const t = useTranslations("friends");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[440px] bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#3E4042] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#3E4042]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="font-bold text-[17px] text-gray-900 dark:text-[#E4E6EB]">
              {t("blockModal.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#18191A] rounded-xl border border-gray-100 dark:border-[#3E4042]">
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

          <p className="text-[14px] leading-relaxed text-gray-600 dark:text-[#B0B3B8]">
            {t("blockModal.description")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/60 dark:bg-[#1C1D1E] border-t border-gray-100 dark:border-[#3E4042]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200/70 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors disabled:opacity-50"
          >
            {t("blockModal.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-[14px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {t("blockModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
