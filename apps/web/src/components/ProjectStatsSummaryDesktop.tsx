"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface ProjectStatsSummaryDesktopProps {
  projectCount: number;
  reactionCount: number;
  commentCount: number;
}

export default function ProjectStatsSummaryDesktop({
  projectCount,
  reactionCount,
  commentCount,
}: ProjectStatsSummaryDesktopProps) {
  const t = useTranslations("project");

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

      {/* Reaction Count */}
      <div className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors">
        <img
          src="/react.svg"
          alt="Reactions"
          className="w-4 h-4 object-contain dark:invert opacity-90"
        />
        <span>{t("statsReactions", { count: reactionCount })}</span>
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
