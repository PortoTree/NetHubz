"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface SharePayload {
  id: string;
  type: "POST" | "PROJECT";
  title?: string;
  text?: string;
  url: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string | null;
}

interface ShareContextType {
  isOpen: boolean;
  shareData: SharePayload | null;
  openShareModal: (data: SharePayload) => void;
  closeShareModal: () => void;
}

const ShareContext = createContext<ShareContextType | undefined>(undefined);

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState<SharePayload | null>(null);

  const openShareModal = useCallback((data: SharePayload) => {
    setShareData(data);
    setIsOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data slightly for smooth exit transition
    setTimeout(() => {
      setShareData(null);
    }, 250);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      shareData,
      openShareModal,
      closeShareModal,
    }),
    [isOpen, shareData, openShareModal, closeShareModal]
  );

  return <ShareContext.Provider value={value}>{children}</ShareContext.Provider>;
}

export function useShareModal(): ShareContextType {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error("useShareModal must be used within a ShareProvider");
  }
  return context;
}
