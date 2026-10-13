"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useUser } from "@/contexts/UserContext";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { profileCache } from "@/utils/cache";
import { shouldHideBottomNav } from "@/utils/navigationVisibility";

// Layout measurements
const HANDLE_H = 20;
const NAV_H = 56;
const COLLAPSED_H = HANDLE_H + NAV_H; // 76px
const EXPANDED_H = 435;               // Handle + Nav + 5 Items + Profile Card at bottom
const SHEET_H = 950;                  // Tall base height ensuring sheet NEVER detaches from bottom

type Snap = "collapsed" | "expanded" | "tall";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { currentUser } = useUser();

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [snap, setSnap] = useState<Snap>("collapsed");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0); // pixels dragged upwards (+ = up, - = down)
  const [windowH, setWindowH] = useState(800);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const dragging = useRef(false);
  const startY = useRef(0);
  const startSnap = useRef<Snap>("collapsed");
  const hasMoved = useRef(false);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // Dynamic tall height ~55vh (half-screen as requested)
  const tallH = Math.max(EXPANDED_H + 70, Math.round(windowH * 0.55));

  const getSnapVisH = useCallback(
    (s: Snap) => {
      if (s === "collapsed") return COLLAPSED_H;
      if (s === "expanded") return EXPANDED_H;
      return tallH;
    },
    [tallH]
  );

  useEffect(() => {
    setMounted(true);
    setWindowH(window.innerHeight);
    const onResize = () => setWindowH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Collapse on route change
  useEffect(() => {
    setSnap("collapsed");
    setDragOffset(0);
    setIsAccountMenuOpen(false);
  }, [pathname]);

  const scrollStopTimer = useRef<NodeJS.Timeout | null>(null);
  const lastScrollYRef = useRef(0);

  // Show/Hide on scroll:
  // 1. Scroll ke atas -> langsung show
  // 2. Scroll ke bawah -> hide sejenak, lalu saat user stop scroll -> otomatis show lagi
  useEffect(() => {
    const onScroll = () => {
      if (snap !== "collapsed") return;
      const currentY = window.scrollY;
      const prevY = lastScrollYRef.current;

      // Di paling atas halaman -> selalu show
      if (currentY <= 10) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
        if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
        return;
      }

      if (currentY < prevY) {
        // 1. User scroll ke atas -> langsung show
        setIsVisible(true);
        if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
      } else if (currentY > prevY + 5) {
        // 2. User scroll ke bawah -> hide sejenak
        setIsVisible(false);

        // Reset timer stop scroll
        if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
        // Saat user stop scrolling (tidak ada event scroll baru selama 400ms) -> show kembali
        scrollStopTimer.current = setTimeout(() => {
          setIsVisible(true);
        }, 400);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [snap]);

  // ── Drag Logic ─────────────────────────────────────────────────────────────
  const startDrag = useCallback(
    (clientY: number) => {
      dragging.current = true;
      hasMoved.current = false;
      setIsDragging(true);
      startY.current = clientY;
      startSnap.current = snap;
      setDragOffset(0);
    },
    [snap]
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      if (!dragging.current) return;
      const delta = startY.current - clientY; // pulling up is positive
      if (Math.abs(delta) > 4) {
        hasMoved.current = true;
      }
      const baseVis = getSnapVisH(startSnap.current);
      const targetVis = baseVis + delta;

      // Clamp between slightly below collapsed and slightly above tall
      const clampedVis = Math.max(COLLAPSED_H - 15, Math.min(tallH + 30, targetVis));
      setDragOffset(clampedVis - baseVis);
    },
    [getSnapVisH, tallH]
  );

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);

    const baseVis = getSnapVisH(startSnap.current);
    const finalVis = baseVis + dragOffset;
    setDragOffset(0);

    // Determine target snap point based on final visible height
    const thresh1 = (COLLAPSED_H + EXPANDED_H) / 2;       // mid between collapsed & expanded
    const thresh2 = (EXPANDED_H + tallH) / 2;            // mid between expanded & tall

    if (finalVis < thresh1) {
      setSnap("collapsed");
      setIsAccountMenuOpen(false);
    } else if (finalVis < thresh2) {
      setSnap("expanded");
    } else {
      setSnap("tall");
    }
  }, [dragOffset, getSnapVisH, tallH]);

  const onTouchStart = (e: React.TouchEvent) => startDrag(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => moveDrag(e.touches[0].clientY);
  const onTouchEnd = () => endDrag();

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientY);
    const onMove = (ev: MouseEvent) => moveDrag(ev.clientY);
    const onUp = () => {
      endDrag();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Smart Auto-Expand on Menu Scroll / Swipe ─────────────────────────────────
  const handleMenuTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleMenuTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY; // positive = swipe up, negative = swipe down
    const scrollTop = menuScrollRef.current ? menuScrollRef.current.scrollTop : 0;

    // Saat masih ukuran default (expanded), jika user usap ke atas -> auto-expand ke tall (~55vh)
    if (snap === "expanded" && diff > 14) {
      setSnap("tall");
      setDragOffset(0);
      touchStartY.current = currentY;
    }
    // Saat di tall, jika sudah di posisi puncak (scrollTop <= 0) lalu usap ke bawah -> kembali ke expanded
    else if (snap === "tall" && scrollTop <= 0 && diff < -25) {
      setSnap("expanded");
      setDragOffset(0);
      touchStartY.current = currentY;
    }
  };

  const handleMenuWheel = (e: React.WheelEvent) => {
    const scrollTop = menuScrollRef.current ? menuScrollRef.current.scrollTop : 0;
    if (snap === "expanded" && e.deltaY > 10) {
      setSnap("tall");
      setDragOffset(0);
    } else if (snap === "tall" && scrollTop <= 0 && e.deltaY < -20) {
      setSnap("expanded");
      setDragOffset(0);
    }
  };

  // Skip SSR mismatch & hidden pages
  if (!mounted) return null;
  if (pathname.includes("/login") || pathname.includes("/register")) return null;

  // Active tab check
  let tab = "home";
  if (pathname.includes("/product")) tab = "product";
  else if (pathname.includes("/project")) tab = "project";
  else if (pathname.includes("/search") || pathname.includes("/explore")) tab = "explore";
  else if (pathname.includes("/profile") || pathname.includes("/p/")) tab = "profile";
  else if (pathname.includes("/chatting") || pathname.includes("/chat") || pathname.includes("/obrolan")) tab = "chat";
  else if (pathname.includes("/friend")) tab = "friend";
  else if (pathname.includes("/community")) tab = "community";
  else if (pathname.includes("/page")) tab = "page";
  else if (pathname.includes("/saved")) tab = "saved";

  const go = (path: string) => {
    setSnap("collapsed");
    setDragOffset(0);
    setIsAccountMenuOpen(false);
    router.push(`/${locale}/${path}`);
  };

  // ── Calculate Visible Height & TranslateY ──────────────────────────────────
  const baseVisH = getSnapVisH(snap);
  const currentVisH = Math.max(COLLAPSED_H - 15, Math.min(tallH + 30, baseVisH + dragOffset));

  // If scrolled away while collapsed, hide completely below screen
  const isHiddenByScroll = !isVisible && snap === "collapsed" && !isDragging;
  const translateY = isHiddenByScroll ? SHEET_H + 20 : SHEET_H - currentVisH;

  // Backdrop opacity
  const openRatio = Math.min(1, Math.max(0, (currentVisH - COLLAPSED_H) / (EXPANDED_H - COLLAPSED_H)));
  const backdropOpacity = openRatio * 0.45;
  const isOpen = snap !== "collapsed" || (isDragging && currentVisH > COLLAPSED_H + 10);

  const rawAvatar = currentUser?.profile?.avatarUrl ?? profileCache.get(currentUser?.id)?.avatarUrl;
  const avatarSrc = rawAvatar ? getOptimizedUrl(rawAvatar, "avatar") : "/default-avatar.svg";

  if (shouldHideBottomNav(pathname)) {
    return null;
  }

  return (
    <>
      {/* ── BACKDROP OVERLAY ───────────────────────────────────────────────── */}
      <div
        onClick={() => {
          if (isAccountMenuOpen) {
            setIsAccountMenuOpen(false);
          } else {
            setSnap("collapsed");
            setDragOffset(0);
          }
        }}
        className={`md:hidden fixed inset-0 bg-black z-[60] transition-opacity ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          opacity: isAccountMenuOpen ? 0.6 : backdropOpacity,
          transition: isDragging ? "none" : "opacity 0.28s ease",
        }}
      />

      {/* ── BOTTOM SHEET (ANCHORED AT BOTTOM-0, ALWAYS SOLID UNDERNEATH) ────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-[#242526] select-none rounded-t-2xl border-t border-gray-300 dark:border-[#3E4042]"
        style={{
          height: `${SHEET_H}px`,
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: isOpen
            ? "0 -6px 28px rgba(0,0,0,0.18), 0 -1px 3px rgba(0,0,0,0.06)"
            : "0 -2px 10px rgba(0,0,0,0.06)",
        }}
      >
        {/* ① DRAG HANDLE (Click to expand/collapse, touch/drag to pull) ──────── */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onClick={() => {
            if (!hasMoved.current) {
              setSnap((s) => (s === "collapsed" ? "expanded" : "collapsed"));
              setDragOffset(0);
              setIsAccountMenuOpen(false);
            }
          }}
          className="w-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing group"
          style={{ height: `${HANDLE_H}px` }}
        >
          <div
            className={`rounded-full transition-all duration-200 ${
              isOpen
                ? "w-10 h-1 bg-gray-400 dark:bg-[#707275]"
                : "w-8 h-1 bg-gray-300 dark:bg-[#555658] group-hover:bg-gray-400 dark:group-hover:bg-[#6E7073]"
            }`}
          />
        </div>

        {/* ② NAV BAR (The 5 main tabs: Home, Product, Project, Explore, Profile) */}
        <div
          className="flex items-center justify-around px-2 border-b border-gray-200 dark:border-[#3E4042]"
          style={{ height: `${NAV_H}px` }}
        >
          {/* Home */}
          <button
            type="button"
            onClick={() => go("home")}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-150 active:scale-90 select-none ${
              tab === "home" ? "text-emerald-500 font-semibold" : "text-gray-500 hover:text-gray-900 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]"
            }`}
          >
            <div
              className="w-6 h-6 bg-current"
              style={{
                WebkitMask: `url(/navigasi/home${tab === "home" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/home${tab === "home" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
            <span className="text-[10px] mt-0.5">{t("tabs.home")}</span>
          </button>

          {/* Product */}
          <button
            type="button"
            onClick={() => go("product")}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-150 active:scale-90 select-none ${
              tab === "product" ? "text-emerald-500 font-semibold" : "text-gray-500 hover:text-gray-900 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]"
            }`}
          >
            <div
              className="w-6 h-6 bg-current"
              style={{
                WebkitMask: `url(/navigasi/produk${tab === "product" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/produk${tab === "product" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
            <span className="text-[10px] mt-0.5">{t("tabs.product")}</span>
          </button>

          {/* Project */}
          <button
            type="button"
            onClick={() => go("project")}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-150 active:scale-90 select-none ${
              tab === "project" ? "text-emerald-500 font-semibold" : "text-gray-500 hover:text-gray-900 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]"
            }`}
          >
            <div
              className="w-6 h-6 bg-current"
              style={{
                WebkitMask: `url(/navigasi/project${tab === "project" ? "" : "-outline"}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/project${tab === "project" ? "" : "-outline"}.svg) center/contain no-repeat`,
              }}
            />
            <span className="text-[10px] mt-0.5">{t("tabs.project")}</span>
          </button>

          {/* Explore */}
          <button
            type="button"
            onClick={() => go("explore")}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-150 active:scale-90 select-none ${
              tab === "explore" ? "text-emerald-500 font-semibold" : "text-gray-500 hover:text-gray-900 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]"
            }`}
          >
            <div
              className="w-6 h-6 bg-current"
              style={{
                WebkitMask: `url(/navigasi/explore${tab === "explore" ? "-aktif" : ""}.svg) center/contain no-repeat`,
                mask: `url(/navigasi/explore${tab === "explore" ? "-aktif" : ""}.svg) center/contain no-repeat`,
              }}
            />
            <span className="text-[10px] mt-0.5">{t("tabs.explore")}</span>
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => {
              if (currentUser) router.push(`/${locale}/p/${currentUser.username || currentUser.id}/${currentUser.id}`);
              else go("profile");
            }}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-150 active:scale-90 select-none ${
              tab === "profile" ? "text-emerald-500" : "text-gray-500 dark:text-[#B0B3B8]"
            }`}
          >
            <img
              src={avatarSrc}
              alt="Profile"
              className={`w-8 h-8 rounded-full object-cover ${
                tab === "profile" ? "border-2 border-emerald-500" : "border border-transparent"
              }`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
              }}
            />
          </button>
        </div>

        {/* ③ MENU CONTENT */}
        <div
          ref={menuScrollRef}
          onTouchStart={handleMenuTouchStart}
          onTouchMove={handleMenuTouchMove}
          onWheel={handleMenuWheel}
          className="overflow-y-auto overscroll-contain px-4 pt-3 transition-[height] duration-200"
          style={{
            height: `${Math.max(120, currentVisH - COLLAPSED_H)}px`,
            maxHeight: `${tallH - COLLAPSED_H}px`,
            paddingBottom: "env(safe-area-inset-bottom, 24px)",
          }}
        >
          {/* Quick Menu Items (Di atas) */}
          <div className="space-y-1 mb-2.5">
            {([
              {
                key: "search",
                label: t("bottomNav.search"),
                icon: "mencari-aktif",
                path: "search",
                bg: "bg-teal-50/80 dark:bg-teal-950/30",
                iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400",
              },
              {
                key: "chat",
                label: t("bottomNav.chat"),
                icon: "chat-aktif",
                path: "chatting",
                bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
                iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
              },
              {
                key: "friend",
                label: t("bottomNav.friends"),
                icon: "teman-aktif",
                path: "friend",
                bg: "bg-blue-50/80 dark:bg-blue-950/30",
                iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
              },
              {
                key: "community",
                label: t("bottomNav.community"),
                icon: "komunitas-aktif",
                path: "community",
                bg: "bg-indigo-50/80 dark:bg-indigo-950/30",
                iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
              },
              {
                key: "page",
                label: t("bottomNav.yourPage"),
                icon: "yourpage",
                path: "page",
                bg: "bg-violet-50/80 dark:bg-violet-950/30",
                iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
              },
              {
                key: "saved",
                label: t("bottomNav.saved"),
                icon: "saved-aktif",
                path: "saved",
                bg: "bg-amber-50/80 dark:bg-amber-950/30",
                iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
              },
            ] as const).map(({ key, label, icon, bg, iconBg, path }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSnap("collapsed");
                  setDragOffset(0);
                  setIsAccountMenuOpen(false);
                  router.push(`/${locale}/${path}`);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] text-left hover:bg-gray-100/80 dark:hover:bg-[#323334] ${
                  tab === key ? bg : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <div
                      className="w-5 h-5 bg-current"
                      style={{
                        WebkitMask: `url(/navigasi/${icon}.svg) center/contain no-repeat`,
                        mask: `url(/navigasi/${icon}.svg) center/contain no-repeat`,
                      }}
                    />
                  </div>
                  <span className="font-semibold text-[14px] text-gray-800 dark:text-[#E4E6EB]">{label}</span>
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 dark:text-[#7A7D82]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <div className="h-px bg-gray-200/80 dark:bg-[#353638] my-2" />

          {/* Profile Card Trigger (Dipindah ke bawah, model timbul persis gambar ke-2) */}
          <div className="relative pt-1 pb-2">
            {/* Pop-up Menu Timbul (Muncul ke atas) */}
            {isAccountMenuOpen && (
              <div
                className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-[#242526] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.65),0_4px_12px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-[#3E4042] py-2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Active Account Item (Card hijau muda dengan centang) */}
                <div className="px-2 pt-1 pb-1">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 cursor-default">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={avatarSrc}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/40 bg-white dark:bg-[#242526]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[14px] text-emerald-800 dark:text-emerald-400 truncate leading-tight">
                          {currentUser?.profile?.displayName || currentUser?.username || "User"}
                        </span>
                        <span className="text-[12px] text-emerald-600 dark:text-emerald-500/80 truncate leading-tight mt-0.5">
                          @{currentUser?.username || "user"}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-emerald-600 dark:text-emerald-400 pl-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] w-full bg-gray-100 dark:bg-[#3E4042] my-1" />

                {/* Tambah Akun */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setSnap("collapsed");
                    router.push(`/${locale}/login`);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] active:bg-gray-100 dark:active:bg-[#3A3B3C] active:scale-[0.98] text-left transition-all duration-150 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-700 dark:text-[#E4E6EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-medium text-[13px] text-black dark:text-[#E4E6EB]">
                    {t("profileMenu.addAccount")}
                  </span>
                </button>

                <div className="h-[1px] w-full bg-gray-100 dark:bg-[#3E4042] my-1" />

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("token");
                    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.href = `/login`;
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 active:bg-red-100 dark:active:bg-red-950/40 active:scale-[0.98] text-red-600 dark:text-red-400 text-left transition-all duration-150 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="font-medium text-[13px]">
                    {t("profileMenu.logout")}
                  </span>
                </button>
              </div>
            )}

            {/* Trigger Button (Model Timbul dengan bayangan halus & border, chevron up/down) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsAccountMenuOpen(!isAccountMenuOpen);
              }}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#323334] hover:bg-gray-50 dark:hover:bg-[#3A3B3C] border border-gray-200/90 dark:border-[#3E4042] shadow-[0_3px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-pointer group transition-all duration-150 active:scale-[0.98] active:bg-gray-50 dark:active:bg-[#323334]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-emerald-500/25 bg-white dark:bg-[#242526]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[14px] text-gray-900 dark:text-[#F0F2F5] truncate leading-tight">
                    {currentUser?.profile?.displayName || currentUser?.username || t("bottomNav.profile")}
                  </span>
                  <span className="text-[12px] text-gray-500 dark:text-[#A0A3A8] truncate leading-tight mt-0.5">
                    @{currentUser?.username || "user"}
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-2 pr-1 text-gray-500 dark:text-[#A0A3A8] group-hover:text-gray-700 dark:group-hover:text-white transition-colors">
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${isAccountMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
