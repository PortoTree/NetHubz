"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/app/actions/friends";
import { toggleBlock } from "@/app/actions/connections";
import FriendActionMenuDesktop from "@/components/friends/FriendActionMenuDesktop";
import RejectFriendRequestPopupDesktop from "@/components/friends/RejectFriendRequestPopupDesktop";
import BlockUserPopupDesktop from "@/components/friends/BlockUserPopupDesktop";
import { notifyConnectionChanged } from "@/utils/cache";
import { FriendSuggestionSkeleton } from "@/components/friends/FriendSkeletons";
import toast from "react-hot-toast";

interface RecentSearchItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface FriendSearchSidebarProps {
  currentUserId: string;
  token: string;
  locale: string;
  suggestions: any[];
  isLoading?: boolean;
  onAddFriendSuccess?: (userId: string) => void;
}

const STORAGE_KEY = "nethubz_recent_friend_searches";

export default function FriendSearchSidebar({
  currentUserId,
  token,
  locale,
  suggestions,
  isLoading = false,
  onAddFriendSuccess,
}: FriendSearchSidebarProps) {
  const t = useTranslations("friends");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [sendingRequests, setSendingRequests] = useState<Record<string, boolean>>({});
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Modal / Popup States
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
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
      console.error("Failed to load recent searches", e);
    }
  }, []);

  const saveRecentSearch = (item: RecentSearchItem) => {
    try {
      const filtered = recentSearches.filter((s) => s.id !== item.id);
      const updated = [item, ...filtered].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search", e);
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
      console.error("Failed to delete recent search", e);
    }
  };

  const clearAllRecent = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear recent searches", e);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const clean = query.trim();
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
  }, [query, currentUserId]);

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
          prev.map((u) => (u.id === targetId ? { ...u, relationship: "PENDING_OUTGOING" } : u))
        );
        if (onAddFriendSuccess) onAddFriendSuccess(targetId);
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    } finally {
      setSendingRequests((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!token) return;
    setProcessingIds((prev) => ({ ...prev, [requesterId]: true }));
    try {
      const res = await acceptFriendRequest(token, currentUserId, requesterId);
      if (res.success) {
        toast.success(t("toast.requestAccepted"));
        notifyConnectionChanged(currentUserId, requesterId);
        setSearchResults((prev) =>
          prev.map((u) => (u.id === requesterId ? { ...u, relationship: "ACCEPTED" } : u))
        );
        if (onAddFriendSuccess) onAddFriendSuccess(requesterId);
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    } finally {
      setProcessingIds((prev) => ({ ...prev, [requesterId]: false }));
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
        setSearchResults((prev) =>
          prev.map((u) => (u.id === rejectTarget.id ? { ...u, relationship: "NONE" } : u))
        );
        setRejectTarget(null);
        if (onAddFriendSuccess) onAddFriendSuccess(rejectTarget.id);
      } else {
        toast.error(res.error || t("toast.actionFailed"));
      }
    } catch (e) {
      toast.error(t("toast.actionFailed"));
    } finally {
      setIsSubmittingReject(false);
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
        setSearchResults((prev) => prev.filter((u) => u.id !== blockTarget.id));
        setBlockTarget(null);
        if (onAddFriendSuccess) onAddFriendSuccess(blockTarget.id);
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
    <div className="flex flex-col gap-6">
      {/* Search Input Box (Langsung pada body) */}
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#242526] text-gray-900 dark:text-[#E4E6EB] text-[14px] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 border border-gray-200 dark:border-[#3E4042] shadow-sm transition-all placeholder:text-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Content (Layout sama seperti milik list permintaan pertemanan) */}
      {query.trim().length > 0 ? (
        <div className="flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto sidebar-scrollbar">
          {isSearching ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-2.5 p-2 rounded-xl"
              >
                {/* Baris Atas: Info Profil + Menu Titik 3 */}
                <div className="flex items-center justify-between gap-2 w-full">
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
                    className="inline-flex items-center gap-2.5 min-w-0 w-fit group cursor-pointer"
                  >
                    <img
                      src={user.avatarUrl || "/default-avatar.svg"}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[13px] text-gray-900 dark:text-[#E4E6EB] truncate group-hover:underline">
                        {user.displayName}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-[#B0B3B8] truncate">
                        @{user.username}
                      </span>
                    </div>
                  </Link>

                  {/* Icon Titik 3 */}
                  <FriendActionMenuDesktop
                    user={user}
                    locale={locale}
                    onBlockPrompt={(u) => setBlockTarget(u)}
                  />
                </div>

                {/* Baris Bawah: 2 Tombol Sejajar dengan Model & Warna Berbeda */}
                <div className="flex items-center gap-2 w-full">
                  {/* Tombol Kiri */}
                  {user.relationship === "PENDING_INCOMING" ? (
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(user.id)}
                      disabled={processingIds[user.id]}
                      className="flex-1 py-1.5 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 rounded-xl transition-all shadow-sm select-none flex items-center justify-center gap-1.5"
                    >
                      {processingIds[user.id] ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {t("confirm")}
                        </>
                      )}
                    </button>
                  ) : user.relationship === "ACCEPTED" ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl select-none flex items-center justify-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {t("allFriends")}
                    </button>
                  ) : user.relationship === "PENDING_OUTGOING" ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-1.5 text-[12px] font-semibold text-gray-500 bg-gray-100 dark:bg-[#3A3B3C] rounded-xl select-none flex items-center justify-center"
                    >
                      {t("requestSent")}
                    </button>
                  ) : (
                    /* Model Tombol Follow: Emerald Green dengan Icon Plus */
                    <button
                      type="button"
                      onClick={(e) => handleSendRequest(user.id, e)}
                      disabled={sendingRequests[user.id]}
                      className="flex-1 py-1.5 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 rounded-xl transition-all shadow-sm select-none flex items-center justify-center gap-1.5"
                    >
                      {sendingRequests[user.id] ? (
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
                  )}

                  {/* Tombol Kanan */}
                  {user.relationship === "PENDING_INCOMING" ? (
                    /* Model Tombol Hapus: Solid Gray dengan Hover Rose Alert */
                    <button
                      type="button"
                      onClick={() => setRejectTarget(user)}
                      disabled={processingIds[user.id]}
                      className="flex-1 py-1.5 text-[12px] font-semibold text-gray-700 dark:text-[#E4E6EB] bg-gray-200/80 hover:bg-rose-50 hover:text-rose-600 dark:bg-[#3A3B3C] dark:hover:bg-rose-950/40 dark:hover:text-rose-400 active:scale-95 rounded-xl transition-all select-none flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {t("deleteRequest")}
                    </button>
                  ) : (
                    /* Model Tombol Lihat Profil: Bordered Outline Clean (Ghost Style) */
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
                      className="flex-1 py-1.5 text-[12px] font-semibold text-gray-700 dark:text-[#E4E6EB] border border-gray-300 dark:border-[#4E4F50] bg-transparent hover:bg-gray-100 dark:hover:bg-[#3A3B3C] active:scale-95 rounded-xl transition-all select-none flex items-center justify-center gap-1.5 text-center"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t("viewProfile")}
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-[13px] text-center text-gray-400 py-4">
              {t("noSearchResults")}
            </p>
          )}
        </div>
      ) : (
        /* Recent Searches (Idle State) - Langsung pada body */
        recentSearches.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1 mb-0.5">
              <span className="text-[12px] font-bold text-gray-400 dark:text-[#B0B3B8] uppercase tracking-wider">
                {t("recentSearches")}
              </span>
              <button
                type="button"
                onClick={clearAllRecent}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                {t("clearAll")}
              </button>
            </div>

            <div className="flex flex-col gap-0.5">
              {recentSearches.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl"
                >
                  <Link
                    href={`/${locale}/p/${item.username}/${item.id}`}
                    className="inline-flex items-center gap-2.5 min-w-0 w-fit group cursor-pointer"
                  >
                    <img
                      src={item.avatarUrl || "/default-avatar.svg"}
                      alt={item.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[13px] text-gray-800 dark:text-[#E4E6EB] truncate group-hover:underline">
                        {item.displayName}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate">
                        @{item.username}
                      </span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => removeRecentSearch(item.id, e)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-[#4E4F50] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Friend Suggestions Section (Langsung pada body) */}
      {(isLoading || suggestions.length > 0) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="font-bold text-[16px] text-gray-900 dark:text-[#E4E6EB]">
              {t("suggestions")}
            </h4>
          </div>

          <div className="flex flex-col gap-1.5">
            {isLoading ? (
              <>
                <FriendSuggestionSkeleton />
                <FriendSuggestionSkeleton />
                <FriendSuggestionSkeleton />
                <FriendSuggestionSkeleton />
              </>
            ) : (
              suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-2xl"
                >
                  <Link
                    href={`/${locale}/p/${sug.username}/${sug.id}`}
                    className="inline-flex items-center gap-2.5 min-w-0 w-fit group cursor-pointer"
                  >
                    <img
                      src={sug.avatarUrl || "/default-avatar.svg"}
                      alt={sug.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-[#3E4042] shrink-0 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[13px] text-gray-900 dark:text-[#E4E6EB] truncate group-hover:underline">
                        {sug.displayName}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate">
                        {sug.profession || `@${sug.username}`}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleSendRequest(sug.id, e)}
                      disabled={sendingRequests[sug.id]}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 transition-all shadow-sm select-none flex items-center gap-1.5"
                    >
                      {sendingRequests[sug.id] ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>{t("follow")}</span>
                        </>
                      )}
                    </button>

                    <FriendActionMenuDesktop
                      user={sug}
                      locale={locale}
                      onBlockPrompt={(u) => setBlockTarget(u)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reject Confirmation Popup */}
      <RejectFriendRequestPopupDesktop
        isOpen={!!rejectTarget}
        targetUser={rejectTarget}
        isSubmitting={isSubmittingReject}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />

      {/* Block Confirmation Popup */}
      <BlockUserPopupDesktop
        isOpen={!!blockTarget}
        targetUser={blockTarget}
        isSubmitting={isSubmittingBlock}
        onClose={() => setBlockTarget(null)}
        onConfirm={handleConfirmBlock}
      />
    </div>
  );
}
