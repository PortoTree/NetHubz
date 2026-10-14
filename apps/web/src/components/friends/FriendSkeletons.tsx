"use client";

import React from "react";

/**
 * Skeleton untuk Kartu Teman Desktop di Area Tengah
 * Proporsi diatur rapi agar tidak pernah bertabrakan/merging dengan tombol aksi.
 */
export function FriendCardSkeletonDesktop() {
  return (
    <div className="bg-white dark:bg-[#242526] rounded-2xl p-4 border border-gray-100 dark:border-[#3E4042] shadow-sm flex items-center justify-between gap-3 min-h-[82px] animate-pulse">
      {/* Profil Kiri: Avatar + 2 Baris Teks (Name & Username) */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
        <div className="flex flex-col gap-2 min-w-0 flex-1 max-w-[130px] sm:max-w-[160px]">
          <div className="w-24 sm:w-28 h-3.5 rounded-full bg-gray-200 dark:bg-[#3E4042]" />
          <div className="w-16 sm:w-20 h-2.5 rounded-full bg-gray-100 dark:bg-[#3A3B3C]/60" />
        </div>
      </div>

      {/* Aksi Kanan: Placeholder Tombol Pesan + Titik 3 */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-22 sm:w-26 h-8 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/20 dark:border-blue-900/30" />
        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#3A3B3C]/50" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk Permintaan Pertemanan (Sidebar Kanan / Mode Full di Area Tengah)
 */
export function FriendRequestSkeleton({ isCompact = false }: { isCompact?: boolean }) {
  if (isCompact) {
    return (
      <div className="flex flex-col gap-2.5 p-2 rounded-xl animate-pulse">
        {/* Baris Atas: Avatar + Teks + Menu placeholder */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-[120px]">
              <div className="w-22 h-3 rounded-full bg-gray-200 dark:bg-[#3E4042]" />
              <div className="w-16 h-2 rounded-full bg-gray-100 dark:bg-[#3A3B3C]/60" />
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-[#3A3B3C]/40 shrink-0" />
        </div>

        {/* Baris Bawah: 2 Tombol Aksi (Konfirmasi & Hapus) */}
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 h-7 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 border border-blue-200/20 dark:border-blue-900/30" />
          <div className="flex-1 h-7 rounded-xl bg-gray-200/80 dark:bg-[#3A3B3C]/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#242526] rounded-2xl p-4 border border-gray-100 dark:border-[#3E4042] shadow-sm flex flex-col gap-3 animate-pulse">
      {/* Baris Atas: Avatar + Teks + Menu placeholder */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
          <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-[140px]">
            <div className="w-28 h-3.5 rounded-full bg-gray-200 dark:bg-[#3E4042]" />
            <div className="w-18 h-2.5 rounded-full bg-gray-100 dark:bg-[#3A3B3C]/60" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#3A3B3C]/40 shrink-0" />
      </div>

      {/* Baris Bawah: 2 Tombol Sejajar (Konfirmasi & Hapus) */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-9 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 border border-blue-200/20 dark:border-blue-900/30" />
        <div className="flex-1 h-9 rounded-xl bg-gray-200/80 dark:bg-[#3A3B3C]/60" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk Saran Teman di Sidebar Kiri
 */
export function FriendSuggestionSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-2xl animate-pulse">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
        <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-[110px]">
          <div className="w-20 h-3 rounded-full bg-gray-200 dark:bg-[#3E4042]" />
          <div className="w-14 h-2 rounded-full bg-gray-100 dark:bg-[#3A3B3C]/60" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-14 h-7 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200/20 dark:border-emerald-900/30" />
        <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-[#3A3B3C]/40" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk Item List Mobile
 */
export function FriendCardSkeletonMobile() {
  return (
    <div className="bg-white dark:bg-[#242526] rounded-2xl p-3.5 border border-gray-100 dark:border-[#3E4042] shadow-sm flex items-center justify-between gap-3 animate-pulse">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-[#3A3B3C] shrink-0" />
        <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-[130px]">
          <div className="w-24 h-3.5 rounded-full bg-gray-200 dark:bg-[#3E4042]" />
          <div className="w-16 h-2.5 rounded-full bg-gray-100 dark:bg-[#3A3B3C]/60" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-18 h-7 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/20 dark:border-blue-900/30" />
        <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-[#3A3B3C]/50" />
      </div>
    </div>
  );
}
