"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface ProjectStatsSummaryDesktopProps {
  projectCount: number;
  starCount: number;
  commentCount: number;
  isLoading?: boolean;
}

export default function ProjectStatsSummaryDesktop({
  projectCount,
  starCount,
  commentCount,
  isLoading = false,
}: ProjectStatsSummaryDesktopProps) {
  const t = useTranslations("project");

  if (isLoading) {
    return (
      <div className="hidden sm:flex items-center justify-center gap-3 text-sm text-gray-600 dark:text-[#B0B3B8] font-medium max-w-2xl mx-auto">
        {/* Project Count Skeleton */}
        <div className="flex items-center gap-1.5 animate-pulse">
          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
          <div className="w-16 h-4 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
        </div>

        <span className="text-gray-300 dark:text-gray-600 select-none">•</span>

        {/* Star Count Skeleton */}
        <div className="flex items-center gap-1.5 animate-pulse">
          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
          <div className="w-14 h-4 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
        </div>

        <span className="text-gray-300 dark:text-gray-600 select-none">•</span>

        {/* Comment Count Skeleton */}
        <div className="flex items-center gap-1.5 animate-pulse">
          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
          <div className="w-20 h-4 rounded bg-gray-200 dark:bg-[#3A3B3C]" />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex items-center justify-center gap-3 text-sm text-gray-600 dark:text-[#B0B3B8] font-medium max-w-2xl mx-auto">
      {/* Project Count */}
      <div className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors">
        <img
          src="/navigasi/project-aktif.svg"
          alt="Projects"
          className="w-4 h-4 object-contain dark:invert opacity-90"
        />
        <span>{t("statsProjects", { count: projectCount })}</span>
      </div>

      <span className="text-gray-300 dark:text-gray-600 select-none">•</span>

      {/* Star Count */}
      <div className="flex items-center gap-1.5 hover:text-amber-500 transition-colors">
        <img
          src="/star-label.svg"
          alt="Stars"
          className="w-4 h-4 object-contain dark:invert opacity-90 shrink-0"
        />
        <span>{t("statsStars", { count: starCount })}</span>
      </div>

      <span className="text-gray-300 dark:text-gray-600 select-none">•</span>

      {/* Comment Count */}
      <div className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors">
        <svg
          className="w-4 h-4 text-gray-600 dark:text-[#B0B3B8] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>{t("statsComments", { count: commentCount })}</span>
      </div>
    </div>
  );
}
