"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface ProfileMediaSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerUpload: () => void;
  onSelectLibraryItem: (url: string) => void;
  type: "avatar" | "cover";
}

const LIBRARY_AVATARS = [
  "/library/Chisa Franxx GIF.webp",
  "/library/cowboy bebop smoking GIF.gif",
  "/library/cute anime GIF.gif",
  "/library/Dance Beatboxing GIF.gif",
  "/library/Hunter X Hunter GIF.webp",
  "/library/anime love GIF.gif",
];

const LIBRARY_COVERS = [
  // For now we'll reuse the same animations for covers just as an example
  "/library/Chisa Franxx GIF.webp",
  "/library/cowboy bebop smoking GIF.gif",
  "/library/Hunter X Hunter GIF.webp",
  "/library/anime love GIF.gif",
];

export default function ProfileMediaSelectionModal({
  isOpen,
  onClose,
  onTriggerUpload,
  onSelectLibraryItem,
  type,
}: ProfileMediaSelectionModalProps) {
  const t = useTranslations("editProfile.mediaSelection");
  const [activeTab, setActiveTab] = useState<"upload" | "library">("upload");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const libraryItems = type === "avatar" ? LIBRARY_AVATARS : LIBRARY_COVERS;

  const modalContent = (
    <div className="fixed inset-0 z-[10500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="bg-white dark:bg-[#242526] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative z-10 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {type === "avatar" ? t("changeAvatar") : t("changeCover")}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex w-full border-b border-gray-200 dark:border-[#3E4042]">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "upload" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
            onClick={() => setActiveTab("upload")}
          >
            {t("uploadImage")}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "library" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
            onClick={() => setActiveTab("library")}
          >
            {t("library")}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 h-[300px] overflow-y-auto no-scrollbar md:custom-scrollbar">
          {activeTab === "upload" ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("uploadFromDevice")}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                {t("supportedFormats", { size: type === "avatar" ? "3MB" : "5MB" })}
              </p>
              <button
                onClick={() => {
                  onTriggerUpload();
                  onClose();
                }}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                {t("selectFile")}
              </button>
            </div>
          ) : (
            <div className={type === "avatar" ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
              {libraryItems.map((url, i) => (
                <div
                  key={i}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all ${type === "avatar" ? "aspect-square" : "aspect-[3/1]"}`}
                  onClick={() => {
                    onSelectLibraryItem(url);
                    onClose();
                  }}
                >
                  <img src={url} alt={`Library Item ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
