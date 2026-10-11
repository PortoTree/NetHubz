"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import MiniProfileModal, { MiniProfileTarget } from "@/components/MiniProfileModal";
import { RectLike } from "@/utils/popoverPosition";

export type MiniProfileAnchor = RectLike;

interface MiniProfileContextType {
  openMiniProfile: (
    target: MiniProfileTarget,
    anchor?: MiniProfileAnchor | HTMLElement | React.MouseEvent | null
  ) => void;
  closeMiniProfile: () => void;
}

const MiniProfileContext = createContext<MiniProfileContextType | undefined>(undefined);

export function MiniProfileProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<MiniProfileTarget | null>(null);
  const [anchorRect, setAnchorRect] = useState<RectLike | null>(null);

  const openMiniProfile = useCallback(
    (
      target: MiniProfileTarget,
      anchor?: MiniProfileAnchor | HTMLElement | React.MouseEvent | null
    ) => {
      if (!target) return;

      let extractedRect: RectLike | null = null;
      if (anchor) {
        if ("currentTarget" in (anchor as any) && (anchor as any).currentTarget) {
          const el = (anchor as any).currentTarget as HTMLElement;
          if (typeof el.getBoundingClientRect === "function") {
            const r = el.getBoundingClientRect();
            extractedRect = {
              top: r.top,
              left: r.left,
              bottom: r.bottom,
              right: r.right,
              width: r.width,
              height: r.height,
            };
          }
        } else if ("getBoundingClientRect" in (anchor as any)) {
          const r = (anchor as HTMLElement).getBoundingClientRect();
          extractedRect = {
            top: r.top,
            left: r.left,
            bottom: r.bottom,
            right: r.right,
            width: r.width,
            height: r.height,
          };
        } else if ("top" in (anchor as any) && "left" in (anchor as any)) {
          extractedRect = anchor as RectLike;
        }
      }

      setAnchorRect(extractedRect);
      setTargetUser(target);
      setIsOpen(true);
    },
    []
  );

  const closeMiniProfile = useCallback(() => {
    setIsOpen(false);
    setAnchorRect(null);
  }, []);

  return (
    <MiniProfileContext.Provider value={{ openMiniProfile, closeMiniProfile }}>
      {children}
      <MiniProfileModal
        isOpen={isOpen}
        targetUser={targetUser}
        anchorRect={anchorRect}
        onClose={closeMiniProfile}
      />
    </MiniProfileContext.Provider>
  );
}

export function useMiniProfile() {
  const context = useContext(MiniProfileContext);
  if (!context) {
    throw new Error("useMiniProfile must be used within a MiniProfileProvider");
  }
  return context;
}

export type { MiniProfileTarget };
