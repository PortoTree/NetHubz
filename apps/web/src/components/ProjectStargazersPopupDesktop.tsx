"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { getLikers } from "@/app/actions/interactions";
import { getOptimizedUrl } from "@/utils/cloudinary";
import {
  calculatePopoverPosition,
  RectLike,
  getStargazersFromCache,
  setStargazersToCache,
} from "@/utils/projectStar";

export interface ProjectStargazersPopupDesktopProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  anchorRect?: RectLike | null;
}

export default function ProjectStargazersPopupDesktop({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  anchorRect,
}: ProjectStargazersPopupDesktopProps) {
  const t = useTranslations("project");
  const locale = useLocale();

  const [users, setUsers] = useState<any[]>(() => {
    return projectId ? getStargazersFromCache(projectId) || [] : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return projectId ? !getStargazersFromCache(projectId) : true;
  });
  const [mounted, setMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    let isMounted = true;
    const cachedUsers = getStargazersFromCache(projectId);

    if (cachedUsers) {
      setUsers(cachedUsers);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    getLikers(projectId, "PROJECT", 50)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.likers) {
          const freshUsers = res.likers.map((l: any) => l.user).filter(Boolean);
          setUsers(freshUsers);
          setStargazersToCache(projectId, freshUsers);
        } else if (!cachedUsers) {
          setUsers([]);
        }
      })
      .catch(() => {
        if (isMounted && !cachedUsers) setUsers([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  // Click outside and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const defaultAnchor: RectLike = anchorRect || {
    top: typeof window !== "undefined" ? window.innerHeight / 2 - 20 : 200,
    bottom: typeof window !== "undefined" ? window.innerHeight / 2 + 20 : 240,
    left: typeof window !== "undefined" ? window.innerWidth / 2 - 20 : 200,
    right: typeof window !== "undefined" ? window.innerWidth / 2 + 20 : 240,
    width: 40,
    height: 40,
  };

  const pos = calculatePopoverPosition(
    defaultAnchor,
    { width: 280, height: 240 },
    {
      innerWidth: typeof window !== "undefined" ? window.innerWidth : 1024,
      innerHeight: typeof window !== "undefined" ? window.innerHeight : 768,
    }
  );

  return createPortal(
    <div
      ref={popupRef}
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        transform: pos.transform,
      }}
      className={`hidden sm:flex fixed z-[999999] w-[280px] flex-col bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-gray-200/80 dark:border-[#3E4042] p-3 text-left duration-150 select-none ${
        pos.placement === "top"
          ? "animate-in fade-in slide-in-from-bottom-1"
          : "animate-in fade-in slide-in-from-top-1"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow Caret pointing to star button */}
      {pos.placement === "top" ? (
        <div
          className="absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-[#242526] border-b border-r border-gray-200/80 dark:border-[#3E4042] pointer-events-none"
          style={{ left: `${pos.arrowLeft}px`, transform: "translateX(-50%) rotate(45deg)" }}
        />
      ) : (
        <div
          className="absolute -top-1.5 w-3 h-3 bg-white dark:bg-[#242526] border-t border-l border-gray-200/80 dark:border-[#3E4042] pointer-events-none"
          style={{ left: `${pos.arrowLeft}px`, transform: "translateX(-50%) rotate(45deg)" }}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-[#3A3B3C]">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src="/star-label.svg"
            alt={t("stars") || "Stars"}
            className="w-4 h-4 object-contain dark:invert shrink-0"
          />
          <h4 className="text-[13px] font-bold text-gray-800 dark:text-[#E4E6EB] truncate">
            {t("stargazersTitle") || "Daftar Bintang"}
          </h4>
          {!isLoading && users.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {users.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer"
          title={t("close") || "Close"}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User List */}
      <div className="max-h-[240px] overflow-y-auto no-scrollbar flex flex-col gap-1">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 animate-pulse p-1">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-24" />
                  <div className="h-2.5 bg-gray-200 dark:bg-[#3A3B3C] rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-6 px-3 text-center text-gray-500 dark:text-[#B0B3B8] text-[12px]">
            <p>{t("noStarsYet") || "Belum ada bintang untuk proyek ini."}</p>
          </div>
        ) : (
          users.map((u, idx) => {
            const rawAvatar = u.profile?.avatarUrl || u.avatarUrl || u.avatar;
            const avatar = rawAvatar ? getOptimizedUrl(rawAvatar, "thumb") : null;
            const displayName = u.profile?.displayName || u.username;
            const itemKey = u.id || u.username || idx;

            return (
              <Link
                key={itemKey}
                href={`/${locale}/project/${u.username}`}
                onClick={onClose}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors group cursor-pointer"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                    }}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100 dark:border-[#3E4042]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-[12px] shrink-0">
                    {displayName[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] font-semibold text-gray-800 dark:text-[#E4E6EB] group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate leading-tight transition-colors">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                    @{u.username}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );
}
