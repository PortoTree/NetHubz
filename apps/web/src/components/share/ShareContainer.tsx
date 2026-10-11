"use client";

import React, { useState, useEffect } from "react";
import { useShareModal } from "@/contexts/ShareContext";
import ShareModalDesktop from "./ShareModalDesktop";
import ShareSheetMobile from "./ShareSheetMobile";

export default function ShareContainer() {
  const { isOpen, shareData, closeShareModal } = useShareModal();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (!isOpen || !shareData || isMobile === null) return null;

  return isMobile ? (
    <ShareSheetMobile
      isOpen={isOpen}
      shareData={shareData}
      onClose={closeShareModal}
    />
  ) : (
    <ShareModalDesktop
      isOpen={isOpen}
      shareData={shareData}
      onClose={closeShareModal}
    />
  );
}
