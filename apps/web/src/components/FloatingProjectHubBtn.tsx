"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export default function FloatingProjectHubBtn({
  customHref,
  customText,
  variant = "default",
}: {
  customHref?: string;
  customText?: string;
  variant?: "default" | "with-dropdown";
}) {
  const t = useTranslations();
  const locale = useLocale();
  
  const targetHref = customHref || `/${locale}/project`;

  if (variant === "default") {
    return (
      <Link 
        href={targetHref}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[9999] flex items-center bg-white dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] shadow-[0_2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.5)] rounded-full h-9 sm:h-10 group overflow-hidden border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#4E4F50] transition-colors"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center">
          <img src="/navigasi/project.svg" alt="Project Hub" className="w-4 h-4 sm:w-5 sm:h-5 object-contain dark:invert" />
        </div>
        <div className="flex items-center overflow-hidden transition-all duration-300 max-w-0 group-hover:max-w-[200px]">
          <span className="font-bold text-[13px] sm:text-[14px] truncate pr-3.5 sm:pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
            {customText || t("projectHub") || "Project Hub"}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[9999] flex flex-col group/parent items-start">
      {/* Top Button: Back / User Projects */}
      <Link 
        href={targetHref}
        className="flex items-center bg-white dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] shadow-[0_2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.5)] rounded-full h-9 sm:h-10 group/back overflow-hidden border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#4E4F50] transition-colors w-fit"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </div>
        <div className="flex items-center overflow-hidden transition-all duration-300 max-w-0 group-hover/back:max-w-[200px]">
          <span className="font-bold text-[13px] sm:text-[14px] truncate pr-3.5 sm:pr-4 opacity-0 group-hover/back:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap">
            {customText || t("projectHub") || "Project Hub"}
          </span>
        </div>
      </Link>

      {/* Bottom Button: Global Project Hub (Appears when parent is hovered) */}
      <div className="overflow-hidden transition-all duration-300 max-h-0 opacity-0 group-hover/parent:max-h-[60px] group-hover/parent:opacity-100 group-hover/parent:mt-2 sm:group-hover/parent:mt-3">
        <Link 
          href={`/${locale}/project`}
          className="flex items-center bg-white dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] shadow-[0_2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.5)] rounded-full h-9 sm:h-10 group/hub overflow-hidden border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#4E4F50] transition-colors w-fit"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center">
            <img src="/navigasi/project.svg" alt="Project Hub" className="w-4 h-4 sm:w-5 sm:h-5 object-contain dark:invert" />
          </div>
          <div className="flex items-center overflow-hidden transition-all duration-300 max-w-0 group-hover/hub:max-w-[200px]">
            <span className="font-bold text-[13px] sm:text-[14px] truncate pr-3.5 sm:pr-4 opacity-0 group-hover/hub:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap">
              {t("projectHub") || "Project Hub"}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
