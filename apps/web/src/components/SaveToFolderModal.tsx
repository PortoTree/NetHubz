"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { getUserFolders, createFolder, assignItemToFolder } from "@/app/actions/folders";
import toast from "react-hot-toast";

interface SaveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  targetType: "post" | "project";
  targetId: string;
}

export default function SaveToFolderModal({ isOpen, onClose, userId, targetType, targetId }: SaveToFolderModalProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("saveFolderModal");

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    setIsLoading(true);
    const res = await getUserFolders(userId);
    if (res.success && res.folders) {
      setFolders(res.folders);
    }
    setIsLoading(false);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || isCreating) return;
    setIsCreating(true);
    const res = await createFolder(userId, newFolderName.trim());
    if (res.success) {
      setNewFolderName("");
      await loadFolders();
      toast.success(t("successCreate"));
    } else {
      toast.error(res.error || t("errorCreate"));
    }
    setIsCreating(false);
  };

  const handleSelectFolder = async (folderId: string | null) => {
    if (isSaving) return;
    setIsSaving(true);
    const res = await assignItemToFolder(userId, targetType, targetId, folderId);
    if (res.success) {
      toast.success(t("successSave"));
      onClose();
    } else {
      toast.error(res.error || t("errorSave"));
    }
    setIsSaving(false);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="bg-white dark:bg-[#242526] w-full max-w-sm rounded-xl shadow-2xl relative z-10 flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-[#3E4042] flex justify-between items-center">
          <h2 className="text-lg font-bold text-black dark:text-[#E4E6EB]">{t("title")}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
          {isLoading ? (
            <div className="p-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleSelectFolder(null)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] transition-colors"
              >
                {t("noFolder")}
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleSelectFolder(f.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h6l2 2h8v14H4V4z" />
                  </svg>
                  <span className="text-black dark:text-[#E4E6EB]">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-[#18191A]">
          <form onSubmit={handleCreateFolder} className="flex gap-2">
            <input
              type="text"
              placeholder={t("newFolderPlaceholder")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 bg-white dark:bg-[#242526] border border-gray-300 dark:border-[#3E4042] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-black dark:text-[#E4E6EB]"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={isCreating || !newFolderName.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {t("createBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
