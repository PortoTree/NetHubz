"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { formatStarCount, RectLike } from "@/utils/projectStar";

interface ProjectStarButtonMobileProps {
  isStarred: boolean;
  starCount: number;
  isLoading?: boolean;
  isInteractionLoading?: boolean;
  onToggleStar: () => void;
  onOpenStargazers?: (rect: RectLike) => void;
}

export default function ProjectStarButtonMobile({
  isStarred,
  starCount,
  isLoading = false,
  isInteractionLoading = false,
  onToggleStar,
  onOpenStargazers,
}: ProjectStarButtonMobileProps) {
  const t = useTranslations("project");

  if (isInteractionLoading) {
    return (
      <div className="flex sm:hidden items-center gap-1 h-7 px-2 rounded-lg bg-gray-100 dark:bg-[#3A3B3C]/60 animate-pulse">
        <div className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-[#4E4F50]" />
        <div className="w-3 h-3 rounded bg-gray-200 dark:bg-[#4E4F50]" />
      </div>
    );
  }

  return (
    <div className="flex sm:hidden items-center gap-1 text-gray-500 dark:text-gray-400 font-medium text-[13px]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
        disabled={isLoading}
        className={`flex items-center gap-1 p-1.5 rounded-lg transition-all cursor-pointer ${
          isStarred
            ? "text-amber-600 bg-amber-500/10 dark:text-amber-400 hover:bg-amber-500/15"
            : "hover:bg-gray-100 hover:text-amber-600 dark:hover:bg-[#3A3B3C] dark:hover:text-amber-400"
        }`}
        title={isStarred ? (t("unstar") || "Batalkan Bintang") : (t("giveStar") || "Beri Bintang")}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 active:scale-125 ${
            isStarred ? "fill-amber-500 text-amber-500" : "fill-none stroke-current"
          }`}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      </button>

      {starCount > 0 && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenStargazers) {
              const rect = e.currentTarget.getBoundingClientRect();
              onOpenStargazers({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height,
              });
            }
          }}
          className="cursor-pointer hover:underline text-[#65676B] dark:text-[#B0B3B8] font-semibold text-[13px]"
          title={t("viewStargazers") || "Lihat pemberi bintang"}
        >
          {formatStarCount(starCount)}
        </span>
      )}
    </div>
  );
}
