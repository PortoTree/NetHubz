"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import FriendCardDesktop from "@/components/friends/FriendCardDesktop";
import FriendRequestItem from "@/components/friends/FriendRequestItem";
import FriendSearchSidebar from "@/components/friends/FriendSearchSidebar";
import RejectFriendRequestPopupDesktop from "@/components/friends/RejectFriendRequestPopupDesktop";
import BlockUserPopupDesktop from "@/components/friends/BlockUserPopupDesktop";
import { acceptFriendRequest, rejectFriendRequest, unfriend } from "@/app/actions/friends";
import { toggleBlock } from "@/app/actions/connections";
import { notifyConnectionChanged } from "@/utils/cache";
import { FriendCardSkeletonDesktop, FriendRequestSkeleton } from "@/components/friends/FriendSkeletons";
import toast from "react-hot-toast";

interface FriendPageDesktopProps {
  currentUserId: string;
  token: string;
  locale: string;
  friends: any[];
  requests: any[];
  suggestions: any[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export default function FriendPageDesktop({
  currentUserId,
  token,
  locale,
  friends,
  requests,
  suggestions,
  isLoading = false,
  onRefresh,
}: FriendPageDesktopProps) {
  const t = useTranslations("friends");

  // Center mode: "FRIENDS" or "FULL_REQUESTS"
  const [viewMode, setViewMode] = useState<"FRIENDS" | "FULL_REQUESTS">("FRIENDS");

  // Reject confirmation popup state
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Block confirmation popup state
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

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

  // Quick requests for right sidebar (max 7)
  const MAX_QUICK_REQUESTS = 7;
  const quickRequests = requests.slice(0, MAX_QUICK_REQUESTS);

  return (
    <div className="w-full min-h-screen">
      {/* 3 Columns Layout: Left & Right Sidebars fixed to edges, Center Content flexible */}
      
      {/* KOLOM KIRI: Fixed menempel di sebelah mini nav (left-[72px]) */}
      <aside className="hidden lg:flex flex-col fixed left-[72px] top-[56px] w-[320px] h-[calc(100vh-56px)] z-10">
        <div className="flex-1 overscroll-contain overflow-y-auto pt-6 px-4 pb-6 sidebar-scrollbar">
          <FriendSearchSidebar
            currentUserId={currentUserId}
            token={token}
            locale={locale}
            suggestions={suggestions}
            isLoading={isLoading}
            onAddFriendSuccess={onRefresh}
          />
        </div>
      </aside>

      {/* KOLOM KANAN: Fixed menempel di tepi kanan layar (right-0) - di-hide saat mode permintaan lengkap */}
      {viewMode !== "FULL_REQUESTS" && (
        <aside className="hidden lg:flex flex-col fixed right-0 top-[56px] w-[320px] h-[calc(100vh-56px)] z-10">
          <div className="flex-1 overscroll-contain overflow-y-auto pt-6 px-4 pb-6 sidebar-scrollbar flex flex-col gap-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="font-bold text-[16px] text-gray-900 dark:text-[#E4E6EB]">
                {t("requests")}
              </h3>
              {!isLoading && requests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  {requests.length}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2.5">
                <FriendRequestSkeleton isCompact={true} />
                <FriendRequestSkeleton isCompact={true} />
                <FriendRequestSkeleton isCompact={true} />
              </div>
            ) : requests.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {quickRequests.map((req) => (
                  <FriendRequestItem
                    key={req.id}
                    request={req}
                    locale={locale}
                    isCompact={true}
                    onAccept={handleAccept}
                    onRejectPrompt={(u) => setRejectTarget(u)}
                    onBlockPrompt={(u) => setBlockTarget(u)}
                  />
                ))}

                {requests.length > MAX_QUICK_REQUESTS && (
                  <button
                    type="button"
                    onClick={() => setViewMode("FULL_REQUESTS")}
                    className="w-full py-2.5 text-center text-[13px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-gray-200/50 dark:hover:bg-[#242526] rounded-xl transition-colors"
                  >
                    {t("seeAll")} ({requests.length})
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 text-center py-6">
                {t("noRequests")}
              </p>
            )}
          </div>
        </aside>
      )}

      {/* AREA TENGAH: Tetap konsisten di antara kedua batas sidebar (lebar tidak kedorong) */}
      <main className="lg:ml-[392px] lg:mr-[320px] min-h-[calc(100vh-56px)] pt-6 px-6 pb-16 flex justify-center">
        <div className="w-full max-w-[850px] flex flex-col gap-5">
          {viewMode === "FRIENDS" ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#3E4042]">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-[22px] font-bold text-gray-900 dark:text-[#E4E6EB]">
                    {t("allFriends")}
                  </h1>
                  {!isLoading && (
                    <span className="text-[14px] font-semibold text-gray-400">
                      ({friends.length})
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Kolom Friendlist */}
              {isLoading ? (
                <div className="grid grid-cols-1 min-[1340px]:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <FriendCardSkeletonDesktop key={i} />
                  ))}
                </div>
              ) : friends.length > 0 ? (
                <div className="grid grid-cols-1 min-[1340px]:grid-cols-2 gap-4">
                  {friends.map((friend) => (
                    <FriendCardDesktop
                      key={friend.id}
                      friend={friend}
                      locale={locale}
                      onUnfriend={handleUnfriend}
                      onBlockPrompt={(u) => setBlockTarget(u)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-14 text-center bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3E4042] shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-[16px] text-gray-900 dark:text-[#E4E6EB] mb-1">
                    {t("noFriends")}
                  </h3>
                </div>
              )}
            </>
          ) : (
            /* Mode Permintaan Teman Penuh (Triggered dari "Lihat Semua") */
            <>
              {/* Header Kembali */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#3E4042]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode("FRIENDS")}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-gray-600 dark:text-[#E4E6EB] transition-colors"
                    title={t("backToAll")}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-[22px] font-bold text-gray-900 dark:text-[#E4E6EB]">
                      {t("requests")}
                    </h1>
                    {!isLoading && (
                      <span className="text-[14px] font-semibold text-gray-400">
                        ({requests.length})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid Kolom Permintaan Teman Lengkap */}
              {isLoading ? (
                <div className="grid grid-cols-1 min-[1340px]:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <FriendRequestSkeleton key={i} isCompact={false} />
                  ))}
                </div>
              ) : requests.length > 0 ? (
                <div className="grid grid-cols-1 min-[1340px]:grid-cols-2 gap-4">
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
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3E4042]">
                  <p className="text-gray-400 font-medium">
                    {t("noRequests")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Popup Konfirmasi Tolak Teman (Desktop) */}
      <RejectFriendRequestPopupDesktop
        isOpen={!!rejectTarget}
        targetUser={rejectTarget}
        isSubmitting={isSubmittingReject}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />

      {/* Popup Konfirmasi Blokir User (Desktop) */}
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
