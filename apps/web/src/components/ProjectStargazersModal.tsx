"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { getLikers } from "@/app/actions/interactions";
import { getOptimizedUrl } from "@/utils/cloudinary";

interface ProjectStargazersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
}

export default function ProjectStargazersModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
}: ProjectStargazersModalProps) {
  const t = useTranslations("project");
  const locale = useLocale();

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    let isMounted = true;
    setIsLoading(true);

    getLikers(projectId, "PROJECT", 50).then((res) => {
      if (!isMounted) return;
      if (res.success && res.likers) {
        setUsers(res.likers.map((l: any) => l.user).filter(Boolean));
      } else {
        setUsers([]);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#3A3B3C] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#3A3B3C]">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB] text-base truncate">
              {t("stargazersTitle") || "Daftar Bintang"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body list */}
        <div className="p-3 overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-[#3A3B3C]">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-28" />
                    <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-[#B0B3B8]">
              {t("noStarsYet") || "Belum ada bintang untuk proyek ini."}
            </div>
          ) : (
            users.map((u) => {
              const displayName = u.profile?.displayName || u.username;
              const avatar = u.profile?.avatarUrl
                ? getOptimizedUrl(u.profile.avatarUrl, "avatar")
                : "/default-avatar.svg";

              return (
                <Link
                  key={u.id}
                  href={`/${locale}/p/${u.username}/${u.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#3A3B3C] transition-colors"
                >
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 dark:border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-[#E4E6EB] truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#B0B3B8] truncate">
                      @{u.username}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
