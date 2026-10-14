"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import FriendCardMobile from "@/components/friends/FriendCardMobile";
import FriendRequestItem from "@/components/friends/FriendRequestItem";
import RejectFriendRequestPopupMobile from "@/components/friends/RejectFriendRequestPopupMobile";
import BlockUserPopupMobile from "@/components/friends/BlockUserPopupMobile";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
  sendFriendRequest,
  searchUsers,
} from "@/app/actions/friends";
import { toggleBlock } from "@/app/actions/connections";
import { notifyConnectionChanged } from "@/utils/cache";
import { FriendCardSkeletonMobile } from "@/components/friends/FriendSkeletons";
import toast from "react-hot-toast";

interface FriendPageMobileProps {
  currentUserId: string;
  token: string;
  locale: string;
  friends: any[];
  requests: any[];
  suggestions: any[];
  isLoading?: boolean;
  onRefresh: () => void;
}

const STORAGE_KEY = "nethubz_recent_friend_searches";

export default function FriendPageMobile({
  currentUserId,
  token,
  locale,
  friends,
  requests,
  suggestions,
  isLoading = false,
  onRefresh,
}: FriendPageMobileProps) {
  const t = useTranslations("friends");

  // Active top tab
  const [activeTab, setActiveTab] = useState<"ALL" | "REQUESTS" | "SUGGESTIONS">("ALL");

  // Mobile search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [sendingRequests, setSendingRequests] = useState<Record<string, boolean>>({});
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Reject confirmation popup state
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Block confirmation popup state
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveRecentSearch = (item: any) => {
    try {
      const filtered = recentSearches.filter((s) => s.id !== item.id);
      const updated = [item, ...filtered].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const updated = recentSearches.filter((s) => s.id !== id);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllRecent = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      const res = await searchUsers(clean, currentUserId);
      if (res.success && res.data) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, currentUserId]);

  const handleSendRequest = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!token) return;

    setSendingRequests((prev) => ({ ...prev, [targetId]: true }));
    try {
      const res = await sendFriendRequest(token, currentUserId, targetId);
      if (res.success) {
        toast.success(t("toast.requestSent"));
        notifyConnectionChanged(currentUserId, targetId);
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === targetId ? { ...u, relationship: "PENDING_OUTGOING" } : u
          )
        );
        onRefresh();
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    } finally {
      setSendingRequests((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleAccept = async (requesterId: string) => {
    if (!token) return;
    try {
      const res = await acceptFriendRequest(token, currentUserId, requesterId);
      if (res.success) {
        toast.success(t("toast.requestAccepted"));
        notifyConnectionChanged(currentUserId, requesterId);
        onRefresh();
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    }
  };

  const handleConfirmReject = async () => {
    if (!token || !rejectTarget) return;
    setIsSubmittingReject(true);
    try {
      const res = await rejectFriendRequest(token, currentUserId, rejectTarget.id);
      if (res.success) {
        toast.success(t("toast.requestRejected"));
        notifyConnectionChanged(currentUserId, rejectTarget.id);
        setRejectTarget(null);
        onRefresh();
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!token) return;
    try {
      const res = await unfriend(token, currentUserId, friendId);
      if (res.success) {
        toast.success(t("toast.unfriended"));
        notifyConnectionChanged(currentUserId, friendId);
        onRefresh();
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    }
  };

  const handleConfirmBlock = async () => {
    if (!token || !blockTarget) return;
    setIsSubmittingBlock(true);
    try {
      const res = await toggleBlock(token, currentUserId, blockTarget.id);
      if (res.success) {
        toast.success(t("toast.blocked"));
        notifyConnectionChanged(currentUserId, blockTarget.id);
        setBlockTarget(null);
        onRefresh();
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-56px)] pb-24 flex flex-col">
      {/* Top Header Sticky */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#18191A]/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-gray-100 dark:border-[#3E4042]/50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-gray-900 dark:text-[#E4E6EB]">
            {t("title")}
          </h1>
          <span className="text-[13px] font-semibold text-gray-400">
            {friends.length} {t("allFriends").toLowerCase()}
          </span>
        </div>

        {/* Mobile Search Bar */}
        <div className="relative flex items-center">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-10 pr-9 py-2 bg-gray-100 dark:bg-[#242526] text-gray-900 dark:text-[#E4E6EB] text-[14px] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-500 transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-gray-400 active:scale-90 transition-transform select-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 3 Top Segmented Tabs/Pills with Touch Feedback */}
        {!searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {/* Tab 1: Semua Teman */}
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-transform duration-150 select-none flex items-center gap-1.5 ${
                activeTab === "ALL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-[#242526] text-gray-700 dark:text-[#E4E6EB]"
              }`}
            >
              <span>{t("allFriends")}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                activeTab === "ALL" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#3A3B3C] text-gray-600 dark:text-gray-400"
              }`}>
                {friends.length}
              </span>
            </button>

            {/* Tab 2: Permintaan */}
            <button
              type="button"
              onClick={() => setActiveTab("REQUESTS")}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-transform duration-150 select-none flex items-center gap-1.5 ${
                activeTab === "REQUESTS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-[#242526] text-gray-700 dark:text-[#E4E6EB]"
              }`}
            >
              <span>{t("requests")}</span>
              {requests.length > 0 && (
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "REQUESTS" ? "bg-white text-blue-600" : "bg-rose-500 text-white"
                }`}>
                  {requests.length}
                </span>
              )}
            </button>

            {/* Tab 3: Saran */}
            <button
              type="button"
              onClick={() => setActiveTab("SUGGESTIONS")}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap active:scale-95 transition-transform duration-150 select-none flex items-center gap-1.5 ${
                activeTab === "SUGGESTIONS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-[#242526] text-gray-700 dark:text-[#E4E6EB]"
              }`}
            >
              <span>{t("suggestions")}</span>
              {suggestions.length > 0 && (
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "SUGGESTIONS" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-[#3A3B3C] text-gray-600 dark:text-gray-400"
                }`}>
                  {suggestions.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 px-4 pt-3 flex flex-col gap-3">
        {/* Search Mode Active */}
        {searchQuery.trim().length > 0 ? (
          <div className="flex flex-col gap-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="bg-white dark:bg-[#242526] rounded-2xl p-3 border border-gray-100 dark:border-[#3E4042] shadow-sm flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/${locale}/p/${user.username}/${user.id}`}
                    onClick={() =>
                      saveRecentSearch({
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        avatarUrl: user.avatarUrl,
                      })
                    }
                    className="inline-flex items-center gap-3 min-w-0 w-fit group cursor-pointer active:scale-[0.98] transition-transform select-none"
                  >
                    <img
                      src={user.avatarUrl || "/default-avatar.svg"}
                      alt={user.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[14px] text-gray-900 dark:text-[#E4E6EB] truncate group-hover:underline">
                        {user.displayName}
                      </span>
                      <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
                        @{user.username}
                      </span>
                    </div>
                  </Link>

                  <div className="shrink-0">
                    {user.relationship === "ACCEPTED" ? (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                        {t("allFriends")}
                      </span>
                    ) : user.relationship === "PENDING_OUTGOING" ? (
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-[#3A3B3C] px-2.5 py-1 rounded-xl">
                        {t("requestSent")}
                      </span>
                    ) : user.relationship === "PENDING_INCOMING" ? (
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-xl">
                        {t("requests")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSendRequest(user.id, e)}
                        disabled={sendingRequests[user.id]}
                        className="px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 active:scale-95 rounded-xl transition-transform select-none flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t("addFriend")}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[14px] text-center text-gray-400 py-10">
                {t("noSearchResults")}
              </p>
            )}
          </div>
        ) : (
          /* Normal Tab Mode */
          <>
            {/* Recent Searches Header (if exists) */}
            {recentSearches.length > 0 && activeTab === "ALL" && (
              <div className="bg-white dark:bg-[#242526] rounded-2xl p-3 border border-gray-100 dark:border-[#3E4042] shadow-sm flex flex-col gap-2 mb-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold text-gray-400 dark:text-[#B0B3B8] uppercase tracking-wider">
                    {t("recentSearches")}
                  </span>
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="text-[11px] font-semibold text-blue-600 active:scale-95 transition-transform select-none"
                  >
                    {t("clearAll")}
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {recentSearches.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${locale}/p/${item.username}/${item.id}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-[#18191A] rounded-full border border-gray-100 dark:border-[#3E4042] shrink-0 active:scale-95 transition-transform select-none"
                    >
                      <img
                        src={item.avatarUrl || "/default-avatar.svg"}
                        alt={item.displayName}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-[12px] font-medium text-gray-800 dark:text-[#E4E6EB] max-w-[90px] truncate">
                        {item.displayName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(item.id, e)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 1: SEMUA TEMAN */}
            {activeTab === "ALL" && (
              isLoading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FriendCardSkeletonMobile key={i} />
                  ))}
                </div>
              ) : friends.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {friends.map((friend) => (
                    <FriendCardMobile
                      key={friend.id}
                      friend={friend}
                      locale={locale}
                      onUnfriend={handleUnfriend}
                      onBlockPrompt={(u) => setBlockTarget(u)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3E4042] mt-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-gray-800 dark:text-[#E4E6EB]">
                    {t("noFriends")}
                  </p>
                </div>
              )
            )}

            {/* TAB 2: PERMINTAAN */}
            {activeTab === "REQUESTS" && (
              isLoading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FriendCardSkeletonMobile key={i} />
                  ))}
                </div>
              ) : requests.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {requests.map((req) => (
                    <FriendRequestItem
                      key={req.id}
                      request={req}
                      locale={locale}
                      isCompact={false}
                      onAccept={handleAccept}
                      onRejectPrompt={(u) => setRejectTarget(u)}
                      onBlockPrompt={(u) => setBlockTarget(u)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3E4042] mt-4">
                  <p className="text-[14px] text-gray-400 font-medium">
                    {t("noRequests")}
                  </p>
                </div>
              )
            )}

            {/* TAB 3: SARAN TEMAN */}
            {activeTab === "SUGGESTIONS" && (
              isLoading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FriendCardSkeletonMobile key={i} />
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="bg-white dark:bg-[#242526] rounded-2xl p-3.5 border border-gray-100 dark:border-[#3E4042] shadow-sm flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/${locale}/p/${sug.username}/${sug.id}`}
                        className="inline-flex items-center gap-3 min-w-0 w-fit group cursor-pointer active:scale-[0.98] transition-transform select-none"
                      >
                        <img
                          src={sug.avatarUrl || "/default-avatar.svg"}
                          alt={sug.displayName}
                          className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[14px] text-gray-900 dark:text-[#E4E6EB] truncate group-hover:underline">
                            {sug.displayName}
                          </span>
                          <span className="text-[12px] text-gray-500 dark:text-[#B0B3B8] truncate">
                            {sug.profession || `@${sug.username}`}
                          </span>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => handleSendRequest(sug.id, e)}
                        disabled={sendingRequests[sug.id]}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[12px] font-semibold active:scale-95 transition-all shadow-sm select-none flex items-center gap-1 shrink-0"
                      >
                        {sendingRequests[sug.id] ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            {t("follow")}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3E4042] mt-4">
                  <p className="text-[14px] text-gray-400 font-medium">
                    {t("noSuggestions")}
                  </p>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Popup Konfirmasi Tolak Teman (Mobile) */}
      <RejectFriendRequestPopupMobile
        isOpen={!!rejectTarget}
        targetUser={rejectTarget}
        isSubmitting={isSubmittingReject}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />

      {/* Popup Konfirmasi Blokir User (Mobile) */}
      <BlockUserPopupMobile
        isOpen={!!blockTarget}
        targetUser={blockTarget}
        isSubmitting={isSubmittingBlock}
        onClose={() => setBlockTarget(null)}
        onConfirm={handleConfirmBlock}
      />
    </div>
  );
}
