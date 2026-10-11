"use client";

import React from "react";
import { useShareModal } from "@/contexts/ShareContext";
import ShareModalDesktop from "./ShareModalDesktop";
import ShareSheetMobile from "./ShareSheetMobile";

export default function ShareContainer() {
  const { isOpen, shareData, closeShareModal } = useShareModal();

  if (!isOpen || !shareData) return null;

  return (
    <>
      {/* Mobile (<768px): Native Slide Bottom Sheet */}
      <div className="block md:hidden">
        <ShareSheetMobile
          isOpen={isOpen}
          shareData={shareData}
          onClose={closeShareModal}
        />
      </div>

      {/* Desktop (>=768px): Centered Modal Dialog */}
      <div className="hidden md:block">
        <ShareModalDesktop
          isOpen={isOpen}
          shareData={shareData}
          onClose={closeShareModal}
        />
      </div>
    </>
  );
}
