"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useUser } from "@/contexts/UserContext";
import { getOptimizedUrl } from "@/utils/cloudinary";
import FloatingUserMenuDesktop from "@/components/FloatingUserMenuDesktop";
import FloatingUserMenuMobile from "@/components/FloatingUserMenuMobile";

export default function FloatingUserMenu({
  isDarkMode,
  setIsDarkMode,
}: {
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
}) {
  const locale = useLocale();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const { currentUser, isProfileLoading } = useUser();
  const navAvatar = currentUser?.profile?.avatarUrl || null;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] flex items-center gap-2 sm:gap-3">
      {/* Language Switcher */}
      <div className="relative group mx-0.5 sm:mx-1" ref={langRef}>
        <button
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white dark:bg-[#3A3B3C] shadow-md hover:bg-gray-100 dark:hover:bg-[#4E4F50] active:scale-95 active:bg-gray-200 dark:active:bg-[#4E4F50] transition-all duration-150 text-black dark:text-[#E4E6EB] text-[12px] sm:text-[13px] font-semibold cursor-pointer select-none"
        >
          {locale === "id" ? (
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[2px] shrink-0 shadow-[0_0_2px_rgba(0,0,0,0.2)]"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="#ED2939" d="M0 0h36v18H0z" />
              <path fill="#fff" d="M0 18h36v18H0z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[2px] shrink-0 shadow-[0_0_2px_rgba(0,0,0,0.2)]"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="#0A3161" d="M0 0h36v36H0z" />
              <path fill="#B31942" d="M0 4.5h36v4.5H0zm0 9h36v4.5H0zm0 9h36v4.5H0zm0 9h36v4.5H0z" />
              <path fill="#fff" d="M0 9h36v4.5H0zm0 9h36v4.5H0zm0 9h36v4.5H0z" />
              <path fill="#0A3161" d="M0 0h18v18H0z" />
              <path fill="#fff" d="M3 3h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM3 7h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM3 11h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
            </svg>
          )}
          {locale === "id" ? "ID" : "EN"}
        </button>
        {isLangOpen && (
          <div className="absolute right-0 top-11 sm:top-12 w-36 sm:w-40 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 p-1.5 sm:p-2 overflow-hidden z-[10100]">
            <button
              onClick={() => {
                document.cookie = `NEXT_LOCALE=id; path=/; max-age=31536000; SameSite=Lax`;
                localStorage.setItem("NEXT_LOCALE", "id");
                const currentPath = window.location.pathname;
                const pathWithoutLocale = currentPath.replace(/^\/(id|en)/, "");
                window.location.href = "/id" + (pathWithoutLocale || "/home");
              }}
              className={`w-full flex items-center gap-2.5 p-1.5 sm:p-2 rounded-lg active:scale-[0.98] transition-all duration-150 cursor-pointer select-none ${
                locale === "id"
                  ? "bg-[#E4E6EB] dark:bg-[#3A3B3C]"
                  : "hover:bg-gray-200 dark:hover:bg-[#3A3B3C]"
              }`}
            >
              <svg
                className="w-4 h-4 rounded-sm shrink-0 shadow-[0_0_2px_rgba(0,0,0,0.2)]"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="#ED2939" d="M0 0h36v18H0z" />
                <path fill="#fff" d="M0 18h36v18H0z" />
              </svg>
              <span className="font-semibold text-[13px] sm:text-[14px] text-black dark:text-[#E4E6EB]">
                Indonesia
              </span>
            </button>
            <button
              onClick={() => {
                document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000; SameSite=Lax`;
                localStorage.setItem("NEXT_LOCALE", "en");
                const currentPath = window.location.pathname;
                const pathWithoutLocale = currentPath.replace(/^\/(id|en)/, "");
                window.location.href = "/en" + (pathWithoutLocale || "/home");
              }}
              className={`w-full flex items-center gap-2.5 p-1.5 sm:p-2 rounded-lg active:scale-[0.98] transition-all duration-150 mt-1 cursor-pointer select-none ${
                locale === "en"
                  ? "bg-[#E4E6EB] dark:bg-[#3A3B3C]"
                  : "hover:bg-gray-200 dark:hover:bg-[#3A3B3C]"
              }`}
            >
              <svg
                className="w-4 h-4 rounded-sm shrink-0 shadow-[0_0_2px_rgba(0,0,0,0.2)]"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="#0A3161" d="M0 0h36v36H0z" />
                <path fill="#B31942" d="M0 4.5h36v4.5H0zm0 9h36v4.5H0zm0 9h36v4.5H0zm0 9h36v4.5H0z" />
                <path fill="#fff" d="M0 9h36v4.5H0zm0 9h36v4.5H0zm0 9h36v4.5H0z" />
                <path fill="#0A3161" d="M0 0h18v18H0z" />
                <path fill="#fff" d="M3 3h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM3 7h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM3 11h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
              </svg>
              <span className="font-semibold text-[13px] sm:text-[14px] text-black dark:text-[#E4E6EB]">
                English
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Avatar Dropdown */}
      <div className="relative ml-0.5 sm:ml-1" ref={dropdownRef}>
        <div
          className="relative cursor-pointer group"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:brightness-95 active:scale-90 transition-all duration-150 flex items-center justify-center overflow-hidden border border-emerald-600 dark:border-emerald-400 shrink-0 shadow-md select-none">
            {isProfileLoading ? (
              <div className="w-full h-full bg-gray-300 dark:bg-gray-700 animate-pulse rounded-full" />
            ) : (
              <img
                src={navAvatar ? getOptimizedUrl(navAvatar, "avatar") : "/default-avatar.svg"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            )}
          </button>
          <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] bg-[#E4E6EB] dark:bg-[#3A3B3C] rounded-full flex items-center justify-center border-2 border-white dark:border-[#242526]">
            <svg
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black dark:text-[#E4E6EB]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Desktop Floating Menu */}
        <div className="hidden sm:block">
          <FloatingUserMenuDesktop
            isOpen={isDropdownOpen}
            onClose={() => setIsDropdownOpen(false)}
            currentUser={currentUser}
            isProfileLoading={isProfileLoading}
            navAvatar={navAvatar}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        </div>

        {/* Mobile Floating Menu (Compact & Optimized Typography) */}
        <div className="sm:hidden">
          <FloatingUserMenuMobile
            isOpen={isDropdownOpen}
            onClose={() => setIsDropdownOpen(false)}
            currentUser={currentUser}
            isProfileLoading={isProfileLoading}
            navAvatar={navAvatar}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
