"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@/contexts/UserContext";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

interface HomeNavSidebarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

export default function HomeNavSidebar({ activeTab, setActiveTab }: HomeNavSidebarProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  const { currentUser, isProfileLoading } = useUser();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
        setIsAccountSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`hidden lg:flex flex-col fixed left-0 top-[56px] h-[calc(100vh-56px)] bg-[#F3F2EF] dark:bg-[#18191A] border-r border-gray-300 dark:border-gray-600 z-[60] transition-all duration-300 overflow-hidden group ${isProfileMenuOpen || isAccountSwitcherOpen ? "w-[260px] expanded" : "w-[72px] hover:w-[260px]"}`}>
      <div className="flex flex-col py-4 w-[260px] px-3 space-y-2">
        {/* Pencarian */}
        <button
          onClick={() => {
            router.push(`/${locale}/search`);
          }}
          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full ${activeTab === "search" ? "bg-gradient-to-br from-emerald-400 to-emerald-600" : "bg-current text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/mencari${activeTab === "search" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/mencari${activeTab === "search" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("tabs.search")}
          </span>
        </button>

        {/* Jelajahi / Explore */}
        <button
          onClick={() => router.push(`/${locale}/explore`)}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "explore" ? "text-emerald-500" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/explore${activeTab === "explore" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/explore${activeTab === "explore" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("tabs.explore")}
          </span>
        </button>

        {/* Beranda */}
        <button
          onClick={() => {
            if (activeTab !== "home") {
              router.push(`/${locale}/home`);
            }
          }}
          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "home" ? "text-black dark:text-white" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/home${activeTab === "home" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/home${activeTab === "home" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("tabs.home")}
          </span>
        </button>

        {/* Obrolan */}
        <button
          onClick={() => {
            router.push(`/${locale}/chatting`);
          }}
          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "chat" ? "text-sky-400" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/chat${activeTab === "chat" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/chat${activeTab === "chat" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("nav.chat")}
          </span>
        </button>

        {/* Teman */}
        <button
          onClick={() => {
            router.push(`/${locale}/friend`);
          }}
          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "friend" ? "text-black dark:text-[#E4E6EB]" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask:
                  `url(/navigasi/teman${activeTab === "friend" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/teman${activeTab === "friend" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("sidebar.friends")}
          </span>
        </button>

        {/* Komunitas */}
        <button
          onClick={() => {
            router.push(`/${locale}/community`);
          }}
          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "community" ? "text-blue-800 dark:text-blue-600" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask:
                  `url(/navigasi/komunitas${activeTab === "community" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/komunitas${activeTab === "community" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("tabs.groups")}
          </span>
        </button>

        {/* Halaman kamu */}
        <button className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}>
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "webpage" ? "text-green-500" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/yourpage${activeTab === "webpage" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/yourpage${activeTab === "webpage" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("nav.webpage")}
          </span>
        </button>

        {/* Produk */}
        <button
          onClick={() => {
            router.push(`/${locale}/product`);
          }}
          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "product" ? "text-[#8B4513] dark:text-[#CD853F]" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/produk${activeTab === "product" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/produk${activeTab === "product" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("tabs.product")}
          </span>
        </button>

        {/* Proyek */}
        <button
          onClick={() => router.push(`/${locale}/project`)}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "project" ? "text-purple-500" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/project${activeTab === "project" ? "" : "-outline"}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/project${activeTab === "project" ? "" : "-outline"}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("feed.project")}
          </span>
        </button>

        {/* Tersimpan */}
        <button
          onClick={() => router.push(`/${locale}/saved`)}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full bg-current ${activeTab === "saved" ? "text-red-500" : "text-gray-600 dark:text-[#B0B3B8]"}`}
              style={{
                WebkitMask: `url(/navigasi/saved${activeTab === "saved" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/saved${activeTab === "saved" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
          </div>
          <span className="font-bold text-[15px] text-black dark:text-[#E4E6EB] whitespace-nowrap opacity-0 group-hover:opacity-100 group-[.expanded]:opacity-100 transition-opacity duration-300">
            {t("sidebar.saved")}
          </span>
        </button>
      </div>

      {/* Fixed Profile Card at Bottom */}
      <div
        ref={profileMenuRef}
        className="relative p-3 border-t border-gray-300 dark:border-gray-600 bg-transparent shrink-0 w-full mt-auto flex items-center justify-between"
      >
        {isProfileLoading || !currentUser ? (
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-[#4E4F50] animate-pulse shrink-0" />
            <div className="h-4 w-3/5 bg-gray-300 dark:bg-[#4E4F50] rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentUser?.profile?.avatarUrl ? getOptimizedUrl(currentUser.profile.avatarUrl, "avatar") : "/default-avatar.svg"}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover shrink-0 bg-white dark:bg-[#242526]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                }}
              />
              <div className="flex-col min-w-0 hidden group-hover:flex group-[.expanded]:flex">
                <span className="font-bold text-[14px] text-black dark:text-[#E4E6EB] truncate">
                  {currentUser?.profile?.displayName || currentUser?.username}
                </span>
                <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
                  @{currentUser?.username}
                </span>
              </div>
            </div>
            <div
              className="shrink-0 p-1.5 rounded-full hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors text-gray-500 dark:text-[#B0B3B8] cursor-pointer hidden group-hover:block group-[.expanded]:block"
              onClick={(e) => { e.stopPropagation(); setIsProfileMenuOpen(!isProfileMenuOpen); }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </div>

            {/* Profile Menu Dropdown in Portal */}
            {isMounted && isProfileMenuOpen && currentUser && createPortal(
              <div
                className="fixed bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-[#3E4042] py-2 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-default"
                style={{ bottom: "20px", left: "80px", width: "260px" }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Header (Profile Info Account Switcher) */}
                <div className="relative mx-3 mt-3 mb-2">
                  <div
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-[#3A3B3C] shadow-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors"
                    onClick={(e) => { e.stopPropagation(); setIsAccountSwitcherOpen(!isAccountSwitcherOpen); }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={currentUser.profile?.avatarUrl ? getOptimizedUrl(currentUser.profile.avatarUrl, "avatar") : "/default-avatar.svg"}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover shrink-0 bg-white dark:bg-[#242526]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[14px] text-black dark:text-[#E4E6EB] truncate leading-tight">
                          {currentUser.profile?.displayName || currentUser.username}
                        </span>
                        <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate leading-tight mt-0.5">
                          @{currentUser.username}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 pl-2 pr-1 text-gray-500 dark:text-[#B0B3B8]">
                      <svg className={`w-5 h-5 transition-transform duration-200 ${isAccountSwitcherOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {/* Nested Dropdown for Account List */}
                  {isAccountSwitcherOpen && (
                    <div
                      className="absolute top-[calc(100%+4px)] left-0 w-full bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-[#3E4042] py-2 z-[10000] animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="max-h-[200px] overflow-y-auto">
                        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 cursor-default">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={currentUser.profile?.avatarUrl ? getOptimizedUrl(currentUser.profile.avatarUrl, "avatar") : "/default-avatar.svg"}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover shrink-0 bg-white dark:bg-[#242526]"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[13px] text-emerald-700 dark:text-emerald-400 truncate leading-tight">
                                {currentUser.profile?.displayName || currentUser.username}
                              </span>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-500/80 truncate leading-tight mt-0.5">
                                @{currentUser.username}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-emerald-600 dark:text-emerald-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </div>
                        </div>
                      </div>
                      <div className="h-[1px] w-full bg-gray-200 dark:bg-[#3E4042] my-1"></div>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors"
                        onClick={() => {
                          setIsAccountSwitcherOpen(false);
                          setIsProfileMenuOpen(false);
                          // router.push(`/${locale}/login`);
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-gray-700 dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="font-medium text-[13px] text-black dark:text-[#E4E6EB]">{t("profileMenu.addAccount")}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-[1px] w-full bg-gray-200 dark:bg-[#3E4042] my-1"></div>

                {/* Profile Link */}
                <button
                  onClick={() => { setIsProfileMenuOpen(false); router.push(`/${locale}/p/${currentUser.username}/${currentUser.id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors"
                >
                  <svg className="w-5 h-5 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span className="font-medium text-[14px] text-black dark:text-[#E4E6EB]">{t("profileMenu.profile")}</span>
                </button>

                {/* Settings */}
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors">
                  <svg className="w-5 h-5 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-medium text-[14px] text-black dark:text-[#E4E6EB]">{t("profileMenu.settings")}</span>
                </button>

                {/* Help Center */}
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors">
                  <svg className="w-5 h-5 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-medium text-[14px] text-black dark:text-[#E4E6EB]">{t("profileMenu.helpCenter")}</span>
                </button>

                {/* Download PWA */}
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors">
                  <svg className="w-5 h-5 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span className="font-medium text-[14px] text-black dark:text-[#E4E6EB]">{t("profileMenu.downloadPWA")}</span>
                </button>

                <div className="h-[1px] w-full bg-gray-200 dark:bg-[#3E4042] my-1"></div>

                {/* Logout */}
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.href = `/login`;
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-left transition-colors"
                >
                  <svg className="w-5 h-5 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span className="font-medium text-[14px] text-black dark:text-[#E4E6EB]">{t("profileMenu.logout")}</span>
                </button>
              </div>
              , document.body)}
          </>
        )}
      </div>
    </div>
  );
}
