"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";


import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { profileCache, connectionCache } from "@/utils/cache";
import React from "react";
import { useUser } from "@/contexts/UserContext";

import CreatePostModal from "@/components/CreatePostModal";
import PostFeed from "@/components/PostFeed";
import HomeNavSidebar from "@/components/HomeNavSidebar";
import ProfileSuggestion from "@/components/ProfileSuggestion";
import SidebarShortcuts from "@/components/SidebarShortcuts";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { dummyChats, formatChatDate, ChatStatusMark, MessageDropdownMenu } from "@/components/chat/chatHelpers";

function formatPostTime(timestamp: number, t: any, locale: string) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 5) {
    return t("time.justNow");
  } else if (hours < 1) {
    return t("time.minsAgo", { min: minutes });
  } else if (days < 1) {
    return t("time.hoursAgo", { hour: hours });
  } else if (days < 7) {
    return t("time.daysAgo", { day: days });
  } else {
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
    const year = d.getFullYear();
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} | ${h}.${m}`;
  }
}



export default function Beranda() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  console.log("[Beranda] locale:", locale);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  
  const { currentUser, isProfileLoading } = useUser();
  const [isFriendSearchExpanded, setIsFriendSearchExpanded] = useState(false);
  const friendSearchRef = useRef<HTMLDivElement>(null);
  const [isGroupSearchExpanded, setIsGroupSearchExpanded] = useState(false);
  const groupSearchRef = useRef<HTMLDivElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const cat = url.searchParams.get("category");
      if (cat) {
        setProductFilter(cat);
      }
    }
  }, []);
  const [isProductSortOpen, setIsProductSortOpen] = useState(false);
  const [productSort, setProductSort] = useState("popular");
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  useEffect(() => {
    if (isProductModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isProductModalOpen]);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [startWithMediaModal, setStartWithMediaModal] = useState(false);
  const [startWithTagModal, setStartWithTagModal] = useState(false);
  const [postPrivacy, setPostPrivacy] = useState("public");
  const [isPrivacyDropdownOpen, setIsPrivacyDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const activeTab: string = "home";
  const setActiveTab = (tab: string) => {};

  const chatMoreMenuRef = useRef<HTMLDivElement>(null);
  const roomSearchRef = useRef<HTMLDivElement>(null);
  const roomSearchToggleRef = useRef<HTMLButtonElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

  const chatListSettingsRef = useRef<HTMLDivElement>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<number[]>([]);
  const [showAddIcons, setShowAddIcons] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selectedFriendsToAdd');
    if (saved) {
      try {
        setSelectedFriendsToAdd(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedFriendsToAdd', JSON.stringify(selectedFriendsToAdd));
  }, [selectedFriendsToAdd]);
  const [activeChatIdx, setActiveChatIdx] = useState<number | null>(null);

  const [isChatListSettingsOpen, setIsChatListSettingsOpen] = useState(false);
  const [chatListFilter, setChatListFilter] = useState("semua");
  const [isChatFilterOpen, setIsChatFilterOpen] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [activeChatMenu, setActiveChatMenu] = useState<number | null>(null);
  const [isTempMessageOn, setIsTempMessageOn] = useState(false);
  const [isChatMoreMenuOpen, setIsChatMoreMenuOpen] = useState(false);


  useEffect(() => {

    // Auto-close sidebars when leaving their tabs
    if (activeTab !== "product") {
      setIsProductDetailOpen(false);
    }
    if (activeTab !== "home") {
      setIsProfileSidebarOpen(false);
    }
  }, [activeTab]);

  const [profileViewIdx, setProfileViewIdx] = useState<number | null>(null);
  const [isRoomSearchOpen, setIsRoomSearchOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0 });
  const chatMenuRef = useRef<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const chatSettingsRef = useRef<HTMLDivElement>(null);
  const chatFilterRef = useRef<HTMLDivElement>(null);
  const [isFloatingAttachmentMenuOpen, setIsFloatingAttachmentMenuOpen] = useState(false);
  const [isSearchNavOpen, setIsSearchNavOpen] = useState(false);
  const searchNavRef = useRef<HTMLDivElement>(null);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isNotifFilterOpen, setIsNotifFilterOpen] = useState(false);
  useEffect(() => {
    if (!isNotifPanelOpen) {
      setIsNotifMenuOpen(false);
      setIsNotifFilterOpen(false);
    }
  }, [isNotifPanelOpen]);
  const [isMounted, setIsMounted] = useState(false);
  const floatingAttachmentMenuRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const notifFilterRef = useRef<HTMLDivElement>(null);
  const [mainChatMessage, setMainChatMessage] = useState("");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);
  const [activeMessageDropdown, setActiveMessageDropdown] = useState<number | null>(null);
  const messageDropdownRef = useRef<HTMLDivElement>(null);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [isProfileSidebarLoading, setIsProfileSidebarLoading] = useState(false);
  const [isProfileSidebarOptionsOpen, setIsProfileSidebarOptionsOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const selectedProfileIdRef = useRef<string | null>(null);
  selectedProfileIdRef.current = selectedProfile?.id ?? null;

  // Realtime sync: any follow/friend action anywhere refreshes the open sidebar
  useEffect(() => {
    const onChanged = async (e: any) => {
      const { currentUserId, targetId } = e.detail || {};
      if (!targetId || selectedProfileIdRef.current !== targetId) return;
      try {
        const [{ getProfile }, { getConnectionStatus }] = await Promise.all([
          import("@/app/actions/profile"),
          import("@/app/actions/connections"),
        ]);
        const [res, conn]: any = await Promise.all([
          getProfile(targetId),
          getConnectionStatus(currentUserId, targetId),
        ]);
        if (!res?.success || !res.profile) return;
        profileCache.set(targetId, res.profile);
        connectionCache.set(targetId, conn);
        const user = res.profile.user;
        let relation = "none";
        if (conn.friendshipStatus === "ACCEPTED") relation = "friend";
        else if (conn.friendshipStatus === "PENDING") relation = "request";
        setSelectedProfile((prev: any) =>
          prev && prev.id === targetId
            ? {
                ...prev,
                relation,
                isFollowing: conn.isFollowing,
                requestedBy: conn.friendshipRequestedBy,
                stats: {
                  friends: ((user as any)._count?.friendshipsAsUser || 0) + ((user as any)._count?.friendshipsAsFriend || 0),
                  followers: (user as any)._count?.followers || 0,
                  posts: (user as any)._count?.posts || 0,
                },
              }
            : prev
        );
      } catch {}
    };
    window.addEventListener("connection-changed", onChanged);
    return () => window.removeEventListener("connection-changed", onChanged);
  }, []);
  const postMenuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
    const privacyDropdownRef = useRef<HTMLDivElement>(null);
  const [showMainStickyDate, setShowMainStickyDate] = useState(false);
    const [mainStickyDateText, setMainStickyDateText] = useState("9/9/2026");
  const [floatingStickyDateText, setFloatingStickyDateText] = useState("9/9/2026");
  const mainStickyDateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatingStickyDateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMainChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const dateElements = container.querySelectorAll('.chat-date-separator');
    let currentText = "9/9/2026";
    let found = false;
    const containerRect = container.getBoundingClientRect();

    for (let i = dateElements.length - 1; i >= 0; i--) {
      const el = dateElements[i] as HTMLElement;
      const elRect = el.getBoundingClientRect();
      // If the date separator has scrolled above the top of the container (+ threshold)
      if (elRect.top <= containerRect.top + 60) {
        currentText = el.textContent || "";
        found = true;
        break;
      }
    }

    if (found) {
      setMainStickyDateText(currentText);
      setShowMainStickyDate(true);
      if (mainStickyDateTimeout.current) clearTimeout(mainStickyDateTimeout.current);
      mainStickyDateTimeout.current = setTimeout(() => setShowMainStickyDate(false), 5000);
    } else {
      setShowMainStickyDate(false);
    }
  };

  
  // Auto-scroll chat to bottom
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }

    };

    // Call immediately in case it's ready
    scrollToBottom();

    // Call after a short delay to wait for DOM updates (rendering messages)
    const timeout = setTimeout(scrollToBottom, 50);
    const timeout2 = setTimeout(scrollToBottom, 200);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, [activeChatIdx]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;

    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode, themeLoaded]);

  // Set mounted flag for portal rendering (prevents SSR hydration mismatch)
  useEffect(() => { setIsMounted(true); }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchNavRef.current &&
        !searchNavRef.current.contains(event.target as Node)
      ) {
        setIsSearchNavOpen(false);
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (
        postMenuRef.current &&
        !postMenuRef.current.contains(event.target as Node)
      ) {
        setActivePostMenu(null);
      }
      if (
        friendSearchRef.current &&
        !friendSearchRef.current.contains(event.target as Node)
      ) {
        setIsFriendSearchExpanded(false);
      }
      if (
        groupSearchRef.current &&
        !groupSearchRef.current.contains(event.target as Node)
      ) {
        setIsGroupSearchExpanded(false);
      }
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotifMenuOpen(false);
      }
      if (
        notifFilterRef.current &&
        !notifFilterRef.current.contains(event.target as Node)
      ) {
        setIsNotifFilterOpen(false);
      }
      if (
        roomSearchRef.current &&
        !roomSearchRef.current.contains(event.target as Node) &&
        roomSearchToggleRef.current &&
        !roomSearchToggleRef.current.contains(event.target as Node)
      ) {
        setIsRoomSearchOpen(false);
      }
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(event.target as Node)
      ) {
        setIsAttachmentMenuOpen(false);
      }
      if (
        messageDropdownRef.current &&
        !messageDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveMessageDropdown(null);
      }
      if (
        privacyDropdownRef.current &&
        !privacyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPrivacyDropdownOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
        setIsAccountSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoomSearchOpen, isAttachmentMenuOpen, activeMessageDropdown]);
  useEffect(() => {
    if (isCreatePostModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isCreatePostModalOpen]);

  return (
    <>
      <main className="min-h-screen bg-[#F3F2EF] dark:bg-[#18191A] text-black dark:text-[#E4E6EB] pb-10 pt-[56px]">
        {/* Navbar Fixed Top */}

        {/* Inline Styles for Scrollbars to bypass HMR issues */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        /* Hide scrollbar on mobile */
        @media (max-width: 640px) {
          ::-webkit-scrollbar {
            display: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          body, html {
            overflow-x: hidden !important;
            width: 100%;
          }
        }

        /* Firefox */
        .sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .sidebar-scrollbar:hover {
          scrollbar-color: #d1d5db transparent;
        }
        .dark .sidebar-scrollbar:hover {
          scrollbar-color: #4E4F50 transparent;
        }


        /* WebKit / Chrome / Edge */
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0); /* fully transparent */
          border-radius: 10px;
        }
        .sidebar-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #d1d5db; /* gray-300 */
        }
        .dark .sidebar-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #4E4F50;
        }
      `,
          }}
        />

        {/* HOME MINI SIDEBAR COMPONENT */}
        <HomeNavSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Container */}
        <div
          className={`flex w-full pt-1 sm:pt-6 ${activeTab === "chat" ? "hidden" : ""}`}
        >
          {/* Left Sidebar */}
          <div className="hidden lg:flex flex-col fixed left-[72px] top-[56px] w-[324px] h-[calc(100vh-56px)]">
            <div className="flex-1 overscroll-contain overflow-y-auto pt-6 px-4 pb-4 sidebar-scrollbar">
              <ProfileSuggestion profile={currentUser?.profile} username={currentUser?.username} userId={currentUser?.id} />
              {activeTab === "home" || activeTab === undefined ? <SidebarShortcuts /> : null}
              <div className="space-y-4">
              {activeTab === "friend" ? (
                <div ref={friendSearchRef} className="relative z-10">
                  {/* Title - samain style dengan header Friends di bawahnya */}
                  <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px] mb-2 px-2">
                    {t("friend.searchTitle")}
                  </h3>

                  {/* Container: fixed height so it doesn't shift layout */}
                  <div className="relative w-full h-[42px]">
                    {/* Absolute box tumbuh ke bawah, overlay di atas friendlist */}
                    <div
                      className={`absolute top-0 left-0 w-full bg-white dark:bg-[#242526] ${isFriendSearchExpanded ? "rounded-[21px] shadow-[0_4px_12px_rgba(32,33,36,0.28)] pb-3" : "rounded-full shadow-[0_1px_6px_rgba(32,33,36,0.28)] hover:shadow-[0_1px_6px_rgba(32,33,36,0.4)]"} dark:shadow-[0_1px_6px_rgba(0,0,0,0.5)] transition-shadow duration-200 border border-transparent dark:border-[#3E4042] flex flex-col`}
                    >
                      {/* Input Row */}
                      <div className="flex items-center px-4 py-2.5 min-h-[42px] w-full">
                        <svg
                          className="w-4 h-4 text-gray-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <input
                          type="text"
                          placeholder={t("friend.searchPlaceholder")}
                          className="w-full bg-transparent border-none outline-none ml-3 text-[14px] text-black dark:text-[#E4E6EB] placeholder-gray-400 dark:placeholder-[#B0B3B8]"
                          onFocus={() => setIsFriendSearchExpanded(true)}
                        />
                      </div>

                      {/* Expanded Dropdown */}
                      {isFriendSearchExpanded && (
                        <div className="w-full border-t border-gray-100 dark:border-[#3E4042] pt-1 mt-1">
                          <div className="flex flex-col w-full">
                            <p className="text-[11px] font-semibold text-gray-400 dark:text-[#B0B3B8] px-4 py-1.5 uppercase tracking-wide">
                              {t("friend.recentSearch")}
                            </p>
                            {[
                              "Budi Santoso",
                              "Siti Aminah",
                              "Agus Pratama",
                              "Dewi Lestari",
                            ].map((name, i) => (
                              <div
                                key={i}
                                className="px-4 py-2.5 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] cursor-pointer flex items-center justify-between group transition-colors shrink-0"
                              >
                                <div className="flex items-center gap-3">
                                  <svg
                                    className="w-4 h-4 text-gray-400 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <span className="text-[14px] text-black dark:text-[#E4E6EB]">
                                    {name}
                                  </span>
                                </div>
                                <div
                                  className="hidden group-hover:flex items-center justify-center p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-400 hover:text-gray-600 dark:hover:text-[#E4E6EB] transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeTab === "community" ? (
                <div ref={groupSearchRef} className="relative z-10">
                  <div className="flex flex-col gap-3 mb-4">
                    <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px] px-2">
                      {t("group.yourGroups")}
                    </h3>
                    <div className="px-2">
                      <button className="w-full text-emerald-500 hover:text-emerald-600 font-semibold text-[15px] bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                        {t("group.createGroup")}
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px] mb-2 px-2">
                    {t("group.searchTitle")}
                  </h3>
                  <div className="relative w-full h-[42px]">
                    <div
                      className={`absolute top-0 left-0 w-full bg-white dark:bg-[#242526] ${isGroupSearchExpanded ? "rounded-[21px] shadow-[0_4px_12px_rgba(32,33,36,0.28)] pb-3" : "rounded-full shadow-[0_1px_6px_rgba(32,33,36,0.28)] hover:shadow-[0_1px_6px_rgba(32,33,36,0.4)]"} dark:shadow-[0_1px_6px_rgba(0,0,0,0.5)] transition-shadow duration-200 border border-transparent dark:border-[#3E4042] flex flex-col`}
                    >
                      <div className="flex items-center px-4 py-2.5 min-h-[42px] w-full">
                        <svg
                          className="w-4 h-4 text-gray-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <input
                          type="text"
                          placeholder={t("group.searchPlaceholder")}
                          className="w-full bg-transparent border-none outline-none ml-3 text-[14px] text-black dark:text-[#E4E6EB] placeholder-gray-400 dark:placeholder-[#B0B3B8]"
                          onFocus={() => setIsGroupSearchExpanded(true)}
                        />
                      </div>
                      {isGroupSearchExpanded && (
                        <div className="w-full border-t border-gray-100 dark:border-[#3E4042] pt-1 mt-1">
                          <div className="flex flex-col w-full">
                            <p className="text-[11px] font-semibold text-gray-400 dark:text-[#B0B3B8] px-4 py-1.5 uppercase tracking-wide">
                              {t("group.recentSearch")}
                            </p>
                            {[
                              "Web Developers Indo",
                              "ReactJS Indonesia",
                              "Lowongan IT",
                            ].map((name, i) => (
                              <div
                                key={i}
                                className="px-4 py-2.5 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] cursor-pointer flex items-center justify-between group transition-colors shrink-0"
                              >
                                <div className="flex items-center gap-3">
                                  <svg
                                    className="w-4 h-4 text-gray-400 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <span className="text-[14px] text-black dark:text-[#E4E6EB]">
                                    {name}
                                  </span>
                                </div>
                                <div
                                  className="hidden group-hover:flex items-center justify-center p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-400 hover:text-gray-600 dark:hover:text-[#E4E6EB] transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Friend List (Friend Tab) */}
              {activeTab === "friend" && (
                <div>
                  <div className="flex items-center justify-between mb-2 px-2">
                    <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px]">
                      {t("profileSidebar.friends") || "Daftar Teman"}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {[
                      "Budi Santoso",
                      "Siti Aminah",
                      "Agus Pratama",
                      "Dewi Lestari",
                      "Rudi Hermawan",
                      "Rina Marlina",
                      "Andi Wijaya",
                      "Bagas Pangestu",
                      "Citra Kirana",
                      "Dian Sastro",
                      "Eko Patrio",
                      "Fahri Hamzah",
                      "Gita Gutawa",
                      "Hasan Basri",
                      "Intan Nuraini",
                      "Joko Anwar",
                      "Kaesang Pangarep",
                      "Luna Maya",
                    ].map((name, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedProfile({
                            name,
                            role: "Member",
                            avatar: `https://i.pravatar.cc/150?u=${i + 20}`,
                            relation: "friend",
                          });
                          setIsProfileSidebarOpen(true);
                        }}
                      >
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-[#4E4F50] overflow-hidden shrink-0">
                            <img
                              src={`https://i.pravatar.cc/150?u=${i + 20}`}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#242526] rounded-full"></div>
                        </div>
                        <span className="text-[14px] font-medium text-black dark:text-[#E4E6EB] flex-1 truncate">
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group List (Group Tab) */}
              {(activeTab === "community") && (
                <div>
                  <div className="flex items-center justify-between mb-2 px-2 mt-2">
                    <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px]">
                      {t("group.listTitle")}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {[
                      "Web Developers Indo",
                      "ReactJS Indonesia",
                      "Lowongan IT",
                      "UI/UX Designer ID",
                      "Node.js Developer",
                      "Frontend Masters",
                      "Belajar Programming",
                    ].map((name, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-[#4E4F50] overflow-hidden shrink-0">
                            <img
                              src={`https://picsum.photos/seed/${i + 100}/150/150`}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[14px] font-medium text-black dark:text-[#E4E6EB] truncate">
                            {name}
                          </span>
                          <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
                            {t("group.publicGroup")} • {(i + 1) * 12}K{" "}
                            {t("group.members")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Links moved to global mini sidebar */}
            </div>
            </div>
            

          </div>

          {/* Center Main Feed */}
          <div className="flex-1 flex justify-center lg:ml-[424px] lg:mr-[340px] xl:mr-[380px]">



            {activeTab === "friend" && (
              <div className="space-y-0 sm:space-y-4 max-w-[590px] w-full px-0 sm:px-4">
                {/* Create Post Input */}
                <div className="bg-transparent sm:bg-white sm:dark:bg-[#242526] rounded-none sm:rounded-xl shadow-none sm:shadow-sm border-0 sm:border border-b border-gray-300 dark:border-[#3E4042] sm:border-gray-300 sm:dark:border-[#3E4042] px-4 pt-4 pb-0 sm:p-4 mb-2 sm:mb-4 w-full">
                  <div className="flex items-center gap-3 pb-3 sm:pb-4 border-0 sm:border-b border-gray-200 dark:border-[#3E4042] sm:border-gray-100">
                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-emerald-600 dark:border-emerald-400">
                      <img
                        src={currentUser?.profile?.avatarUrl ? getOptimizedUrl(currentUser.profile.avatarUrl, "avatar") : "/default-avatar.svg"}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder={t("feed.createPost")}
                      className="w-full bg-white sm:bg-[#F0F2F5] dark:bg-[#242526] sm:dark:bg-[#3A3B3C] hover:bg-gray-50 sm:hover:bg-[#E4E6EB] dark:hover:bg-[#3A3B3C] sm:dark:hover:bg-[#4E4F50] transition-colors rounded-full px-4 py-2.5 focus:outline-none cursor-pointer text-gray-600 dark:text-[#B0B3B8] text-[17px] shadow-sm sm:shadow-none"
                      readOnly
                      onClick={() => { setStartWithMediaModal(false); setStartWithTagModal(false); setIsCreatePostModalOpen(true); setPostPrivacy(activeTab === "friend" ? "friends" : "public"); }}
                    />
                  </div>
                  <div className="flex justify-between items-center sm:gap-3 pt-1 pb-1 sm:pt-3 sm:pb-0 -mx-2 sm:mx-0 px-0 sm:px-1">
                    <button className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                      <div className="w-[24px] h-[24px] bg-current text-[#8B4513]" style={{ WebkitMask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat", mask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat" }} />
                      {t("feed.product") || "Product"}
                    </button>
                    <button className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                      <div className="w-[24px] h-[24px] bg-current text-purple-500" style={{ WebkitMask: "url(/navigasi/project.svg) center/contain no-repeat", mask: "url(/navigasi/project.svg) center/contain no-repeat" }} />
                      {t("feed.project")}
                    </button>
                    <button className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                      <img src="/visit.png" alt="Page" className="w-[24px] h-[24px] object-contain" />
                      {t("feed.page") || "Halaman"}
                    </button>
                  </div>
                </div>

              <PostFeed 
                currentUser={currentUser} 
                onProfileClick={(author: any) => {
                  setSelectedProfile({
                    id: author.id,
                    username: author.username,
                    name: author.profile?.displayName || author.username,
                    role: null, // skeleton/privacy
                    avatar: author.profile?.avatarUrl ? getOptimizedUrl(author.profile.avatarUrl, "avatar") : "/default-avatar.svg",
                    cover: author.profile?.coverUrl ? getOptimizedUrl(author.profile.coverUrl, "cover") : undefined,
                    bio: null, // skeleton/privacy
                    location: null, // skeleton/privacy
                    stats: null // skeleton
                  });
                  setIsProfileSidebarOpen(true);
                  
                  const cachedProf = profileCache.get(author.id);
                  const cachedConn = connectionCache.get(author.id);
                  
                  if (cachedProf && cachedConn) {
                      const p = cachedProf;
                      const user = p.user;
                      const conn = cachedConn;
                      
                      let relation = "none";
                      if (conn.friendshipStatus === "ACCEPTED") relation = "friend";
                      else if (conn.friendshipStatus === "PENDING") relation = "request";
                      
                      const friendsCount = ((user as any)._count?.friendshipsAsUser || 0) + ((user as any)._count?.friendshipsAsFriend || 0);
                      const isVisible = (privacy?: string) => {
                        if (currentUser && user.id === currentUser.id) return true;
                        if (!privacy || privacy === "PUBLIC") return true;
                        if (privacy === "PRIVATE") return false;
                        if (privacy === "FRIENDS") return conn.friendshipStatus === "ACCEPTED";
                        return true;
                      };
                      const showLoc = p.locationName && isVisible((user as any).profileSettings?.privacyLoc);
                      const showProf = p.profession && isVisible((user as any).profileSettings?.privacyProf);
                      
                      setSelectedProfile((prev: any) => ({
                        ...prev,
                        name: p.displayName || user.username || prev?.name,
                        bio: p.bio || prev?.bio,
                        location: showLoc ? p.locationName : null,
                        role: showProf ? p.profession : null,
                        avatar: p.avatarUrl ? getOptimizedUrl(p.avatarUrl, "avatar") : prev?.avatar,
                        cover: p.coverUrl ? getOptimizedUrl(p.coverUrl, "cover") : prev?.cover,
                        relation: relation,
                        isFollowing: conn.isFollowing,
                        requestedBy: conn.friendshipRequestedBy,
                        stats: {
                          friends: friendsCount,
                          followers: (user as any)._count?.followers || 0,
                          posts: (user as any)._count?.posts || 0
                        }
                      }));
                      return; // Skip fetching if we have cache
                  }
                  
                  setIsProfileSidebarLoading(true);
                  Promise.all([
                    import("@/app/actions/profile").then(m => m.getProfile(author.id)),
                    import("@/app/actions/connections").then(m => m.getConnectionStatus(currentUser?.id, author.id))
                  ]).then(([res, conn]) => {
                    if (res.success && res.profile) {
                      profileCache.set(author.id, res.profile);
                      connectionCache.set(author.id, conn);
                      
                      const p = res.profile;
                      const user = p.user;
                      
                      let relation = "none";
                      if (conn.friendshipStatus === "ACCEPTED") {
                        relation = "friend";
                      } else if (conn.friendshipStatus === "PENDING") {
                        relation = "request";
                      }
                      
                      const friendsCount = ((user as any)._count?.friendshipsAsUser || 0) + ((user as any)._count?.friendshipsAsFriend || 0);
                      
                      const isVisible = (privacy?: string) => {
                        if (currentUser && user.id === currentUser.id) return true;
                        if (!privacy || privacy === "PUBLIC") return true;
                        if (privacy === "PRIVATE") return false;
                        if (privacy === "FRIENDS") return conn.friendshipStatus === "ACCEPTED";
                        return true;
                      };
                      
                      const showLoc = p.locationName && isVisible((user as any).profileSettings?.privacyLoc);
                      const showProf = p.profession && isVisible((user as any).profileSettings?.privacyProf);
                      
                      setSelectedProfile((prev: any) => ({
                        ...prev,
                        name: p.displayName || user.username || prev?.name,
                        bio: p.bio || prev?.bio,
                        location: showLoc ? p.locationName : null,
                        role: showProf ? p.profession : null,
                        avatar: p.avatarUrl ? getOptimizedUrl(p.avatarUrl, "avatar") : prev?.avatar,
                        cover: p.coverUrl ? getOptimizedUrl(p.coverUrl, "cover") : prev?.cover,
                        relation: relation,
                        isFollowing: conn.isFollowing,
                        requestedBy: conn.friendshipRequestedBy,
                        stats: {
                          friends: friendsCount,
                          followers: (user as any)._count?.followers || 0,
                          posts: (user as any)._count?.posts || 0
                        }
                      }));
                    }
                  }).finally(() => {
                    setIsProfileSidebarLoading(false);
                  });
                }}
              />
              </div>
            )}
            {(activeTab === "community") && (
              <div className="space-y-4 max-w-[590px] w-full px-4 pt-4">
                {/* Group Post 1 */}
                <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-gray-100 dark:border-[#3E4042] pt-4 px-0">
                  <div className="flex items-center justify-between pb-2 px-4 relative">
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="w-[40px] h-[40px] rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-gray-200 dark:border-[#3E4042]">
                        <img
                          src="https://picsum.photos/seed/reactjs/150/150"
                          alt="Group"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-black dark:text-[#E4E6EB] text-[15px] leading-tight hover:underline">
                          ReactJS Indonesia
                        </h3>
                        <p className="text-[12px] text-gray-500 dark:text-[#B0B3B8]">
                          {formatPostTime(Date.now() - 10 * 60000, t, locale)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="relative"
                      {...(activePostMenu === "groupPost1"
                        ? { ref: postMenuRef }
                        : {})}
                    >
                      <button
                        onClick={() =>
                          setActivePostMenu(
                            activePostMenu === "groupPost1" ? null : "groupPost1",
                          )
                        }
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-gray-500 dark:text-[#B0B3B8] transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>

                      {activePostMenu === "groupPost1" && (
                        <div className="absolute right-0 mt-1 w-[260px] bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-[#3E4042] p-2 z-[10200]">
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            {t("group.joinGroup")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                              />
                            </svg>
                            {t("group.enterGroup")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            {t("group.viewPost")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              />
                            </svg>
                            {t("postMenu.savePost")}
                          </button>
                          <div className="h-[1px] bg-gray-200 dark:bg-[#3E4042] my-1 mx-2" />
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-red-500 font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            {t("postMenu.reportPost")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-red-500 font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            {t("group.reportGroup")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-black dark:text-[#E4E6EB] text-[15px] mb-3 px-4">
                    Ada yang pernah ngalamin hydration error di Next.js 14 pas
                    pakai custom hook? Mohon pencerahannya suhu-suhu 🙏
                  </p>
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-[#3E4042]">
                      <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[14px] font-semibold py-2 px-4 rounded-lg transition-colors">
                        {t("group.joinGroup")}
                      </button>
                      <button className="flex-1 bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-black dark:text-[#E4E6EB] text-[14px] font-semibold py-2 px-4 rounded-lg transition-colors">
                        {t("group.viewPost")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Post 2 */}
                <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-gray-100 dark:border-[#3E4042] pt-4 px-0">
                  <div className="flex items-center justify-between pb-2 px-4 relative">
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="w-[40px] h-[40px] rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-gray-200 dark:border-[#3E4042]">
                        <img
                          src="https://picsum.photos/seed/webdev/150/150"
                          alt="Group"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-black dark:text-[#E4E6EB] text-[15px] leading-tight hover:underline">
                          Web Developers Indo
                        </h3>
                        <p className="text-[12px] text-gray-500 dark:text-[#B0B3B8]">
                          {formatPostTime(Date.now() - 45 * 60000, t, locale)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="relative"
                      {...(activePostMenu === "groupPost2"
                        ? { ref: postMenuRef }
                        : {})}
                    >
                      <button
                        onClick={() =>
                          setActivePostMenu(
                            activePostMenu === "groupPost2" ? null : "groupPost2",
                          )
                        }
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-gray-500 dark:text-[#B0B3B8] transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>

                      {activePostMenu === "groupPost2" && (
                        <div className="absolute right-0 mt-1 w-[260px] bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-[#3E4042] p-2 z-[10200]">
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            {t("group.joinGroup")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                              />
                            </svg>
                            {t("group.enterGroup")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            {t("group.viewPost")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-black dark:text-[#E4E6EB] font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-gray-600 dark:text-[#B0B3B8]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              />
                            </svg>
                            {t("postMenu.savePost")}
                          </button>
                          <div className="h-[1px] bg-gray-200 dark:bg-[#3E4042] my-1 mx-2" />
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-red-500 font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            {t("postMenu.reportPost")}
                          </button>
                          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors text-left text-red-500 font-semibold text-[15px]">
                            <svg
                              className="w-6 h-6 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            {t("group.reportGroup")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-black dark:text-[#E4E6EB] text-[15px] mb-3 px-4">
                    Info loker frontend dong! Kalau bisa remote ya. Makasih 🙏
                  </p>
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-[#3E4042]">
                      <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[14px] font-semibold py-2 px-4 rounded-lg transition-colors">
                        {t("group.joinGroup")}
                      </button>
                      <button className="flex-1 bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-black dark:text-[#E4E6EB] text-[14px] font-semibold py-2 px-4 rounded-lg transition-colors">
                        {t("group.viewPost")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div
              className={`space-y-0 sm:space-y-4 max-w-[590px] w-full px-0 sm:px-4 ${activeTab !== "home" ? "hidden" : ""}`}
            >
              {/* Create Post Input */}
              <div className="bg-transparent sm:bg-white sm:dark:bg-[#242526] rounded-none sm:rounded-xl shadow-none sm:shadow-sm border-0 sm:border border-b border-gray-300 dark:border-[#3E4042] sm:border-gray-300 sm:dark:border-[#3E4042] px-4 pt-4 pb-0 sm:p-4 mb-2 sm:mb-4">
                <div className="flex items-center gap-3 pb-3 sm:pb-4 border-0 sm:border-b border-gray-200 dark:border-[#3E4042] sm:border-gray-100">
                  <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-emerald-600 dark:border-emerald-400">
                    <img
                      src={currentUser?.profile?.avatarUrl ? getOptimizedUrl(currentUser.profile.avatarUrl, "avatar") : "/default-avatar.svg"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={t("feed.createPost")}
                    onClick={() => { setStartWithMediaModal(false); setStartWithTagModal(false); setIsCreatePostModalOpen(true); setPostPrivacy(activeTab === "friend" ? "friends" : "public"); }}
                    className="w-full bg-white sm:bg-[#F0F2F5] dark:bg-[#242526] sm:dark:bg-[#3A3B3C] hover:bg-gray-50 sm:hover:bg-[#E4E6EB] dark:hover:bg-[#3A3B3C] sm:dark:hover:bg-[#4E4F50] transition-colors rounded-full px-4 py-2.5 focus:outline-none cursor-pointer text-gray-600 dark:text-[#B0B3B8] text-[17px] shadow-sm sm:shadow-none"
                    readOnly
                  />
                </div>
                <div className="flex justify-between items-center sm:gap-3 pt-1 pb-1 sm:pt-3 sm:pb-0 -mx-2 sm:mx-0 px-0 sm:px-1">
                  <button className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                    <div className="w-[24px] h-[24px] bg-current text-[#8B4513]" style={{ WebkitMask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat", mask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat" }} />
                    {t("feed.product") || "Product"}
                  </button>
                  <button className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                    <div className="w-[24px] h-[24px] bg-current text-purple-500" style={{ WebkitMask: "url(/navigasi/project.svg) center/contain no-repeat", mask: "url(/navigasi/project.svg) center/contain no-repeat" }} />
                    {t("feed.project")}
                  </button>
                  <button className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                    <img src="/visit.png" alt="Page" className="w-[24px] h-[24px] object-contain" />
                    {t("feed.page") || "Halaman"}
                  </button>
                  </div>
                </div>

                {/* Mobile Profile Suggestion */}
                <ProfileSuggestion 
                  profile={currentUser?.profile} 
                  username={currentUser?.username || ""} 
                  userId={currentUser?.id || ""}
                  forceCollapse={true}
                  isMobileCard={true}
                />

              {/* Post Feed Placeholder */}
              <PostFeed 
                currentUser={currentUser} 
                onProfileClick={(author: any) => {
                  setSelectedProfile({
                    id: author.id,
                    username: author.username,
                    name: author.profile?.displayName || author.username,
                    role: null, // skeleton/privacy
                    avatar: author.profile?.avatarUrl ? getOptimizedUrl(author.profile.avatarUrl, "avatar") : "/default-avatar.svg",
                    cover: author.profile?.coverUrl ? getOptimizedUrl(author.profile.coverUrl, "cover") : undefined,
                    bio: null, // skeleton/privacy
                    location: null, // skeleton/privacy
                    stats: null // skeleton
                  });
                  setIsProfileSidebarOpen(true);
                  
                  const cachedProf = profileCache.get(author.id);
                  const cachedConn = connectionCache.get(author.id);
                  
                  if (cachedProf && cachedConn) {
                      const p = cachedProf;
                      const user = p.user;
                      const conn = cachedConn;
                      
                      let relation = "none";
                      if (conn.friendshipStatus === "ACCEPTED") relation = "friend";
                      else if (conn.friendshipStatus === "PENDING") relation = "request";
                      
                      const friendsCount = ((user as any)._count?.friendshipsAsUser || 0) + ((user as any)._count?.friendshipsAsFriend || 0);
                      const isVisible = (privacy?: string) => {
                        if (currentUser && user.id === currentUser.id) return true;
                        if (!privacy || privacy === "PUBLIC") return true;
                        if (privacy === "PRIVATE") return false;
                        if (privacy === "FRIENDS") return conn.friendshipStatus === "ACCEPTED";
                        return true;
                      };
                      const showLoc = p.locationName && isVisible((user as any).profileSettings?.privacyLoc);
                      const showProf = p.profession && isVisible((user as any).profileSettings?.privacyProf);
                      
                      setSelectedProfile((prev: any) => ({
                        ...prev,
                        name: p.displayName || user.username || prev?.name,
                        bio: p.bio || prev?.bio,
                        location: showLoc ? p.locationName : null,
                        role: showProf ? p.profession : null,
                        avatar: p.avatarUrl ? getOptimizedUrl(p.avatarUrl, "avatar") : prev?.avatar,
                        cover: p.coverUrl ? getOptimizedUrl(p.coverUrl, "cover") : prev?.cover,
                        relation: relation,
                        isFollowing: conn.isFollowing,
                        requestedBy: conn.friendshipRequestedBy,
                        stats: {
                          friends: friendsCount,
                          followers: (user as any)._count?.followers || 0,
                          posts: (user as any)._count?.posts || 0
                        }
                      }));
                      return; // Skip fetching if we have cache
                  }
                  
                  setIsProfileSidebarLoading(true);
                  Promise.all([
                    import("@/app/actions/profile").then(m => m.getProfile(author.id)),
                    import("@/app/actions/connections").then(m => m.getConnectionStatus(currentUser?.id, author.id))
                  ]).then(([res, conn]) => {
                    if (res.success && res.profile) {
                      profileCache.set(author.id, res.profile);
                      connectionCache.set(author.id, conn);
                      
                      const p = res.profile;
                      const user = p.user;
                      
                      let relation = "none";
                      if (conn.friendshipStatus === "ACCEPTED") {
                        relation = "friend";
                      } else if (conn.friendshipStatus === "PENDING") {
                        relation = "request";
                      }
                      
                      const friendsCount = ((user as any)._count?.friendshipsAsUser || 0) + ((user as any)._count?.friendshipsAsFriend || 0);
                      
                      const isVisible = (privacy?: string) => {
                        if (currentUser && user.id === currentUser.id) return true;
                        if (!privacy || privacy === "PUBLIC") return true;
                        if (privacy === "PRIVATE") return false;
                        if (privacy === "FRIENDS") return conn.friendshipStatus === "ACCEPTED";
                        return true;
                      };
                      
                      const showLoc = p.locationName && isVisible((user as any).profileSettings?.privacyLoc);
                      const showProf = p.profession && isVisible((user as any).profileSettings?.privacyProf);
                      
                      setSelectedProfile((prev: any) => ({
                        ...prev,
                        name: p.displayName || user.username || prev?.name,
                        bio: p.bio || prev?.bio,
                        location: showLoc ? p.locationName : null,
                        role: showProf ? p.profession : null,
                        avatar: p.avatarUrl ? getOptimizedUrl(p.avatarUrl, "avatar") : prev?.avatar,
                        cover: p.coverUrl ? getOptimizedUrl(p.coverUrl, "cover") : prev?.cover,
                        relation: relation,
                        isFollowing: conn.isFollowing,
                        requestedBy: conn.friendshipRequestedBy,
                        stats: {
                          friends: friendsCount,
                          followers: (user as any)._count?.followers || 0,
                          posts: (user as any)._count?.posts || 0
                        }
                      }));
                    }
                  }).finally(() => {
                    setIsProfileSidebarLoading(false);
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Chat Bubbles (Always Rendered) */}
        <>
          {/* Right Sidebar: Home Tab */}
          {activeTab === "home" && (
            <div className="hidden lg:block fixed right-0 top-[56px] w-[324px] overscroll-contain h-[calc(100vh-56px)] overflow-y-auto pt-6 px-4 pb-24 sidebar-scrollbar">
              <div className="w-full bg-gradient-to-br from-green-800 to-green-950 rounded-xl shadow-sm border border-transparent overflow-hidden p-4 text-white relative">
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                <div className="absolute right-12 -top-2 w-8 h-8 bg-white opacity-10 rounded-full"></div>

                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm">
                      <img src="/visit.png" alt="Website" className="w-6 h-6 object-contain" />
                    </div>
                    <h3 className="font-bold text-[15px] leading-snug m-0">
                      {t("search.cta_title")}
                    </h3>
                  </div>
                  <p className="text-[13px] text-emerald-50 leading-relaxed opacity-90 m-0">
                    {t("search.cta_desc")}
                  </p>
                  <button onClick={() => router.push(`/${locale}/page`)} className="w-full mt-1 whitespace-nowrap bg-white text-emerald-600 hover:bg-emerald-700 hover:text-white font-bold text-[14px] py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                    {t("search.cta_button")}
                  </button>
                </div>
              </div>
              {/* Create Community CTA Card */}
              <div className="bg-gradient-to-br from-blue-900 to-slate-950 rounded-xl overflow-hidden shadow-sm p-4 text-white relative mt-4">
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                <div className="absolute right-12 -top-2 w-8 h-8 bg-white opacity-10 rounded-full"></div>

                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm">
                      <img src="/navigasi/komunitas-aktif.svg" alt="Community" className="w-6 h-6 object-contain brightness-0 invert" />
                    </div>
                    <h3 className="font-bold text-[15px] leading-snug m-0">
                      {t("search.community_cta_title")}
                    </h3>
                  </div>
                  <p className="text-[13px] text-indigo-50 leading-relaxed opacity-90 m-0">
                    {t("search.community_cta_desc")}
                  </p>
                  <button onClick={() => router.push(`/${locale}/community?create=true`)} className="w-full mt-1 whitespace-nowrap bg-white text-indigo-600 hover:bg-indigo-700 hover:text-white font-bold text-[14px] py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                    {t("search.community_cta_button")}
                  </button>
                </div>
              </div>
              {/* Sell Product CTA Card */}
              <div className="bg-gradient-to-br from-orange-700 to-orange-900 rounded-xl overflow-hidden shadow-sm p-4 text-white relative mt-4">
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                <div className="absolute right-12 -top-2 w-8 h-8 bg-white opacity-10 rounded-full"></div>

                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm">
                      <img src="/navigasi/produk-aktif.svg" alt="Product" className="w-6 h-6 object-contain brightness-0 invert" />
                    </div>
                    <h3 className="font-bold text-[15px] leading-snug m-0">
                      {t("search.product_cta_title")}
                    </h3>
                  </div>
                  <p className="text-[13px] text-orange-50 leading-relaxed opacity-90 m-0">
                    {t("search.product_cta_desc")}
                  </p>
                  <button onClick={() => router.push(`/${locale}/product?create=true`)} className="w-full mt-1 whitespace-nowrap bg-white text-orange-700 hover:bg-orange-800 hover:text-white font-bold text-[14px] py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                    {t("search.product_cta_button")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right Sidebar: Ads (Mencari Tab) */}
          {activeTab === "search" && (
            <div className="hidden">
              <div className="space-y-3">
                <a
                  href="https://resume.portotree.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <img
                    src="/ads/portotree-cv.png"
                    alt="Portotree CV"
                    className="w-full h-auto object-cover"
                  />
                </a>
                <a
                  href="https://surat.portotree.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <img
                    src="/ads/portotree-surat.png"
                    alt="Portotree Surat"
                    className="w-full h-auto object-cover"
                  />
                </a>
                <a
                  href="https://portofolio.portotree.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <img
                    src="/ads/portotree-portofolio.png"
                    alt="Portotree Portofolio"
                    className="w-full h-auto object-cover"
                  />
                </a>
              </div>
            </div>
          )}

          {/* Right Sidebar: Friend Tab - Permintaan Teman & Grup Bersama */}
          {activeTab === "friend" && (
            <div className="hidden lg:block fixed right-0 top-[56px] w-[324px] overscroll-contain h-[calc(100vh-56px)] overflow-y-auto pt-6 px-4 pb-24 sidebar-scrollbar">
              <div className="space-y-4">
                {/* Permintaan Teman */}
                <div>
                  <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px] mb-2 px-2">
                    {t("friend.friendRequests")}
                  </h3>
                  <div className="space-y-1">
                    {[
                      { name: "Raka Pradana", mutual: 5 },
                      { name: "Nadia Putri", mutual: 3 },
                      { name: "Farhan Maulana", mutual: 8 },
                      { name: "Larasati Dewi", mutual: 2 },
                    ].map((user, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedProfile({
                            name: user.name,
                            role: "Member",
                            avatar: `https://i.pravatar.cc/150?u=req${i + 50}`,
                            relation: "request",
                          });
                          setIsProfileSidebarOpen(true);
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-[#4E4F50] overflow-hidden shrink-0">
                          <img
                            src={`https://i.pravatar.cc/150?u=req${i + 50}`}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-black dark:text-[#E4E6EB] truncate">
                            {user.name}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-[#B0B3B8]">
                            {user.mutual} {t("friend.mutualFriends")}
                          </p>
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold py-1 px-2 rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("friend.confirm")}
                            </button>
                            <button
                              className="flex-1 bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-black dark:text-[#E4E6EB] text-[12px] font-semibold py-1 px-2 rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("friend.delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Sidebar: Group Tab - Permintaan Bergabung */}
          {(activeTab === "community") && (
            <div className="hidden lg:block fixed right-0 top-[56px] w-[324px] overscroll-contain h-[calc(100vh-56px)] overflow-y-auto pt-6 px-4 pb-24 sidebar-scrollbar">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px] mb-2 px-2">
                    {t("group.joinRequests")}
                  </h3>
                  <div className="space-y-1">
                    {[
                      { name: "Andi Susanto", group: "Web Developers Indo" },
                      { name: "Dewi Anggraini", group: "ReactJS Indonesia" },
                      { name: "Fajar Ramadhan", group: "Web Developers Indo" },
                      { name: "Sarah Utami", group: "Lowongan IT" },
                    ].map((req, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedProfile({
                            name: req.name,
                            role: "Member",
                            avatar: `https://i.pravatar.cc/150?u=${i + 60}`,
                            relation: "request",
                          });
                          setIsProfileSidebarOpen(true);
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-[#4E4F50] overflow-hidden shrink-0">
                          <img
                            src={`https://i.pravatar.cc/150?u=${i + 60}`}
                            alt={req.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-[14px] font-medium text-black dark:text-[#E4E6EB]">
                            {req.name}
                          </span>
                          <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] mb-2 line-clamp-1 text-ellipsis">
                            {t("group.requestToJoin")} {req.group}
                          </span>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold py-1 px-2 rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("friend.confirm")}
                            </button>
                            <button
                              className="flex-1 bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-black dark:text-[#E4E6EB] text-[12px] font-semibold py-1 px-2 rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("friend.delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Undangan Grub */}
                <div>
                  <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px] mb-2 px-2 mt-4">
                    {t("group.groupInvites")}
                  </h3>
                  <div className="space-y-1">
                    {[
                      { inviter: "Budi Santoso", group: "Programmer Jakarta" },
                      { inviter: "Rina Marlina", group: "Desain Grafis ID" },
                    ].map((invite, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedProfile({
                            name: invite.inviter,
                            role: "Member",
                            avatar: `https://i.pravatar.cc/150?u=${i + 80}`,
                            relation: "request",
                          });
                          setIsProfileSidebarOpen(true);
                        }}
                      >
                        <div className="w-12 h-12 rounded-lg bg-gray-300 dark:bg-[#4E4F50] overflow-hidden shrink-0">
                          <img
                            src={`https://picsum.photos/seed/${i + 200}/150/150`}
                            alt={invite.group}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-[14px] font-medium text-black dark:text-[#E4E6EB] truncate">
                            {invite.group}
                          </span>
                          <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] mb-2 line-clamp-1 text-ellipsis">
                            Diundang oleh {invite.inviter}
                          </span>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold py-1 px-2 rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("group.join")}
                            </button>
                            <button
                              className="flex-1 bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-black dark:text-[#E4E6EB] text-[12px] font-semibold py-1 px-2 rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("friend.delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

              <FloatingChatWidget currentUser={currentUser} t={t} locale={locale} activeTab={activeTab} />
        </>
        {/* Product Detail Right Sidebar */}
        <div
          className={`hidden lg:block fixed right-0 top-[56px] w-[340px] xl:w-[380px] overscroll-contain h-[calc(100vh-56px)] overflow-y-auto bg-[#F0F2F5] dark:bg-[#18191A] sidebar-scrollbar transition-transform duration-300 ease-in-out transform ${isProductDetailOpen ? "translate-x-0" : "translate-x-full"} z-[9999]`}
        >
          {selectedProduct && (
            <div className="p-4">
              <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-gray-100 dark:border-[#3E4042] overflow-hidden">
                {/* Image / Video */}
                {(() => {
                  const url = selectedProduct.videoUrl || "";
                  let isDirectVideo = false;
                  let embedUrl = "";
                  if (url) {
                    if (url.match(/\.(mp4|webm|ogg)$/i)) {
                      isDirectVideo = true;
                      embedUrl = url;
                    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
                      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                      if (match && match[1]) {
                        embedUrl = `https://www.youtube.com/embed/${match[1]}`;
                      }
                    } else if (url.includes("tiktok.com/")) {
                      const match = url.match(/video\/(\d+)/);
                      if (match && match[1]) {
                        embedUrl = `https://www.tiktok.com/embed/v2/${match[1]}`;
                      }
                    } else if (url.includes("vimeo.com")) {
                      const match = url.match(/vimeo\.com\/(?:.*#|.*\/)?(\d+)/);
                      if (match && match[1]) {
                        embedUrl = `https://player.vimeo.com/video/${match[1]}`;
                      }
                    }
                  }

                  return embedUrl ? (
                    <div className="aspect-video bg-gray-100 dark:bg-[#3A3B3C] w-full relative overflow-hidden">
                      {isDirectVideo ? (
                        <video src={embedUrl} controls className="w-full h-full object-cover" />
                      ) : (
                        <iframe width="100%" height="100%" src={embedUrl} title="Video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      )}
                      <button
                        onClick={() => setIsProductModalOpen(true)}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 transition-colors backdrop-blur-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      </button>
                      <button
                        onClick={() => setIsProductDetailOpen(false)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 transition-colors backdrop-blur-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] w-full flex items-center justify-center relative overflow-hidden">
                      <svg className="w-12 h-12 text-gray-300 dark:text-[#4E4F50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <button
                        onClick={() => setIsProductModalOpen(true)}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 transition-colors backdrop-blur-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      </button>
                      <button
                        onClick={() => setIsProductDetailOpen(false)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 transition-colors backdrop-blur-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })()}

                {/* Body */}
                <div className="p-3 flex flex-col">
                  {/* Store Row */}
                  <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                    <div className="w-5 h-5 rounded bg-gray-100 dark:bg-[#3A3B3C] overflow-hidden shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <span className="text-[12px] font-medium text-gray-500 dark:text-[#B0B3B8] truncate hover:underline hover:text-gray-700 dark:hover:text-[#E4E6EB] transition-colors cursor-pointer">{selectedProduct.store}</span>
                  </div>

                  {/* Name */}
                  <h2 className="font-semibold text-[14px] text-black dark:text-[#E4E6EB] leading-snug mb-2">
                    {selectedProduct.name}
                  </h2>

                  {/* Badges (Koleksi & Kategori) */}
                  {(selectedProduct.collection || selectedProduct.category) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedProduct.collection && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-md">
                          <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          <span className="text-[11px] font-medium text-orange-500">{selectedProduct.collection}</span>
                        </div>
                      )}
                      {selectedProduct.category && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          <span className="text-[11px] font-medium text-emerald-500">{selectedProduct.category}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div className="mt-1 mb-4">
                    <h3 className="text-[10px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1">Deskripsi</h3>
                    <p className="text-[12px] text-gray-600 dark:text-[#B0B3B8] leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Reviews Placeholder */}
                  <div className="mb-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[12px] font-bold text-gray-800 dark:text-white">{t("mydash.ulasan_pembeli")}</h3>
                      <button className="text-[10px] text-emerald-500 font-medium hover:underline">{t("mydash.selengkapnya")}</button>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#18191A] rounded-xl p-3 border border-gray-200 dark:border-gray-800 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                      <div className="flex-1 mt-0.5">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="w-16 h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                          <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <svg key={i} className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-1.5"></div>
                        <div className="w-3/4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </div>
                    </div>
                    <button className="w-full mt-3 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex justify-center items-center gap-1.5">
                      {t("mydash.tambah_ulasan_kamu") || "+Ulasan kamu"}
                    </button>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-2 mb-3">
                    {selectedProduct.salePrice ? (
                      <>
                        <div className="text-[18px] font-bold text-emerald-500 leading-none">
                          Rp {Number(selectedProduct.salePrice.toString().replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[13px] text-gray-400 dark:text-[#B0B3B8] line-through mb-[1px]">
                          Rp {Number(selectedProduct.price?.toString().replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                        </div>
                      </>
                    ) : (
                      <div className="text-[18px] font-bold text-emerald-500 leading-none">
                        Rp {Number(selectedProduct.price?.toString().replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="flex gap-2 mb-2">
                    <button className="w-11 shrink-0 bg-white dark:bg-[#2A2B2C] hover:bg-gray-50 dark:hover:bg-[#3A3B3C] border border-gray-200 dark:border-gray-700/80 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition-colors text-[14px]">
                      {selectedProduct.ctaType === "custom" && selectedProduct.customCta
                        ? selectedProduct.customCta
                        : (selectedProduct.ctaType ? t(`mydash.cta_${selectedProduct.ctaType}`) : t("product.buy_now"))}
                    </button>
                  </div>

                  {/* Copyright */}
                  <p className="text-center text-[10px] text-gray-400 dark:text-[#B0B3B8] mt-1">
                    {t("product.checkout_at")}{" "}
                    <span className="font-bold text-gray-500 dark:text-[#E4E6EB]">LYNK</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overlay for product detail on mobile */}
        {isProductDetailOpen && (
          <div className="fixed inset-0 z-[9998] lg:hidden bg-black/50" onClick={() => setIsProductDetailOpen(false)} />
        )}

        {/* Profile Right Sidebar — REDESIGNED */}
        <div
          className={`hidden lg:block fixed right-0 top-[56px] w-[340px] xl:w-[380px] overscroll-contain h-[calc(100vh-56px)] overflow-y-auto sidebar-scrollbar transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform ${isProfileSidebarOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"} z-40 bg-white dark:bg-[#1C1C1E] border-l border-gray-200/60 dark:border-white/5`}
        >
          {selectedProfile && (
            <>
              <div className="sticky top-3 z-50 flex justify-end px-3 w-full gap-2" style={{ height: 0, pointerEvents: 'none' }}>
                {selectedProfile.id !== currentUser?.id && (
                <div className="relative pointer-events-auto">
                  <button
                    onClick={() => setIsProfileSidebarOptionsOpen(!isProfileSidebarOptionsOpen)}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all hover:scale-110 shadow-md"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 12a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>
                  {isProfileSidebarOptionsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileSidebarOptionsOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                        <button className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 transition-colors">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          {t("profile.reportAccount") || "Laporkan akun"}
                        </button>
                        <button className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors border-t border-gray-100 dark:border-white/5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          {t("profile.blockAccount") || "Block"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                )}
                <button
                  onClick={() => setIsProfileSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all hover:scale-110 pointer-events-auto shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* ── Cover + Avatar ───────────────────────────────────────── */}
              <div className="relative">
                {/* Cover photo */}
                <div className="h-[130px] w-full overflow-hidden relative">
                  <img
                    key={selectedProfile.cover || "default"}
                    src={selectedProfile.cover || "/sampul-placeholder.png"}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (!e.currentTarget.src.includes("/sampul-placeholder.png")) {
                        e.currentTarget.src = "/sampul-placeholder.png";
                      }
                    }}
                  />
                  {/* gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>



                {/* Avatar */}
                <div className="absolute -bottom-10 left-4 w-[76px] h-[76px] rounded-full ring-4 ring-white dark:ring-[#1C1C1E] overflow-hidden shadow-lg">
                  <img
                    src={selectedProfile.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* ── Name / Role / Bio / Stats ────────────────────────────── */}
              <div className="pt-12 px-4 pb-4">
                {/* Name + badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[17px] text-gray-900 dark:text-white leading-tight">
                      {selectedProfile.name}
                    </h3>
                    <p className="text-[12px] text-gray-400 dark:text-[#888] font-medium mt-0.5">@{selectedProfile.username || selectedProfile.name?.toLowerCase().replace(/\s+/g, "")}</p>
                        {selectedProfile.location && (
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {selectedProfile.location}
                          </p>
                        )}
                        {selectedProfile.role && (
                          <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {selectedProfile.role}
                          </p>
                        )}
                  </div>

                </div>

                {/* Bio */}
                {selectedProfile.bio ? (
                  <p className="text-[13px] text-gray-600 dark:text-[#A8A8A8] mt-3 leading-relaxed">
                    {selectedProfile.bio}
                  </p>
                ) : (
                  <p className="text-[13px] text-gray-400 dark:text-[#666] mt-3 italic">
                    Belum ada bio.
                  </p>
                )}

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: t("profileSidebar.friends"), value: selectedProfile.stats?.friends ?? 0 },
                    { label: t("profile.followers") || "Pengikut", value: selectedProfile.stats?.followers ?? 0 },
                    { label: "Postingan", value: selectedProfile.stats?.posts ?? 0 },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.04] rounded-xl py-2 px-1 hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                    >
                      <span className="font-bold text-[15px] text-gray-900 dark:text-white">{stat.value}</span>
                      <span className="text-[11px] text-gray-500 dark:text-[#888] mt-0.5 text-center">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Action Buttons ───────────────────────────────────────── */}
              <div className="px-4 pb-4 flex flex-col gap-2 border-b border-gray-100 dark:border-white/5">
                {isProfileSidebarLoading ? (
                  <div className="flex gap-2 animate-pulse">
                    <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl flex-[1.5]"></div>
                    <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl flex-1"></div>
                  </div>
                ) : selectedProfile.id === currentUser?.id ? (
                  <div className="flex justify-center">
                    <button onClick={() => router.push(`/${locale}/p/${selectedProfile.username}/${selectedProfile.id}`)} className="w-[50%] flex items-center justify-center bg-gray-100 dark:bg-white/[0.07] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-800 dark:text-white font-semibold py-2.5 rounded-xl text-[13px] transition-all">
                      {t("profileSidebar.openProfile") || "Open Profile"}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        if (!token) return;
                        const { handlePrimaryConnectionAction, getConnectionStatus } = await import("@/app/actions/connections");
                        const res = await handlePrimaryConnectionAction(token, currentUser.id, selectedProfile.id);
                        if (res.success) {
                           const conn = await getConnectionStatus(currentUser.id, selectedProfile.id);
                           let relation = "none";
                           if (conn.friendshipStatus === "ACCEPTED") relation = "friend";
                           else if (conn.friendshipStatus === "PENDING") relation = "request";
                           
                           setSelectedProfile((prev: any) => {
                             let newFriends = prev.stats?.friends || 0;
                             let newFollowers = prev.stats?.followers || 0;
                             
                             if (typeof newFriends === 'number' && typeof newFollowers === 'number') {
                               if (prev.relation === "friend" && relation !== "friend") {
                                 newFriends = Math.max(0, newFriends - 1);
                               } else if (prev.relation !== "friend" && relation === "friend") {
                                 newFriends += 1;
                               }
                               
                               if (prev.isFollowing && !conn.isFollowing) {
                                 newFollowers = Math.max(0, newFollowers - 1);
                               } else if (!prev.isFollowing && conn.isFollowing) {
                                 newFollowers += 1;
                               }
                             }
                             
                             return { 
                               ...prev, 
                               relation, 
                               isFollowing: conn.isFollowing, 
                               requestedBy: conn.friendshipRequestedBy,
                               stats: { ...prev.stats, friends: newFriends, followers: newFollowers }
                             };
                           });
                           connectionCache.set(selectedProfile.id, conn); // update cache so next open is fresh
                           
                           // Also trigger custom event so other components (like feed) can update if necessary
                           window.dispatchEvent(new CustomEvent("friend-accepted", { 
                             detail: { senderId: selectedProfile.id, currentUserId: currentUser.id }
                           }));
                        }
                      }}
                      className={`flex-[1.5] flex items-center justify-center gap-1.5 font-semibold py-2.5 rounded-xl text-[13px] transition-all shadow-sm active:scale-[0.98] ${
                        selectedProfile.relation === "friend"
                        ? "bg-gray-100 dark:bg-white/[0.07] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-800 dark:text-white"
                        : selectedProfile.relation === "request" && selectedProfile.requestedBy !== currentUser?.id
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : (selectedProfile.relation === "request" || selectedProfile.isFollowing)
                        ? "bg-transparent border border-gray-300 dark:border-[#4E4F50] text-black dark:text-[#E4E6EB] hover:bg-red-50 hover:border-red-500 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:border-red-500 dark:hover:text-red-400"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                      }`}
                    >
                      {!(selectedProfile.relation === "friend" || selectedProfile.relation === "request" || selectedProfile.isFollowing) && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                      )}
                      {selectedProfile.relation === "friend" 
                        ? (t("friend.alreadyFriend") || "Friends") 
                        : selectedProfile.relation === "request" && selectedProfile.requestedBy !== currentUser?.id
                        ? (t("profile.acceptRequestBtn") || "Terima Permintaan")
                        : (selectedProfile.relation === "request" || selectedProfile.isFollowing)
                        ? (t("friend.following") || "Mengikuti")
                        : "Follow"}
                    </button>
                    <button onClick={() => router.push(`/${locale}/p/${selectedProfile.username}/${selectedProfile.id}`)} className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-white/[0.07] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-gray-800 dark:text-white font-semibold py-2.5 rounded-xl text-[13px] transition-all">
                      {t("profileSidebar.openProfile") || "Open Profile"}
                    </button>
                  </div>
                )}
              </div>


              {/* ── Owned Groups ─────────────────────────────────────────── */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[13px] uppercase tracking-wider text-gray-400 dark:text-[#666]">
                    {t("profileSidebar.ownedGroups")}
                  </h4>
                  <a href="#" className="text-[12px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    {t("profile.seeAll") || "Lihat Semua"}
                  </a>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Web Dev Indonesia", members: "15.2K" },
                    { name: "Freelance Programmer ID", members: "8.1K" },
                  ].map((group) => (
                    <div key={group.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[#2A2A2C] shrink-0 overflow-hidden">
                        <img src="/default-cover.jpg" alt={group.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {group.name}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-[#666] mt-0.5">
                          {group.members} {t("profile.members") || "Member"}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Joined Groups ─────────────────────────────────────────── */}
              <div className="px-4 pt-4 pb-24">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[13px] uppercase tracking-wider text-gray-400 dark:text-[#666]">
                    {t("profileSidebar.joinedGroups")}
                  </h4>
                  <a href="#" className="text-[12px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    {t("profile.seeAll") || "Lihat Semua"}
                  </a>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Next.js Indonesia", members: "30.5K" },
                    { name: "Tailwind CSS Community", members: "25.3K" },
                  ].map((group) => (
                    <div key={group.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[#2A2A2C] shrink-0 overflow-hidden">
                        <img src="/default-cover.jpg" alt={group.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {group.name}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-[#666] mt-0.5">
                          {group.members} {t("profile.members") || "Member"}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}
        </div>


        {activeTab === "chat" && (
          <div className="fixed top-[56px] left-0 lg:left-[72px] right-0 bottom-0 flex bg-[#F0F2F5] dark:bg-[#18191A] z-40 overflow-hidden">

            <div className="w-[360px] bg-white dark:bg-[#242526] border-r border-gray-200 dark:border-[#3E4042] flex flex-col shrink-0 relative overflow-hidden">
              <div className="pt-4 px-4 border-b border-gray-200 dark:border-[#3E4042]">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-[24px] text-black dark:text-[#E4E6EB]">
                    {t('chat.title')}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative group/options" ref={chatListSettingsRef}>
                      <button onClick={() => setIsChatListSettingsOpen(!isChatListSettingsOpen)} className="w-9 h-9 rounded-full bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] flex items-center justify-center transition-colors text-black dark:text-[#E4E6EB]">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
                      </button>
                      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gray-800/90 text-[#E4E6EB] text-[13px] font-medium rounded-lg opacity-0 group-hover/options:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {t('chat.optionsTooltip')}
                      </div>
                      {isChatListSettingsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#242526] rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-[#3E4042] py-1.5 z-50">
                          <button onClick={(e) => { e.stopPropagation(); setChatListFilter('requests'); setIsChatListSettingsOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[14px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                            <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                            {t('chat.messageRequests')}
                          </button>
                          <div className="h-[1px] bg-gray-200 dark:bg-[#3E4042] my-1 mx-2"></div>
                          <button onClick={(e) => { e.stopPropagation(); setIsChatListSettingsOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[14px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                            <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" /></svg>
                            {t('chat.manage')}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setIsChatListSettingsOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[14px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                            <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {t('chat.settings')}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
                <div className="mt-3 relative">
                  <input
                    type="text"
                    placeholder={t('chat.searchChat')}
                    className="w-full bg-[#F0F2F5] dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] px-4 py-2 rounded-full outline-none text-[15px]"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setChatListFilter('all')}
                      className={`px-3 py-2 text-[14px] font-medium border-b-2 -mb-[1px] transition-colors ${chatListFilter === 'all' ? 'text-[#00A884] border-[#00A884]' : 'text-gray-500 dark:text-[#A8ABAF] border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      {t('chat.filterAll')}
                    </button>
                    <button
                      onClick={() => setChatListFilter('unread')}
                      className={`px-3 py-2 text-[14px] font-medium border-b-2 -mb-[1px] transition-colors ${chatListFilter === 'unread' ? 'text-[#00A884] border-[#00A884]' : 'text-gray-500 dark:text-[#A8ABAF] border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      {t('chat.filterUnread')}
                    </button>
                    <button
                      onClick={() => setChatListFilter('favorite')}
                      className={`px-3 py-2 text-[14px] font-medium border-b-2 -mb-[1px] transition-colors ${chatListFilter === 'favorite' ? 'text-[#00A884] border-[#00A884]' : 'text-gray-500 dark:text-[#A8ABAF] border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      {t('chat.filterFavorite')}
                    </button>
                  </div>
                  <div className="relative" ref={chatFilterRef}>
                    <button onClick={() => setIsChatFilterOpen(!isChatFilterOpen)} className={`p-2 rounded-full transition-colors mb-1 mr-1 ${isChatFilterOpen ? 'bg-gray-200 dark:bg-[#4E4F50] text-[#00A884]' : 'text-gray-500 dark:text-[#A8ABAF] hover:bg-gray-200 dark:hover:bg-[#3A3B3C]'}`}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                      </svg>
                    </button>
                    {isChatFilterOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#242526] rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-[#3E4042] py-1.5 z-50">
                        <button onClick={(e) => { e.stopPropagation(); setChatListFilter('community'); setIsChatFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[14px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                          {t('chat.filterGroup')}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setChatListFilter('archive'); setIsChatFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[14px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12.14l.84 1H5.12z" /></svg>
                          {t('chat.filterArchive')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="overscroll-contain flex-1 overflow-y-auto sidebar-scrollbar p-2">
                {dummyChats.map((chat, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveChatIdx(idx);
                      setIsChatInfoOpen(true);
                      setProfileViewIdx(null);
                    }}
                    className={`relative group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] cursor-pointer transition-colors mb-1 ${activeChatIdx === idx ? "bg-gray-100 dark:bg-[#3A3B3C]" : ""
                      }`}
                  >
                    <div className="relative w-14 h-14 shrink-0">
                      <img
                        src="/default-avatar.svg"
                        className="w-full h-full rounded-full object-cover border border-emerald-600 dark:border-emerald-400"
                      />
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#31A24C] rounded-full border-2 border-white dark:border-[#242526]"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-[15px] text-black dark:text-[#E4E6EB] truncate">
                          {chat.name}
                        </h4>
                        <span className="text-[12px] text-gray-500" suppressHydrationWarning>
                          {formatChatDate(chat.ts, locale)}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 truncate mt-0.5">
                        <ChatStatusMark status={(chat as any).status} />
                        {chat.msg}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ top: rect.top });
                        setActiveChatMenu(activeChatMenu === idx ? null : idx);
                      }}
                      className={
                        "absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#E4E6EB] dark:bg-[#4E4F50] flex items-center justify-center text-gray-600 dark:text-[#B0B3B8] hover:bg-[#D8D9DB] dark:hover:bg-[#5A5B5C] transition-all z-10 " +
                        (activeChatMenu === idx
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100")
                      }
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                    {activeChatMenu === idx && (
                      <div
                        ref={chatMenuRef}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed z-[200] w-[280px] bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-[#3E4042] overflow-hidden py-2"
                        style={{
                          left: "360px",
                          top: Math.min(
                            menuPosition.top,
                            window.innerHeight - 520,
                          ),
                        }}
                      >
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setActiveChatMenu(null);
                          setActiveChatIdx(null);
                          setProfileViewIdx(idx);
                        }}
                          className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                        >
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t("chat.viewProfile")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          {t("chat.archiveChat")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          {t("chat.pinChat")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {t("chat.markUnread")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {t("chat.addFavorite")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center justify-between text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors">
                          <div className="flex items-center gap-4">
                            <svg className="w-6 h-6 text-black dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            {t("chat.addToList")}
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="border-t border-gray-100 dark:border-[#3E4042] my-2" />
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-red-500 transition-colors">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          {t("chat.report")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-red-500 transition-colors">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          {t("chat.block")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-[#F15C00] transition-colors">
                          <svg className="w-6 h-6 text-[#F15C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t("chat.clearChat")}
                        </button>
                        <button className="w-full text-left px-5 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-4 text-[15px] font-semibold text-[#F15C00] transition-colors">
                          <svg className="w-6 h-6 text-[#F15C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {t("chat.deleteChat")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* TENGAH & KANAN */}
            {isCreatingGroup ? (
              <div className="flex-1 bg-[#F0F2F5] dark:bg-[#18191A] flex flex-col relative h-full">
                <div className="flex-1 overflow-y-auto sidebar-scrollbar p-6 overscroll-none">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Inline Header */}
                    <div className="flex items-center gap-3">
                      <h2 className="font-bold text-[24px] text-black dark:text-[#E4E6EB]">{t('chat.createGroup')}</h2>
                    </div>

                    {/* Group Icon & Name */}
                    <div className="bg-white dark:bg-[#242526] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-[#3E4042] flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <button className="w-20 h-20 shrink-0 rounded-xl bg-gray-100 dark:bg-[#3A3B3C] flex flex-col items-center justify-center gap-1 hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors text-gray-500 dark:text-[#B0B3B8] border border-transparent dark:border-[#4E4F50]">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-[10px] font-medium uppercase tracking-wider">{t('chat.groupIcon')}</span>
                      </button>
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder={t('chat.groupName')}
                          className="w-full bg-transparent border-b-2 border-gray-200 dark:border-[#3E4042] focus:border-[#1877F2] dark:focus:border-[#2D88FF] pb-2 outline-none text-[16px] text-black dark:text-[#E4E6EB] transition-colors font-medium placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-gray-100 dark:border-[#3E4042] overflow-hidden">

                      {/* Temp Messages */}
                      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-[#3E4042]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-[#183966] flex items-center justify-center text-[#1877F2] dark:text-[#2D88FF]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-[15px] text-black dark:text-[#E4E6EB]">{t('chat.tempMessages')}</p>
                            <p className="text-[13px] text-gray-500 dark:text-[#B0B3B8]">{isTempMessageOn ? t('chat.on') : t('chat.off')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsTempMessageOn(!isTempMessageOn)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${isTempMessageOn ? 'bg-[#1877F2]' : 'bg-gray-300 dark:bg-[#4E4F50]'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${isTempMessageOn ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}></div>
                        </button>
                      </div>

                      {/* Permissions */}
                      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-[15px] text-black dark:text-[#E4E6EB]">{t('chat.groupPermissions')}</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>

                    {/* Member List Preview */}
                    <div className="bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-gray-100 dark:border-[#3E4042] overflow-hidden p-4">
                      <p className="font-semibold text-[14px] text-gray-500 dark:text-[#B0B3B8] mb-3">{t('chat.groupMembers')} ({selectedFriendsToAdd.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFriendsToAdd.map((userIdx) => (
                          <div key={userIdx} className="flex items-center gap-2 bg-gray-100 dark:bg-[#3A3B3C] px-3 py-1.5 rounded-full border border-gray-200 dark:border-[#4E4F50]">
                            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                              <img src="/default-avatar.svg" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[13px] font-medium text-black dark:text-[#E4E6EB]">{dummyChats[userIdx].name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Create Button */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => {
                        setIsCreatingGroup(false);
                        setSelectedFriendsToAdd([]);
                        setShowAddIcons(false);
                      }} className="hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-gray-600 dark:text-gray-300 font-semibold text-[15px] py-2.5 px-6 rounded-xl transition-colors">
                        {t('chat.cancel')}
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingGroup(false);
                          setSelectedFriendsToAdd([]);
                          setActiveChatIdx(0);
                        }}
                        disabled={selectedFriendsToAdd.length === 0}
                        className={`font-semibold text-[15px] py-2.5 px-8 rounded-xl transition-colors flex items-center justify-center ${selectedFriendsToAdd.length === 0
                          ? 'bg-gray-200 dark:bg-[#3A3B3C] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-[#1877F2] hover:bg-blue-600 text-white shadow-sm'
                          }`}
                      >
                        {t('chat.createGroupBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : profileViewIdx !== null ? (
              <div className="flex-1 bg-white dark:bg-[#242526] flex flex-col items-center relative">
                <div className="w-full h-full flex flex-col relative max-w-3xl mx-auto">
                  <button
                    onClick={() => setProfileViewIdx(null)}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center justify-center transition-colors text-gray-500 dark:text-[#B0B3B8] z-10"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex-1 overflow-y-auto sidebar-scrollbar p-8 flex flex-col items-center gap-6 overscroll-none">
                    <div className="w-40 h-40 shrink-0 rounded-full overflow-hidden border-2 border-gray-200 dark:border-[#3E4042] mt-8">
                      <img src="/default-avatar.svg" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-bold text-[32px] text-black dark:text-[#E4E6EB]">
                      {dummyChats[profileViewIdx]?.name || "Budi Santoso"}
                    </h3>

                    {/* Action Buttons */}
                    <div className="flex gap-8 mb-4">
                      <div className="flex flex-col items-center gap-2 cursor-pointer group">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-[#3A3B3C] group-hover:bg-gray-200 dark:group-hover:bg-[#4E4F50] flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB] group-hover:text-[#00B47A] transition-colors" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-[14px] font-medium text-black dark:text-[#E4E6EB] group-hover:text-[#00B47A] transition-colors">
                          {t("chat.profile")}
                        </span>
                      </div>

                      <div
                        onClick={() => {
                          setActiveChatIdx(profileViewIdx);
                          setIsChatInfoOpen(true);
                          setProfileViewIdx(null);
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer group"
                      >
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-[#3A3B3C] group-hover:bg-gray-200 dark:group-hover:bg-[#4E4F50] flex items-center justify-center transition-colors">
                          <svg className="w-6 h-6 text-black dark:text-[#E4E6EB] group-hover:text-[#00B47A] transition-colors" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-[14px] font-medium text-black dark:text-[#E4E6EB] group-hover:text-[#00B47A] transition-colors">
                          {t("chat.chat")}
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex flex-col">
                      {/* Category: Links */}
                      <div className="w-full border-t border-gray-200 dark:border-[#3E4042]">
                        <button className="w-full flex items-center justify-between py-5 transition-colors group px-4 rounded-lg mt-2">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[#2D88FF]">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <span className="font-semibold text-[16px] text-black dark:text-[#E4E6EB] group-hover:underline">{t("chat.links", { defaultMessage: "Links" })}</span>
                          </div>
                          <svg className="w-6 h-6 text-gray-500 group-hover:text-black dark:group-hover:text-[#E4E6EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <div className="flex flex-col gap-3 pb-6 px-4">
                          <a href="#" className="flex items-center gap-3 p-3 text-[15px] text-[#2D88FF] hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-xl group/link transition-colors">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <span className="truncate group-hover/link:underline">https://dribbble.com/shots/popular</span>
                          </a>
                          <a href="#" className="flex items-center gap-3 p-3 text-[15px] text-[#2D88FF] hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-xl group/link transition-colors">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <span className="truncate group-hover/link:underline">https://github.com/nethubz/web-app</span>
                          </a>
                        </div>
                      </div>

                      {/* Category: Media Gallery */}
                      <div className="w-full border-t border-gray-200 dark:border-[#3E4042]">
                        <button className="w-full flex items-center justify-between py-5 transition-colors group px-4 rounded-lg mt-2">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[#00B47A]">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <span className="font-semibold text-[16px] text-black dark:text-[#E4E6EB] group-hover:underline">{t("chat.mediaGallery")}</span>
                          </div>
                          <svg className="w-6 h-6 text-gray-500 group-hover:text-black dark:group-hover:text-[#E4E6EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <div className="grid grid-cols-3 gap-3 pb-6 px-4">
                          <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] rounded-xl cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden border border-transparent dark:border-[#4E4F50]">
                            <img src="/default-avatar.svg" className="w-full h-full object-cover opacity-90" />
                          </div>
                          <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] rounded-xl cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden border border-transparent dark:border-[#4E4F50]">
                            <img src="/default-avatar.svg" className="w-full h-full object-cover opacity-90" />
                          </div>
                          <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors flex items-center justify-center border border-transparent dark:border-[#4E4F50]">
                            <span className="text-[16px] font-bold text-gray-500 dark:text-[#B0B3B8]">12+</span>
                          </div>
                        </div>
                      </div>

                      {/* Category: Media File */}
                      <div className="w-full border-t border-gray-200 dark:border-[#3E4042]">
                        <button className="w-full flex items-center justify-between py-5 transition-colors group px-4 rounded-lg mt-2">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <span className="font-semibold text-[16px] text-black dark:text-[#E4E6EB] group-hover:underline">{t("chat.mediaFile")}</span>
                          </div>
                          <svg className="w-6 h-6 text-gray-500 group-hover:text-black dark:group-hover:text-[#E4E6EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <div className="flex flex-col gap-2 pb-6 px-4">
                          <div className="flex items-center gap-4 cursor-pointer group/file p-3 hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-xl transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center shrink-0">
                              <span className="text-[12px] font-bold text-red-600 dark:text-red-400">PDF</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-black dark:text-[#E4E6EB] truncate">Briefing_Design_Q3.pdf</p>
                              <p className="text-[13px] text-gray-500 mt-0.5">2.4 MB • 12 Ags</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 cursor-pointer group/file p-3 hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-xl transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                              <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400">DOC</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-black dark:text-[#E4E6EB] truncate">Draft_Kontrak_Kerja.docx</p>
                              <p className="text-[13px] text-gray-500 mt-0.5">840 KB • 10 Ags</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeChatIdx !== null ? (
              <>
                {/* TENGAH: Chat Room */}
                <div className="flex-1 bg-transparent flex flex-col relative">
                  <div className="h-[60px] bg-white dark:bg-[#242526] border-b border-gray-200 dark:border-[#3E4042] flex items-center px-4 shadow-sm shrink-0">
                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => setIsChatInfoOpen(true)}
                    >
                      <div className="relative w-10 h-10 shrink-0">
                        <img src="/default-avatar.svg" alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        {dummyChats[activeChatIdx]?.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31A24C] rounded-full border-2 border-white dark:border-[#242526]"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[15px] text-black dark:text-[#E4E6EB] group-hover:underline">
                          {dummyChats[activeChatIdx]?.name || "Budi Santoso"}
                        </h3>
                        <p className="text-[12px] text-gray-500">
                          {dummyChats[activeChatIdx]?.isOnline ? t("chat.activeNow") : t("chat.offline", { defaultMessage: "Offline" })}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        ref={roomSearchToggleRef}
                        onClick={() => setIsRoomSearchOpen(!isRoomSearchOpen)}
                        className={`text-[#00B47A] w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isRoomSearchOpen ? 'bg-gray-100 dark:bg-[#3A3B3C]' : 'hover:bg-gray-200 dark:hover:bg-[#3A3B3C]'}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <div className="relative" ref={chatMoreMenuRef}>
                        <button
                          onClick={() => setIsChatMoreMenuOpen(!isChatMoreMenuOpen)}
                          className={`text-[#00B47A] w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isChatMoreMenuOpen ? 'bg-gray-100 dark:bg-[#3A3B3C]' : 'hover:bg-gray-200 dark:hover:bg-[#3A3B3C]'
                            }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </button>
                        {isChatMoreMenuOpen && (
                          <div className="absolute right-0 top-full mt-2 w-[280px] bg-white dark:bg-[#242526] rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-[#3E4042] py-1.5 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                                setIsChatInfoOpen(true);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-black dark:text-[#E4E6EB]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t('chat.viewProfile')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-black dark:text-[#E4E6EB]"
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
                              </svg>{t('chat.search')}</button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-black dark:text-[#E4E6EB]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t('chat.selectMessages')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-black dark:text-[#E4E6EB]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t('chat.disappearingMessages')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-black dark:text-[#E4E6EB]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                              {t('chat.addFavorite')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center justify-between text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <svg
                                  className="w-6 h-6 text-black dark:text-[#E4E6EB]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                  />
                                </svg>
                                {t('chat.addToList')}
                              </div>
                              <svg
                                className="w-4 h-4 text-black dark:text-[#E4E6EB]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-black dark:text-[#E4E6EB] transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-black dark:text-[#E4E6EB]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t('chat.closeChat')}
                            </button>

                            <div className="my-1.5 border-t border-gray-200 dark:border-[#3E4042]"></div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-red-500 dark:text-red-500 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-red-500 dark:text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2"
                                />
                              </svg>
                              {t('chat.report')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-red-500 dark:text-red-500 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-red-500 dark:text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                              {t('chat.block')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-orange-500 dark:text-orange-500 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-orange-500 dark:text-orange-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {t('chat.clearChat')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChatMoreMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-orange-500 dark:text-orange-500 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-orange-500 dark:text-orange-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              {t('chat.deleteChat')}
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveChatIdx(null)}
                        className="text-[#00B47A] w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-[#3A3B3C]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  {isRoomSearchOpen && (
                    <div ref={roomSearchRef} className="absolute top-[60px] right-0 max-w-md w-full z-10 pr-6 pl-4 py-3 flex items-center gap-2 bg-transparent pointer-events-none">
                      <div className="flex-1 relative pointer-events-auto">
                        <input type="text" placeholder={t("chat.searchInChat") || "Cari di obrolan..."} className="w-full bg-white dark:bg-[#18191A] text-black dark:text-[#E4E6EB] border border-gray-300 dark:border-[#4E4F50] shadow-md px-4 py-2.5 rounded-full focus:outline-none text-[15px]" />
                      </div>
                      <button className="w-10 h-10 rounded-full bg-white dark:bg-[#18191A] border border-gray-300 dark:border-[#4E4F50] shadow-md flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#242526] transition-colors shrink-0 pointer-events-auto">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  )}
                  {/* Main Chat Sticky Date */}
                  <div className={`absolute top-[70px] left-1/2 transform -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-300 ${showMainStickyDate ? "opacity-100" : "opacity-0"}`}>
                    <span className="bg-[#E5E5E5] dark:bg-[#242526] text-gray-600 dark:text-[#A8ABAF] px-3 py-1 rounded-lg text-[12.5px] font-semibold tracking-wide shadow-md">
                      {mainStickyDateText}
                    </span>
                  </div>
                  <div ref={chatContainerRef} onScroll={handleMainChatScroll} className="flex-1 overflow-y-auto relative chat-scrollbar p-4 flex flex-col gap-2 overscroll-none">
                    <div className="flex flex-col items-center justify-center pt-8 pb-16">
                      <div className="w-[100px] h-[100px] mb-4 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                        <img src="/default-avatar.svg" className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-[20px] font-semibold text-black dark:text-[#E4E6EB] mb-2">{dummyChats[activeChatIdx]?.name || "Budi Santoso"}</h2>
                      <p className="text-gray-500 dark:text-[#B0B3B8] text-[15px] mb-8">{t("chat.youCreatedThisChat")}</p>
                      <div className="max-w-[400px] text-center text-[13px] text-gray-500 dark:text-[#B0B3B8] leading-relaxed px-4">
                        <svg className="w-3.5 h-3.5 inline-block mr-1 align-baseline text-gray-400 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        {t("chat.e2eEncryptionText")}{" "}
                        <a href="#" className="text-[#2D88FF] hover:underline cursor-pointer">{t("chat.learnMore")}</a>
                      </div>
                    </div>
                    {/* Tanggal Chat */}
                    <div className="flex justify-center my-4">
                      <span className="bg-[#E5E5E5] dark:bg-[#242526] text-gray-600 dark:text-[#A8ABAF] px-3 py-1 rounded-lg text-[12.5px] font-semibold tracking-wide shadow-sm">
                        9/9/2026
                      </span>
                    </div>

                    <div className="flex items-start gap-2 max-w-[70%] group">
                      <img
                        src="/default-avatar.svg"
                        className="w-8 h-8 rounded-full border border-gray-300 shrink-0 mt-1"
                      />
                      <div className="flex items-center gap-2">
                        <div className="bg-white dark:bg-[#3A3B3C] px-3 py-2 rounded-2xl rounded-tl-none shadow-sm flex flex-col">
                          <p className="text-[14px] text-black dark:text-[#E4E6EB]">
                            Halo bro, apa kabar? Udah lama gak nongkrong nih.
                          </p>
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8] mt-1 self-start">
                            10.22
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMessageDropdown(0); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-full transition-all shrink-0"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </button>
                          {activeMessageDropdown === 0 && (
                            <div ref={messageDropdownRef} className="absolute left-0 top-full mt-1 z-50">
                              <MessageDropdownMenu isIncoming={true} t={t} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bubble 1: Gagal Terkirim */}
                    {/* Bubble 1: Gagal Terkirim */}
                    <div className="flex items-end justify-end gap-2 max-w-[70%] self-end mt-2 group">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMessageDropdown(1); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-full transition-all shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {activeMessageDropdown === 1 && (
                              <div ref={messageDropdownRef} className="absolute right-0 top-full mt-1 z-50">
                                <MessageDropdownMenu isIncoming={false} t={t} />
                              </div>
                            )}
                          </div>
                          <div className="bg-emerald-600 dark:bg-emerald-500 px-3 py-2 rounded-2xl rounded-tr-none shadow-sm flex flex-col items-end">
                            <p className="text-[14px] text-white">
                              Waduh, sinyal lagi jelek nih bro.
                            </p>
                            <span className="text-[11px] text-emerald-100 mt-1">10.25</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-3.5 h-3.5 bg-red-500" style={{ WebkitMask: 'url(/mark/tidak-terkirim.svg) no-repeat center', WebkitMaskSize: 'contain', mask: 'url(/mark/tidak-terkirim.svg) no-repeat center', maskSize: 'contain' }} />
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8]">{t("chat.failedToSend")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bubble 2: Pending */}
                    <div className="flex items-end justify-end gap-2 max-w-[70%] self-end mt-2 group">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMessageDropdown(2); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-full transition-all shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {activeMessageDropdown === 2 && (
                              <div ref={messageDropdownRef} className="absolute right-0 top-full mt-1 z-50">
                                <MessageDropdownMenu isIncoming={false} t={t} />
                              </div>
                            )}
                          </div>
                          <div className="bg-emerald-600 dark:bg-emerald-500 px-3 py-2 rounded-2xl rounded-tr-none shadow-sm flex flex-col items-end">
                            <p className="text-[14px] text-white">
                              Sabar yak, ini lagi jalan ke warkop cari wifi.
                            </p>
                            <span className="text-[11px] text-emerald-100 mt-1">10.27</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-3.5 h-3.5 bg-orange-500" style={{ WebkitMask: 'url(/mark/pending.svg) no-repeat center', WebkitMaskSize: 'contain', mask: 'url(/mark/pending.svg) no-repeat center', maskSize: 'contain' }} />
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8]">{t("chat.sending")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bubble 3: Terkirim */}
                    <div className="flex items-end justify-end gap-2 max-w-[70%] self-end mt-2 group">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMessageDropdown(3); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-full transition-all shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {activeMessageDropdown === 3 && (
                              <div ref={messageDropdownRef} className="absolute right-0 bottom-full mb-1 z-50">
                                <MessageDropdownMenu isIncoming={false} t={t} />
                              </div>
                            )}
                          </div>
                          <div className="bg-emerald-600 dark:bg-emerald-500 px-3 py-2 rounded-2xl rounded-tr-none shadow-sm flex flex-col items-end">
                            <p className="text-[14px] text-white">
                              Nah udah masuk nih pesannya!
                            </p>
                            <span className="text-[11px] text-emerald-100 mt-1">10.35</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-3.5 h-3.5 bg-blue-500" style={{ WebkitMask: 'url(/mark/terkirim.svg) no-repeat center', WebkitMaskSize: 'contain', mask: 'url(/mark/terkirim.svg) no-repeat center', maskSize: 'contain' }} />
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8]">{t("chat.sent")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bubble 4: Dilihat */}
                    <div className="flex items-end justify-end gap-2 max-w-[70%] self-end mt-2 group">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMessageDropdown(4); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] rounded-full transition-all shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {activeMessageDropdown === 4 && (
                              <div ref={messageDropdownRef} className="absolute right-0 bottom-full mb-1 z-50">
                                <MessageDropdownMenu isIncoming={false} t={t} />
                              </div>
                            )}
                          </div>
                          <div className="bg-emerald-600 dark:bg-emerald-500 px-3 py-2 rounded-2xl rounded-tr-none shadow-sm flex flex-col items-end">
                            <p className="text-[14px] text-white">
                              Baik bro! Iyak nih kapan ya terakhir ketemu, sibuk parah wkwk.
                            </p>
                            <span className="text-[11px] text-emerald-100 mt-1">11.11</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-4 h-4 bg-green-500" style={{ WebkitMask: 'url(/mark/diliat.svg) no-repeat center', WebkitMaskSize: 'contain', mask: 'url(/mark/diliat.svg) no-repeat center', maskSize: 'contain' }} />
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8]">{t("chat.read")} 11.12</span>
                        </div>
                      </div>
                    </div>
                    {/* Tanggal Chat 2 */}
                    <div className="flex justify-center my-4">
                      <span className="chat-date-separator bg-[#E5E5E5] dark:bg-[#242526] text-gray-600 dark:text-[#A8ABAF] px-3 py-1 rounded-lg text-[12.5px] font-semibold tracking-wide shadow-sm">
                        10/9/2026
                      </span>
                    </div>

                    <div className="flex items-start gap-2 max-w-[70%] group mt-2">
                      <img src="/default-avatar.svg" className="w-7 h-7 rounded-full border border-gray-300 shrink-0 mt-1" />
                      <div className="flex flex-col gap-1 ">
                        <div className="bg-white dark:bg-[#3A3B3C] px-3 py-2 rounded-2xl rounded-tl-none shadow-sm flex flex-col">
                          <p className="text-[14px] text-black dark:text-[#E4E6EB]">
                            Eh bro, sorry baru balas. Kemarin sibuk banget parah.
                          </p>
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8] mt-1 self-start">
                            08:15
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-end gap-2 max-w-[70%] self-end mt-2">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="bg-emerald-600 dark:bg-emerald-500 px-3 py-2 rounded-2xl rounded-tr-none shadow-sm flex flex-col items-end">
                          <p className="text-[14px] text-white">
                            Santai bro, ini besok jadi kumpul kan di tempat biasa?
                          </p>
                          <span className="text-[11px] text-emerald-100 mt-1">08:20</span>
                        </div>
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-4 h-4 bg-green-500" style={{ WebkitMask: 'url(/mark/diliat.svg) no-repeat center', WebkitMaskSize: 'contain', mask: 'url(/mark/diliat.svg) no-repeat center', maskSize: 'contain' }} />
                          <span className="text-[11px] text-gray-500 dark:text-[#B0B3B8]">Dilihat 08:22</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-transparent shrink-0">
                    <div className="flex items-end gap-2">
                      <div className="relative" ref={attachmentMenuRef}>
                        <button
                          onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                          className="bg-[#00B47A] text-white hover:bg-[#009E6B] p-2 rounded-full transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>

                        {isAttachmentMenuOpen && (
                          <div className="absolute bottom-full left-0 mb-3 w-[220px] bg-white dark:bg-[#242526] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-[#3E4042] overflow-hidden py-2 z-50">
                            <button className="w-full text-left px-5 py-3 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-medium text-black dark:text-[#E4E6EB] transition-colors">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-[#2D88FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              {t("chat.uploadImage")}
                            </button>
                            <button className="w-full text-left px-5 py-3 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-medium text-black dark:text-[#E4E6EB] transition-colors">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              {t("chat.uploadFile")}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex items-end bg-white dark:bg-[#242526] border border-gray-300 dark:border-[#3E4042] rounded-[24px] px-4 py-2 ml-1">
                        <textarea
                          rows={1}
                          placeholder={t("chat.typeMessage")}
                          className="flex-1 bg-transparent outline-none text-[15px] text-black dark:text-[#E4E6EB] resize-none max-h-[120px] overflow-y-auto sidebar-scrollbar overscroll-none"
                          style={{ minHeight: "24px" }}
                          value={mainChatMessage}
                          onChange={(e) => {
                            setMainChatMessage(e.target.value);
                            const prev = e.target.style.height;
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                            if (prev !== e.target.style.height) {
                              const msgs = e.target.closest('.flex-col')?.querySelector('.overflow-y-auto');
                              if (msgs) msgs.scrollTop = msgs.scrollHeight;
                            }
                          }}
                        />
                        <button className="text-[#00B47A] hover:text-[#009E6B] transition-colors shrink-0 ml-2 flex items-center justify-center">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {mainChatMessage.trim().length > 0 ? (
                        <button className="flex items-center justify-center gap-1.5 bg-[#00B47A] hover:bg-[#009E6B] text-white px-4 py-1.5 rounded-full transition-colors ml-1 font-bold text-[15px] shadow-sm shrink-0 min-w-[112px]">
                          {t("chat.send")}
                          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        </button>
                      ) : (
                        <button className="flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-full transition-colors ml-1 font-bold text-[15px] shadow-sm shrink-0 min-w-[112px]">
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 512 512"
                            fill="currentColor"
                          >
                            <g
                              transform="translate(0,512) scale(0.1,-0.1)"
                              stroke="none"
                            >
                              <path d="M2256 5104 c-140 -34 -288 -147 -353 -269 -49 -94 -66 -167 -65 -275 2 -215 153 -2686 167 -2744 51 -199 230 -368 429 -405 141 -26 291 -6 405 54 135 71 253 228 281 375 6 30 46 661 90 1402 71 1228 77 1353 65 1422 -38 221 -198 389 -420 441 -83 20 -515 19 -599 -1z" />
                              <path d="M414 3206 c-42 -18 -71 -60 -137 -191 -130 -260 -208 -507 -253 -800 -26 -169 -26 -541 0 -710 23 -151 74 -359 121 -495 41 -119 172 -397 212 -448 77 -101 228 -72 261 51 14 49 9 64 -80 242 -108 220 -176 432 -215 680 -24 153 -24 497 0 650 39 248 107 460 215 680 89 178 94 193 80 242 -24 90 -119 136 -204 99z" />
                              <path d="M4596 3210 c-58 -18 -96 -73 -96 -140 0 -30 19 -79 78 -198 112 -227 175 -424 218 -687 26 -154 26 -496 0 -650 -43 -263 -106 -460 -218 -687 -88 -177 -96 -219 -55 -278 59 -87 177 -91 240 -9 40 53 161 309 206 436 214 601 197 1264 -46 1848 -40 95 -133 277 -160 314 -40 53 -99 71 -167 51z" />
                              <path d="M934 2906 c-43 -19 -74 -63 -138 -196 -222 -463 -256 -981 -95 -1465 45 -136 142 -344 183 -392 66 -78 194 -64 241 27 29 56 19 106 -44 232 -88 175 -141 346 -167 537 -43 327 17 667 172 972 42 82 54 116 54 151 0 106 -108 176 -206 134z" />
                              <path d="M4063 2900 c-25 -11 -51 -33 -63 -52 -35 -58 -27 -103 44 -250 120 -250 176 -482 176 -738 0 -256 -56 -488 -176 -738 -74 -153 -80 -194 -39 -254 34 -50 100 -76 154 -59 65 19 89 47 155 181 270 546 274 1171 11 1718 -68 142 -88 170 -139 193 -52 23 -71 23 -123 -1z" />
                              <path d="M1475 2613 c-66 -16 -133 -122 -198 -308 -56 -164 -71 -258 -71 -445 0 -122 4 -188 18 -255 39 -190 139 -423 200 -470 47 -35 95 -41 150 -17 98 44 110 122 42 265 -56 117 -83 199 -101 312 -36 221 1 450 106 656 45 88 51 145 19 197 -31 51 -105 80 -165 65z" />
                              <path d="M3577 2610 c-58 -10 -108 -65 -114 -124 -5 -41 0 -60 40 -144 58 -124 84 -205 102 -317 36 -221 4 -424 -102 -645 -39 -82 -45 -100 -40 -143 10 -112 144 -168 236 -99 58 43 159 284 198 472 13 61 18 131 18 250 0 119 -5 189 -18 250 -39 186 -140 429 -197 471 -35 26 -78 36 -123 29z" />
                              <path d="M2455 1090 c-198 -44 -352 -180 -417 -368 -32 -95 -32 -249 0 -344 56 -164 180 -288 348 -350 85 -31 263 -31 348 0 168 62 292 186 348 350 32 -95 32 -249 0 -344 -57 -164 -183 -291 -348 -349 -67 23 -215 33 -279 19z" />
                            </g>
                          </svg>
                          PING
                        </button>
                      )}

                    </div>
                  </div>
                </div>

                {/* KANAN: Chat Info Sidebar */}
                {isChatInfoOpen && (
                  <div className="w-[360px] bg-white dark:bg-[#242526] border-l border-gray-200 dark:border-[#3E4042] flex flex-col shrink-0 relative">
                    <button
                      onClick={() => setIsChatInfoOpen(false)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center justify-center transition-colors text-gray-500 dark:text-[#B0B3B8] z-10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex-1 overflow-y-auto sidebar-scrollbar p-4 flex flex-col items-center gap-4 overscroll-none">
                      <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden border-2 border-gray-200 dark:border-[#3E4042] mt-4">
                        <img
                          src="/default-avatar.svg"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="font-bold text-[20px] text-black dark:text-[#E4E6EB]">
                        {dummyChats[activeChatIdx]?.name || "Budi Santoso"}
                      </h3>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center gap-1 cursor-pointer group">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#3A3B3C] group-hover:bg-gray-200 dark:group-hover:bg-[#4E4F50] flex items-center justify-center transition-colors">
                            <svg
                              className="w-5 h-5 text-black dark:text-[#E4E6EB] group-hover:text-[#00B47A] transition-colors"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <span className="text-[12px] text-black dark:text-[#E4E6EB] group-hover:text-[#00B47A] transition-colors">
                            {t("chat.profile")}
                          </span>
                        </div>
                      </div>

                      {/* Categories */}
                      <div className="w-full flex flex-col mt-4">
                        {/* Category: Links */}
                        <div className="w-full border-t border-gray-200 dark:border-[#3E4042]">
                          <button className="w-full flex items-center justify-between py-4 transition-colors group px-2 -mx-2 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[#2D88FF]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              </div>
                              <span className="font-semibold text-[15px] text-black dark:text-[#E4E6EB] group-hover:underline">{t("chat.links")}</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-[#E4E6EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <div className="flex flex-col gap-2 pb-4">
                            <a href="#" className="flex items-center gap-3 p-2 -mx-2 text-[14px] text-[#2D88FF] hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-lg group/link transition-colors">
                              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              </div>
                              <span className="truncate group-hover/link:underline">https://dribbble.com/shots/popular</span>
                            </a>
                            <a href="#" className="flex items-center gap-3 p-2 -mx-2 text-[14px] text-[#2D88FF] hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-lg group/link transition-colors">
                              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              </div>
                              <span className="truncate group-hover/link:underline">https://github.com/nethubz/web-app</span>
                            </a>
                          </div>
                        </div>

                        {/* Category: Media Gallery */}
                        <div className="w-full border-t border-gray-200 dark:border-[#3E4042]">
                          <button className="w-full flex items-center justify-between py-4 transition-colors group px-2 -mx-2 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[#00B47A]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="font-semibold text-[15px] text-black dark:text-[#E4E6EB] group-hover:underline">{t("chat.mediaGallery")}</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-[#E4E6EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <div className="grid grid-cols-3 gap-2 pb-4 px-2 -mx-2">
                            <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden border border-transparent dark:border-[#4E4F50]">
                              <img src="/default-avatar.svg" className="w-full h-full object-cover opacity-90" />
                            </div>
                            <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden border border-transparent dark:border-[#4E4F50]">
                              <img src="/default-avatar.svg" className="w-full h-full object-cover opacity-90" />
                            </div>
                            <div className="aspect-square bg-gray-100 dark:bg-[#3A3B3C] rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors flex items-center justify-center border border-transparent dark:border-[#4E4F50]">
                              <span className="text-[14px] font-semibold text-gray-500 dark:text-[#B0B3B8]">12+</span>
                            </div>
                          </div>
                        </div>

                        {/* Category: Media File */}
                        <div className="w-full border-t border-gray-200 dark:border-[#3E4042]">
                          <button className="w-full flex items-center justify-between py-4 transition-colors group px-2 -mx-2 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </div>
                              <span className="font-semibold text-[15px] text-black dark:text-[#E4E6EB] group-hover:underline">{t("chat.mediaFiles")}</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-[#E4E6EB] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <div className="flex flex-col gap-1 pb-4">
                            <div className="flex items-center gap-3 cursor-pointer group/file p-2 -mx-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-lg transition-colors">
                              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-bold text-red-600 dark:text-red-400">PDF</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-black dark:text-[#E4E6EB] truncate">Briefing_Design_Q3.pdf</p>
                                <p className="text-[12px] text-gray-500">2.4 MB • 12 Ags</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 cursor-pointer group/file p-2 -mx-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50 rounded-lg transition-colors">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">DOC</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-black dark:text-[#E4E6EB] truncate">Draft_Kontrak_Kerja.docx</p>
                                <p className="text-[12px] text-gray-500">840 KB • 10 Ags</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 bg-[#F0F2F5] dark:bg-[#18191A] flex flex-col items-center justify-center relative">
                <div className="w-32 h-32 mb-6 rounded-full bg-white dark:bg-[#242526] flex items-center justify-center text-gray-300 dark:text-[#4E4F50] shadow-sm">
                  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.03 2 11c0 2.84 1.455 5.375 3.738 7.025l-.946 2.836a1 1 0 001.265 1.265l2.836-.946A10.871 10.871 0 0012 20c5.523 0 10-4.03 10-9s-4.477-9-10-9zm0 16c-1.1 0-2.162-.178-3.155-.506a1 1 0 00-.81.085l-1.89.63.63-1.89a1 1 0 00-.085-.81C4.78 14.156 4 12.656 4 11c0-3.86 3.582-7 8-7s8 3.14 8 7-3.582 7-8 7zm-3-8a1 1 0 110-2 1 1 0 010 2zm3 0a1 1 0 110-2 1 1 0 010 2zm3 0a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-black dark:text-[#E4E6EB] mb-2">{t("chat.noChatSelected")}</h3>
                <p className="text-[15px] text-gray-500 dark:text-[#B0B3B8] max-w-[400px] text-center">
                  {t("chat.noChatSelectedDesc")}
                </p>
              </div>
            )}

            {/* KANAN: Friend List Sidebar (Shows when Chat Info is closed or no chat selected) */}
            {(!isChatInfoOpen || activeChatIdx === null) && (
              <div className="w-[360px] bg-white dark:bg-[#242526] border-l border-gray-200 dark:border-[#3E4042] flex flex-col shrink-0">
                <div className="pt-4 px-4 border-b border-gray-200 dark:border-[#3E4042]">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-[24px] text-black dark:text-[#E4E6EB]">
                      {t('chat.yourFriends')}
                    </h2>
                    <div className="relative group/addtoggle">
                      <button
                        onClick={() => {
                          if (!showAddIcons) {
                            setShowAddIcons(true);
                          } else {
                            if (selectedFriendsToAdd.length === 0) {
                              setShowAddIcons(false);
                              setIsCreatingGroup(false);
                            } else {
                              setSelectedFriendsToAdd([]);
                            }
                          }
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAddIcons ? (selectedFriendsToAdd.length > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50' : 'bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-gray-600 dark:text-[#B0B3B8]') : 'bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-black dark:text-[#E4E6EB]'}`}
                      >
                        {!showAddIcons ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        ) : selectedFriendsToAdd.length > 0 ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                      </button>
                      <div className="absolute -bottom-9 right-0 px-2.5 py-1.5 bg-gray-800/90 text-[#E4E6EB] text-[13px] font-medium rounded-lg opacity-0 group-hover/addtoggle:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {!showAddIcons
                          ? t('chat.showAddIcons')
                          : selectedFriendsToAdd.length > 0
                            ? `(${selectedFriendsToAdd.length}) ${t('chat.removeAll')}`
                            : t('chat.cancel')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 relative pb-3">
                    <input
                      type="text"
                      placeholder={t('chat.searchUsername')}
                      className="w-full bg-[#F0F2F5] dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] px-4 py-2 rounded-full outline-none text-[15px]"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto sidebar-scrollbar px-2 py-2 overscroll-none">
                  <div className="px-2 pt-2 pb-1 text-[13px] font-semibold text-gray-500 dark:text-[#B0B3B8]">
                    {t('chat.activeFriends')} ({dummyChats.filter(c => c.isOnline).length})
                  </div>
                  {dummyChats.filter(c => c.isOnline).map((chat, idx) => {
                    const realIdx = dummyChats.indexOf(chat);
                    const isAdded = selectedFriendsToAdd.includes(realIdx);
                    return (
                      <div
                        key={'online-' + idx}
                        onClick={() => {
                          if (showAddIcons) {
                            const isAdded = selectedFriendsToAdd.includes(realIdx);
                            setSelectedFriendsToAdd(prev => isAdded ? prev.filter(i => i !== realIdx) : [...prev, realIdx]);
                          } else {
                            setActiveChatIdx(realIdx);
                            setIsChatInfoOpen(true);
                            setProfileViewIdx(null);
                            setIsCreatingGroup(false);
                            setSelectedFriendsToAdd([]);
                            setShowAddIcons(false);
                          }
                        }}
                        className={`relative group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors mb-1 ${isAdded ? 'bg-green-50 dark:bg-[#00B47A]/10 hover:bg-green-100 dark:hover:bg-[#00B47A]/20' : 'hover:bg-gray-200 dark:hover:bg-[#3A3B3C]'}`}
                      >
                        <div className="relative w-14 h-14 shrink-0">
                          <img
                            src="/default-avatar.svg"
                            className={`w-full h-full rounded-full object-cover transition-all ${isAdded ? 'border-2 border-[#00B47A]' : 'border border-emerald-600 dark:border-emerald-400'}`}
                          />
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#31A24C] rounded-full border-2 border-white dark:border-[#242526]"></div>
                          {isAdded && (
                            <div className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-[#00B47A] rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className={`font-semibold text-[15px] truncate ${isAdded ? 'text-[#00B47A]' : 'text-black dark:text-[#E4E6EB]'}`}>
                            {chat.name}
                          </h4>
                        </div>
                        {/* Hover Action Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Icon Profil */}
                          <div className="relative group/tooltip opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setProfileViewIdx(realIdx); setActiveChatIdx(null); setIsCreatingGroup(false); }}
                              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] hover:bg-[#E7F3FF] dark:hover:bg-[#183966] flex items-center justify-center text-gray-500 dark:text-[#B0B3B8] hover:text-[#1877F2] dark:hover:text-[#2D88FF] transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-800 dark:bg-[#E4E6EB] text-white dark:text-black text-[12px] font-medium px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                              {t('chat.profileInfo')}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-[#E4E6EB]"></div>
                            </div>
                          </div>
                          {/* Icon + Tambahkan */}
                          <div className={`relative group/tooltip transition-opacity ${showAddIcons ? 'opacity-100' : 'hidden'}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedFriendsToAdd(prev => isAdded ? prev.filter(i => i !== realIdx) : [...prev, realIdx]); }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAdded ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-gray-200 dark:bg-[#3A3B3C] hover:bg-[#E7F3FF] dark:hover:bg-[#183966] text-gray-500 dark:text-[#B0B3B8] hover:text-[#1877F2] dark:hover:text-[#2D88FF]'}`}
                            >
                              {isAdded
                                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              }
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-800 dark:bg-[#E4E6EB] text-white dark:text-black text-[12px] font-medium px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                              {isAdded ? t('chat.removeFromList') : t('chat.addFriend')}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-[#E4E6EB]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-2 pt-4 pb-1 text-[13px] font-semibold text-gray-500 dark:text-[#B0B3B8]">
                    {t('chat.offlineFriends')} ({dummyChats.filter(c => !c.isOnline).length})
                  </div>
                  {dummyChats.filter(c => !c.isOnline).map((chat, idx) => {
                    const realIdx = dummyChats.indexOf(chat);
                    const isAdded = selectedFriendsToAdd.includes(realIdx);
                    return (
                      <div
                        key={'offline-' + idx}
                        onClick={() => {
                          if (showAddIcons) {
                            const isAdded = selectedFriendsToAdd.includes(realIdx);
                            setSelectedFriendsToAdd(prev => isAdded ? prev.filter(i => i !== realIdx) : [...prev, realIdx]);
                          } else {
                            setActiveChatIdx(realIdx);
                            setIsChatInfoOpen(true);
                            setProfileViewIdx(null);
                            setIsCreatingGroup(false);
                            setSelectedFriendsToAdd([]);
                            setShowAddIcons(false);
                          }
                        }}
                        className={`relative group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors mb-1 ${isAdded ? 'bg-green-50 dark:bg-[#00B47A]/10 hover:bg-green-100 dark:hover:bg-[#00B47A]/20' : 'hover:bg-gray-200 dark:hover:bg-[#3A3B3C]'}`}
                      >
                        <div className="relative w-14 h-14 shrink-0">
                          <img
                            src="/default-avatar.svg"
                            className={`w-full h-full rounded-full object-cover transition-all ${isAdded ? 'border-2 border-[#00B47A]' : 'border border-emerald-600 dark:border-emerald-400'}`}
                          />
                          {isAdded && (
                            <div className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-[#00B47A] rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className={`font-semibold text-[15px] truncate ${isAdded ? 'text-[#00B47A]' : 'text-gray-500 dark:text-[#A8ABAF]'}`}>
                            {chat.name}
                          </h4>
                        </div>
                        {/* Hover Action Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="relative group/tooltip opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setProfileViewIdx(realIdx); setActiveChatIdx(null); setIsCreatingGroup(false); }}
                              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] hover:bg-[#E7F3FF] dark:hover:bg-[#183966] flex items-center justify-center text-gray-500 dark:text-[#B0B3B8] hover:text-[#1877F2] dark:hover:text-[#2D88FF] transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-800 dark:bg-[#E4E6EB] text-white dark:text-black text-[12px] font-medium px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                              {t('chat.profileInfo')}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-[#E4E6EB]"></div>
                            </div>
                          </div>
                          <div className={`relative group/tooltip transition-opacity ${showAddIcons ? 'opacity-100' : 'hidden'}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedFriendsToAdd(prev => isAdded ? prev.filter(i => i !== realIdx) : [...prev, realIdx]); }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAdded ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-gray-200 dark:bg-[#3A3B3C] hover:bg-[#E7F3FF] dark:hover:bg-[#183966] text-gray-500 dark:text-[#B0B3B8] hover:text-[#1877F2] dark:hover:text-[#2D88FF]'}`}
                            >
                              {isAdded
                                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              }
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-800 dark:bg-[#E4E6EB] text-white dark:text-black text-[12px] font-medium px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
                              {isAdded ? t('chat.removeFromList') : t('chat.addFriend')}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-[#E4E6EB]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Sticky Footer: Buat Grup — muncul kalau ada yang di-select */}
                {(selectedFriendsToAdd.length > 0 && !isCreatingGroup) && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-[#3E4042] bg-white dark:bg-[#242526] shrink-0">
                    <button
                      onClick={() => {
                        setIsCreatingGroup(true);
                        setActiveChatIdx(null);
                        setProfileViewIdx(null);
                      }}
                      className="w-full bg-[#1877F2] hover:bg-blue-600 text-white font-semibold text-[15px] py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      {t('chat.createGroupFromFriends')} ({selectedFriendsToAdd.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
      {/* Notification Popup Panel — positioned below navbar, right side */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        currentUser={currentUser}
        startWithMediaModal={startWithMediaModal}
        startWithTagModal={startWithTagModal}
      />

      {/* Product Modal */}
      {isProductModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsProductModalOpen(false)}
          />

          {/* Modal Content - 2 Columns */}
          <div className="relative bg-white dark:bg-[#242526] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]">

            {/* Left Column: Image / Video */}
            <div className="w-full md:w-1/2 bg-gray-100 dark:bg-[#18191A] flex items-center justify-center relative border-r border-gray-200 dark:border-[#3E4042]">
              {(() => {
                const url = selectedProduct.videoUrl || "";
                let isDirectVideo = false;
                let embedUrl = "";
                if (url) {
                  if (url.match(/\.(mp4|webm|ogg)$/i)) {
                    isDirectVideo = true;
                    embedUrl = url;
                  } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
                    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    if (match && match[1]) {
                      embedUrl = `https://www.youtube.com/embed/${match[1]}`;
                    }
                  } else if (url.includes("tiktok.com/")) {
                    const match = url.match(/video\/(\d+)/);
                    if (match && match[1]) {
                      embedUrl = `https://www.tiktok.com/embed/v2/${match[1]}`;
                    }
                  } else if (url.includes("vimeo.com")) {
                    const match = url.match(/vimeo\.com\/(?:.*#|.*\/)?(\d+)/);
                    if (match && match[1]) {
                      embedUrl = `https://player.vimeo.com/video/${match[1]}`;
                    }
                  }
                }

                return embedUrl ? (
                  <div className="w-full aspect-square md:aspect-auto md:h-full relative bg-black">
                    {isDirectVideo ? (
                      <video src={embedUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <iframe width="100%" height="100%" src={embedUrl} title="Video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-square md:aspect-auto md:h-full flex items-center justify-center p-8">
                    <svg className="w-24 h-24 text-gray-300 dark:text-[#4E4F50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                );
              })()}

              {/* Close button for mobile */}
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="absolute top-4 right-4 md:hidden p-2 rounded-full bg-black/40 hover:bg-black/60 text-white z-10 transition-colors backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Right Column: Info & Actions */}
            <div className="w-full md:w-1/2 flex flex-col max-h-[50vh] md:max-h-[85vh]">
              {/* Close button for desktop */}
              <div className="hidden md:flex justify-end p-4 pb-0">
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:px-6 md:pb-6 custom-scrollbar">
                {/* Store Row */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded bg-gray-100 dark:bg-[#3A3B3C] overflow-hidden shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <span className="text-[13px] font-medium text-gray-600 dark:text-[#B0B3B8] hover:underline hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">{selectedProduct.store}</span>
                </div>

                {/* Name */}
                <h1 className="font-bold text-[18px] md:text-[20px] text-black dark:text-[#E4E6EB] leading-snug mb-3">
                  {selectedProduct.name}
                </h1>

                {/* Badges */}
                {(selectedProduct.collection || selectedProduct.category) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedProduct.collection && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-md">
                        <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span className="text-[11px] font-medium text-orange-500">{selectedProduct.collection}</span>
                      </div>
                    )}
                    {selectedProduct.category && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        <span className="text-[11px] font-medium text-emerald-500">{selectedProduct.category}</span>
                      </div>
                    )}
                  </div>
                )}



                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1.5">Deskripsi Produk</h3>
                  <p className="text-[13px] text-gray-600 dark:text-[#B0B3B8] leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Reviews (Placeholder) */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[13px] font-bold text-gray-800 dark:text-white">{t("mydash.ulasan_pembeli") || "Ulasan Pembeli"}</h3>
                    <button className="text-[11px] text-emerald-500 font-medium hover:underline">{t("mydash.selengkapnya") || "Selengkapnya"}</button>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#18191A] rounded-xl p-3 border border-gray-200 dark:border-gray-800 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                    <div className="flex-1 mt-0.5">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="w-16 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        <div className="w-10 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <svg key={i} className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-1.5"></div>
                      <div className="w-3/4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  <button className="w-full mt-3 py-2.5 border border-gray-200 dark:border-gray-700/80 rounded-lg text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex justify-center items-center gap-1.5">
                    {t("mydash.tambah_ulasan_kamu") || "+Ulasan kamu"}
                  </button>
                </div>

                {/* Price */}
                <div className="flex items-end gap-3 mt-4 mb-2">
                  {selectedProduct.salePrice ? (
                    <>
                      <div className="text-[24px] font-bold text-emerald-500 leading-none">
                        Rp {Number(selectedProduct.salePrice.toString().replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[14px] text-gray-400 dark:text-[#B0B3B8] line-through mb-[2px]">
                        Rp {Number(selectedProduct.price?.toString().replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                      </div>
                    </>
                  ) : (
                    <div className="text-[24px] font-bold text-emerald-500 leading-none">
                      Rp {Number(selectedProduct.price?.toString().replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer CTA */}
              <div className="p-4 md:px-6 md:py-4 border-t border-gray-100 dark:border-[#3E4042] bg-white dark:bg-[#242526]">
                <div className="flex gap-2">
                  <button className="w-11 shrink-0 bg-white dark:bg-[#2A2B2C] hover:bg-gray-50 dark:hover:bg-[#3A3B3C] border border-gray-200 dark:border-gray-700/80 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                  <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors text-[14px] shadow-md shadow-emerald-500/20">
                    {selectedProduct.ctaType === "custom" && selectedProduct.customCta
                      ? selectedProduct.customCta
                      : (selectedProduct.ctaType ? t(`mydash.cta_${selectedProduct.ctaType}`) : t("product.buy_now"))}
                  </button>
                </div>
                <p className="text-center text-[11px] text-gray-400 dark:text-[#B0B3B8] mt-2">
                  {t("product.checkout_at")}{" "}
                  <span className="font-bold text-gray-500 dark:text-[#E4E6EB]">LYNK</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

