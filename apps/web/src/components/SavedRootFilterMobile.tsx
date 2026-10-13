"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { SavedFilterType } from "./SavedRootFilterDesktop";

interface SavedRootFilterMobileProps {
  activeFilter: SavedFilterType;
  onFilterChange: (filter: SavedFilterType) => void;
}

export default function SavedRootFilterMobile({
  activeFilter,
  onFilterChange,
}: SavedRootFilterMobileProps) {
  const t = useTranslations("savedPage");
  const [isOpen, setIsOpen] = useState(false);

  const getFilterLabel = (type: SavedFilterType) => {
    if (type === "post") return t("filterPosts") || "Postingan";
    if (type === "project") return t("filterProjects") || "Proyek";
    return t("filterAll") || "Semua";
  };

  const options: { type: SavedFilterType; label: string }[] = [
    { type: "all", label: t("filterAll") || "Semua" },
    { type: "post", label: t("filterPosts") || "Postingan" },
    { type: "project", label: t("filterProjects") || "Proyek" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#3A3B3C] text-gray-700 dark:text-[#E4E6EB] border border-gray-200/80 dark:border-[#4E4F50]/80 shadow-xs cursor-pointer select-none active:scale-90 active:bg-gray-200 dark:active:bg-[#4E4F50] transition-all duration-150"
        title="Filter item"
        aria-label="Filter item"
      >
        <svg
          className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span>{getFilterLabel(activeFilter)}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay untuk tap di luar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popup Dropdown ke Bawah */}
          <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-[#242526] rounded-xl shadow-xl border border-gray-200 dark:border-[#3E4042] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            {options.map((opt) => {
              const isSelected = activeFilter === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    onFilterChange(opt.type);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-left transition-all duration-150 active:scale-[0.98] select-none ${
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold"
                      : "text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] active:bg-gray-100 dark:active:bg-[#3A3B3C]"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg
                      className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
