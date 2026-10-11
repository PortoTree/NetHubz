"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useUser } from "@/contexts/UserContext";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { profileCache } from "@/utils/cache";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { currentUser } = useUser();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Prevent bizarre behavior on mobile bounce scrolling (Safari)
      if (currentScrollY <= 0) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Hide on certain pages if needed, e.g. login/register
  if (pathname.includes("/login") || pathname.includes("/register")) return null;

  let activeTab = "home";
  if (pathname.includes("/product")) activeTab = "product";
  else if (pathname.includes("/project")) activeTab = "project";
  else if (pathname.includes("/search") || pathname.includes("/explore")) activeTab = "explore";
  else if (pathname.includes("/profile") || pathname.includes("/p/")) activeTab = "profile";

  const handleNav = (path: string) => {
    router.push(`/${locale}/${path}`);
  };

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-[#242526] border-t border-gray-200 dark:border-[#3E4042] z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-[calc(100%+env(safe-area-inset-bottom))]'}`}>
      <div onClick={() => handleNav('home')} className={`flex flex-col items-center justify-center w-16 h-full cursor-pointer ${activeTab === 'home' ? 'text-emerald-500' : 'text-gray-500 dark:text-[#B0B3B8]'}`}>
        <div className="w-6 h-6 bg-current" style={{ WebkitMask: `url(/navigasi/home${activeTab === 'home' ? '-aktif' : ''}.svg) center/contain no-repeat`, mask: `url(/navigasi/home${activeTab === 'home' ? '-aktif' : ''}.svg) center/contain no-repeat` }} />
        <span className="text-[10px] font-medium mt-0.5">{t("tabs.home")}</span>
      </div>
      <div onClick={() => handleNav('product')} className={`flex flex-col items-center justify-center w-16 h-full cursor-pointer ${activeTab === 'product' ? 'text-emerald-500' : 'text-gray-500 dark:text-[#B0B3B8]'}`}>
        <div className="w-6 h-6 bg-current" style={{ WebkitMask: `url(/navigasi/produk${activeTab === 'product' ? '-aktif' : ''}.svg) center/contain no-repeat`, mask: `url(/navigasi/produk${activeTab === 'product' ? '-aktif' : ''}.svg) center/contain no-repeat` }} />
        <span className="text-[10px] font-medium mt-0.5">{t("tabs.product")}</span>
      </div>
      <div onClick={() => handleNav('project')} className={`flex flex-col items-center justify-center w-16 h-full cursor-pointer ${activeTab === 'project' ? 'text-emerald-500' : 'text-gray-500 dark:text-[#B0B3B8]'}`}>
        <div className="w-6 h-6 bg-current" style={{ WebkitMask: `url(/navigasi/project${activeTab === 'project' ? '' : '-outline'}.svg) center/contain no-repeat`, mask: `url(/navigasi/project${activeTab === 'project' ? '' : '-outline'}.svg) center/contain no-repeat` }} />
        <span className="text-[10px] font-medium mt-0.5">{t("tabs.project")}</span>
      </div>
      <div onClick={() => handleNav('explore')} className={`flex flex-col items-center justify-center w-16 h-full cursor-pointer ${activeTab === 'explore' ? 'text-emerald-500' : 'text-gray-500 dark:text-[#B0B3B8]'}`}>
        <div className="w-6 h-6 bg-current" style={{ WebkitMask: `url(/navigasi/explore${activeTab === 'explore' ? '-aktif' : ''}.svg) center/contain no-repeat`, mask: `url(/navigasi/explore${activeTab === 'explore' ? '-aktif' : ''}.svg) center/contain no-repeat` }} />
        <span className="text-[10px] font-medium mt-0.5">{t("tabs.explore")}</span>
      </div>
      <div onClick={() => {
        if (currentUser) {
          router.push(`/${locale}/p/${currentUser.username || currentUser.id}/${currentUser.id}`);
        } else {
          handleNav('profile');
        }
      }} className={`flex flex-col items-center justify-center w-16 h-full cursor-pointer ${activeTab === 'profile' ? 'text-emerald-500' : 'text-gray-500 dark:text-[#B0B3B8]'}`}>
        <img src={(currentUser?.profile?.avatarUrl || profileCache.get(currentUser?.id)?.avatarUrl) ? getOptimizedUrl((currentUser?.profile?.avatarUrl || profileCache.get(currentUser?.id)?.avatarUrl), "avatar") : "/default-avatar.svg"} alt="Profile" className={`w-9 h-9 rounded-full object-cover ${activeTab === 'profile' ? 'border-2 border-emerald-500' : 'border border-transparent'}`} />
      </div>
    </div>
  );
}
