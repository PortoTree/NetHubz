"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

interface Shortcut {
  id: string;
  name: string;
  image: string;
  type: "group" | "page" | "game";
  hasUpdates?: boolean;
}

const MOCK_SHORTCUTS: Shortcut[] = [
  {
    id: "1",
    name: "UI/UX Designers Indonesia",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=100&auto=format&fit=crop",
    type: "group",
    hasUpdates: true,
  },
  {
    id: "2",
    name: "Web Development Masterclass",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=100&auto=format&fit=crop",
    type: "group",
  },
  {
    id: "3",
    name: "Tech Startup Network",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=100&auto=format&fit=crop",
    type: "page",
    hasUpdates: true,
  },
  {
    id: "4",
    name: "Crypto Trading Community",
    image: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?q=80&w=100&auto=format&fit=crop",
    type: "group",
  },
  {
    id: "5",
    name: "Genshin Impact Indonesia",
    image: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=100&auto=format&fit=crop",
    type: "game",
  }
];

export default function SidebarShortcuts() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  return (
    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700 first:mt-0 first:pt-0 first:border-t-0">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="font-semibold text-gray-500 dark:text-[#B0B3B8] text-[15px]">
          {t("sidebar.shortcuts") || "Your Shortcuts"}
        </h3>
        <button className="text-[13px] text-blue-600 dark:text-sky-400 hover:underline hidden group-hover:block transition-all">
          {t("common.edit") || "Edit"}
        </button>
      </div>

      <div className="space-y-1">
        {MOCK_SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.id}
            onClick={() => router.push(`/${locale}/community/${shortcut.id}`)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors group relative"
          >
            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
              <Image 
                src={shortcut.image} 
                alt={shortcut.name} 
                fill 
                className="object-cover"
                unoptimized
              />
              {shortcut.type === "group" && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#38bdf8] rounded-tl-md border border-white dark:border-[#242526] flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-start min-w-0">
              <span className="text-[14px] font-medium text-gray-900 dark:text-[#E4E6EB] truncate w-full text-left">
                {shortcut.name}
              </span>
            </div>

            {shortcut.hasUpdates && (
              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
            )}
          </button>
        ))}
      </div>

      <button className="w-full flex items-center gap-3 p-2 mt-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors group text-gray-600 dark:text-[#B0B3B8]">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#3A3B3C] group-hover:bg-gray-300 dark:group-hover:bg-[#4E4F50] flex items-center justify-center transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <span className="text-[14px] font-medium">{t("common.seeMore") || "See More"}</span>
      </button>
    </div>
  );
}
