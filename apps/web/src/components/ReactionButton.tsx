"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY" | "IWW" | "WHAT" | "HATE";

export const REACTION_CONFIG: Record<ReactionType, { src: string; label: string; color: string }> = {
  LIKE: { src: "/react/like.webp", label: "Like", color: "text-blue-600 dark:text-blue-500" },
  LOVE: { src: "/react/love.webp", label: "Love", color: "text-red-500" },
  HAHA: { src: "/react/haha.webp", label: "Haha", color: "text-yellow-500" },
  WOW: { src: "/react/wow.webp", label: "Wow", color: "text-yellow-500" },
  SAD: { src: "/react/sad.webp", label: "Sad", color: "text-yellow-500" },
  ANGRY: { src: "/react/angry.webp", label: "Angry", color: "text-orange-500" },
  IWW: { src: "/react/iww.webp", label: "Iww", color: "text-green-500" },
  WHAT: { src: "/react/what.webp", label: "What?", color: "text-purple-500" },
  HATE: { src: "/react/hate.webp", label: "Hate", color: "text-red-700" },
};

const REACTIONS = Object.keys(REACTION_CONFIG) as ReactionType[];

interface ReactionButtonProps {
  myReaction: ReactionType | null;
  onReact: (type: ReactionType) => void;
  count: number;
  className?: string;
  containerClassName?: string;
  hideText?: boolean;
  hideTooltip?: boolean;
}

export function ReactionButton({ myReaction, onReact, count, className, containerClassName, hideText, hideTooltip }: ReactionButtonProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (!isOpen) return;
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("mousedown", handleClickOutside, true);
    }
    
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPos({ 
        top: rect.top + rect.height / 2, 
        left: rect.left + rect.width / 2 
      });
    }
    setIsOpen((prev) => !prev);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReact(myReaction || "LIKE");
    setIsOpen(false);
  };

  const renderActiveReaction = () => {
    if (myReaction && REACTION_CONFIG[myReaction]) {
      const config = REACTION_CONFIG[myReaction];
      return (
        <>
          <div className="w-5 h-5 relative mr-1">
            <Image src={config.src} alt={config.label} fill unoptimized priority className="object-contain" />
          </div>
          {!hideText && <span className={`${config.color} font-semibold`}>{config.label}</span>}
        </>
      );
    }
    return (
      <>
        <div className="w-5 h-5 relative mr-0 sm:mr-1.5 shrink-0 opacity-70">
          <Image src="/react.svg" alt="React" fill unoptimized priority className="object-contain dark:invert" />
        </div>
        {!hideText && <span className="text-[#65676B] dark:text-[#B0B3B8] font-semibold">{t("feed.react") || "Reaksi"}</span>}
      </>
    );
  };

  return (
    <div ref={buttonRef} className={`relative flex ${containerClassName || "flex-1"}`}>
      {isOpen && mounted && createPortal(
        <div 
          ref={popupRef}
          className="fixed w-0 h-0 z-[999999]"
          style={{ top: popupPos.top, left: popupPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Overlay to catch clicks and close, optional but helps on mobile */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          
          {REACTIONS.map((type, index) => {
            const config = REACTION_CONFIG[type];
            // Calculate position on a circle
            const radius = 85;
            const angle = (index * 360) / REACTIONS.length;
            const radian = (angle - 90) * (Math.PI / 180);
            const x = radius * Math.cos(radian);
            const y = radius * Math.sin(radian);

            return (
              <button
                key={type}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(type);
                  setIsOpen(false);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute w-[56px] h-[56px] -ml-[28px] -mt-[28px] rounded-full bg-white dark:bg-[#242526] shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-[#3E4042] hover:scale-125 hover:z-50 active:scale-110 active:z-50 transition-all duration-150 flex items-center justify-center group/emoji animate-in zoom-in duration-200 select-none"
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                  animationFillMode: 'both',
                  animationDelay: `${index * 20}ms`,
                  WebkitTouchCallout: 'none'
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[12px] font-bold px-2.5 py-1 rounded-full opacity-0 invisible group-hover/emoji:opacity-100 group-hover/emoji:visible group-active/emoji:opacity-100 group-active/emoji:visible transition-all duration-150 pointer-events-none whitespace-nowrap shadow-sm z-50">
                  {config.label}
                </div>
                <div className="relative w-10 h-10 pointer-events-none">
                  <Image src={config.src} alt={config.label} fill unoptimized priority className="object-contain drop-shadow-sm" />
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
      
      <button 
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={className?.includes('group') ? className.replace(/\bgroup\b/, 'group/reactBtn') : (className || "flex-1 flex items-center justify-center py-1.5 rounded-lg text-[15px] transition-all duration-150 active:scale-95 bg-transparent hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:bg-gray-200/60 dark:active:bg-[#3A3B3C] relative group/reactBtn select-none")}
      >
        {!hideTooltip && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] font-bold px-2 py-1 rounded-full opacity-0 invisible group-hover/reactBtn:opacity-100 group-hover/reactBtn:visible transition-all duration-200 pointer-events-none whitespace-nowrap shadow-sm z-50">
            {t("feed.chooseReaction") || "Pilih reaksi"}
          </div>
        )}
        {renderActiveReaction()}
        {count > 0 && hideText && <span className="ml-1.5 text-[#65676B] dark:text-[#B0B3B8]">{count}</span>}
      </button>
    </div>
  );
}
