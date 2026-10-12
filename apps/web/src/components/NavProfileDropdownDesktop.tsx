"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getOptimizedUrl } from "@/utils/cloudinary";
import {
  formatAccountDisplayName,
  formatAccountHandle,
} from "@/utils/desktopProfileMenu";

interface NavProfileDropdownDesktopProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  navAvatar: string | null;
  navDisplayName: string | null;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export default function NavProfileDropdownDesktop({
  isOpen,
  onClose,
  currentUser,
  navAvatar,
  navDisplayName,
  isDarkMode,
  setIsDarkMode,
}: NavProfileDropdownDesktopProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);

  // Reset account switcher when main dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setIsAccountSwitcherOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName =
    navDisplayName ||
    formatAccountDisplayName(currentUser);
  const handle = formatAccountHandle(currentUser?.username);
  const avatarSrc = navAvatar
    ? getOptimizedUrl(navAvatar, "avatar")
    : currentUser?.profile?.avatarUrl
    ? getOptimizedUrl(currentUser.profile.avatarUrl, "avatar")
    : "/default-avatar.svg";

  const handleLogout = () => {
    localStorage.removeItem("token");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = `/${locale}/login`;
  };

  return (
    <>
      {/* Invisible backdrop to dismiss nested account switcher without closing main menu */}
      {isAccountSwitcherOpen && (
        <div
          className="fixed inset-0 z-[9999]"
          onClick={(e) => {
            e.stopPropagation();
            setIsAccountSwitcherOpen(false);
          }}
        />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 mt-3 w-[340px] bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-[#3E4042] p-3 sm:p-4 z-[10200] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header (Profile Info Account Switcher - Samain persis struktur sidebar navigasi) */}
        <div className="relative mb-2">
          <div
            className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-[#3A3B3C] shadow-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsAccountSwitcherOpen(!isAccountSwitcherOpen);
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover shrink-0 bg-white dark:bg-[#242526]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                }}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[14px] text-black dark:text-[#E4E6EB] truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate leading-tight mt-0.5">
                  {handle}
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-2 pr-1 text-gray-500 dark:text-[#B0B3B8]">
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${
                  isAccountSwitcherOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Nested Dropdown for Account List (Absolute floating outside flow agar tidak ngedorong opsi bawah) */}
          {isAccountSwitcherOpen && (
            <div
              className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-[#242526] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-[#3E4042] py-2 z-[10000] animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="max-h-[200px] overflow-y-auto">
                {/* Active Account Item */}
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 cursor-default">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover shrink-0 bg-white dark:bg-[#242526]"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[13px] text-emerald-700 dark:text-emerald-400 truncate leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-500/80 truncate leading-tight mt-0.5">
                        {handle}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-emerald-600 dark:text-emerald-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="h-[1px] w-full bg-gray-200 dark:bg-[#3E4042] my-1" />

              {/* Tambah Akun Button */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors cursor-pointer"
                onClick={() => {
                  setIsAccountSwitcherOpen(false);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-gray-700 dark:text-[#E4E6EB]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="font-medium text-[13px] text-black dark:text-[#E4E6EB]">
                  {t("dropdown.addAccount")}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="h-[1px] w-full bg-gray-200 dark:bg-[#3E4042] my-2" />

        {/* Menu Options (Tetap di posisinya tanpa kedorong) */}
        <div className="space-y-1 sm:space-y-2">
          {/* Pengaturan & Privasi */}
          <button
            type="button"
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors group/item cursor-pointer"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] flex items-center justify-center shrink-0 overflow-hidden">
                <svg
                  className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] text-black dark:text-[#E4E6EB]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="font-semibold text-[13px] sm:text-[15px] text-black dark:text-[#E4E6EB]">
                {t("dropdown.settings")}
              </span>
            </div>
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-[#B0B3B8] group-hover/item:text-black dark:text-[#E4E6EB] transition-colors"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Bantuan & Dukungan */}
          <button
            type="button"
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors group/item cursor-pointer"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] flex items-center justify-center shrink-0 overflow-hidden">
                <svg
                  className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] text-black dark:text-[#E4E6EB]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="font-semibold text-[13px] sm:text-[15px] text-black dark:text-[#E4E6EB]">
                {t("dropdown.help")}
              </span>
            </div>
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-[#B0B3B8] group-hover/item:text-black dark:text-[#E4E6EB] transition-colors"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Laporkan Masalah */}
          <button
            type="button"
            className="w-full flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] flex items-center justify-center shrink-0 overflow-hidden">
              <svg
                className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] text-black dark:text-[#E4E6EB]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-semibold text-[13px] sm:text-[15px] text-black dark:text-[#E4E6EB]">
              {t("dropdown.report")}
            </span>
          </button>

          {/* Toggle Tema (Gelap / Terang) */}
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="w-full flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] flex items-center justify-center shrink-0 overflow-hidden">
              {isDarkMode ? (
                <svg
                  className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] text-black dark:text-[#E4E6EB]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.5-1.591a.75.75 0 10-1.061 1.06l1.5-1.591zM12 18.75a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM6.166 18.894a.75.75 0 001.06 1.06l1.5-1.591a.75.75 0 10-1.06-1.061l-1.591 1.59zM4.5 12a.75.75 0 01-.75.75H1.5a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM6.166 5.106a.75.75 0 00-1.06 1.06l1.591 1.59a.75.75 0 101.06-1.061l-1.5-1.59z" />
                </svg>
              ) : (
                <svg
                  className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] text-black dark:text-[#E4E6EB]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <span className="font-semibold text-[13px] sm:text-[15px] text-black dark:text-[#E4E6EB]">
              {isDarkMode ? t("dropdown.lightMode") : t("dropdown.darkMode")}
            </span>
          </button>
        </div>

        <div className="h-[1px] w-full bg-gray-200 dark:bg-[#3E4042] my-2" />

        {/* Tombol Logout (Di paling bawah opsi) */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-red-600 dark:text-red-400 transition-colors cursor-pointer group/logout"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <span className="font-semibold text-[13px] sm:text-[15px]">
            {t("dropdown.logout")}
          </span>
        </button>
      </div>
    </>
  );
}
