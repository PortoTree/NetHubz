"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface FriendActionMenuDesktopProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  locale: string;
  showUnfriend?: boolean;
  onUnfriend?: (friendId: string) => void;
  onBlockPrompt?: (user: { id: string; username: string; displayName: string; avatarUrl?: string | null }) => void;
}

export default function FriendActionMenuDesktop({
  user,
  locale,
  showUnfriend = false,
  onUnfriend,
  onBlockPrompt,
}: FriendActionMenuDesktopProps) {
  const t = useTranslations("friends");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setCoords(null);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
      setCoords(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isOpen) {
      setIsOpen(false);
      setCoords(null);
      return;
    }

    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    const menuWidth = 192; // w-48 (12rem)
    const menuHeight = showUnfriend ? 190 : 145;
    const spaceRight = window.innerWidth - rect.right;

    let left: number | undefined = undefined;
    let right: number | undefined = undefined;

    // Muncul di luar kolom: jika ruang kanan cukup (seperti di sidebar kiri), posisikan di sebelah kanan tombol
    if (spaceRight >= menuWidth + 16) {
      left = rect.right + 8;
    } else {
      // Jika mepet sisi kanan viewport (seperti di sidebar kanan), posisikan di sebelah kiri tombol
      right = window.innerWidth - rect.left + 8;
    }

    // Posisi vertikal: sejajar tombol, jika mepet dasar viewport sesuaikan ke atas
    let top = rect.top - 4;
    if (top + menuHeight > window.innerHeight - 16) {
      top = Math.max(16, window.innerHeight - menuHeight - 16);
    }

    setCoords({ top, left, right });
    setIsOpen(true);
  };

  const handleSendMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    setCoords(null);
    router.push(`/${locale}/chatting?user=${user.id}`);
  };

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    setCoords(null);
    if (onBlockPrompt) {
      onBlockPrompt(user);
    }
  };

  const handleUnfriendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    setCoords(null);
    if (onUnfriend) {
      onUnfriend(user.id);
    }
  };

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-label="Menu"
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-[#B0B3B8] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Render menu dropdown di root document.body via Portal agar bebas dari overflow clipping dan di luar kolom */}
      {isOpen && coords && mounted && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            ...(coords.left !== undefined ? { left: `${coords.left}px` } : {}),
            ...(coords.right !== undefined ? { right: `${coords.right}px` } : {}),
          }}
          className="w-48 bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#3E4042] py-1.5 z-[99999] animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Lihat Profile */}
          <Link
            href={`/${locale}/p/${user.username}/${user.id}`}
            onClick={() => {
              setIsOpen(false);
              setCoords(null);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t("viewProfile")}
          </Link>

          {/* 2. Kirim Pesan */}
          <button
            type="button"
            onClick={handleSendMessage}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors text-left"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t("sendMessage")}
          </button>

          {/* Opsional: Hapus Pertemanan */}
          {showUnfriend && onUnfriend && (
            <button
              type="button"
              onClick={handleUnfriendClick}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
              {t("unfriend")}
            </button>
          )}

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-[#3E4042] my-1" />

          {/* 3. Blokir */}
          <button
            type="button"
            onClick={handleBlockClick}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
          >
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            {t("block")}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
