import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface ProfileSuggestionProps {
  profile: any;
  username: string;
  userId: string;
  forceCollapse?: boolean;
  isMobileCard?: boolean;
}

export default function ProfileSuggestion({ profile, username, userId, forceCollapse, isMobileCard }: ProfileSuggestionProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("profileSuggestion");

  const wajibFilled = profile ? !!(profile.locationName && profile.birthDate && profile.avatarUrl && profile.coverUrl) : false;

  const [isExpanded, setIsExpanded] = useState(forceCollapse ? false : !wajibFilled);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile && !forceCollapse) {
      const isWajibFilled = !!(profile.locationName && profile.birthDate && profile.avatarUrl && profile.coverUrl);
      setIsExpanded(!isWajibFilled);
    }
  }, [profile, forceCollapse]);

  if (!mounted || !profile) return null;

  const missingWajib = [];
  if (!profile.locationName) missingWajib.push({ label: t("labels.location"), tab: "dasar" });
  if (!profile.birthDate) missingWajib.push({ label: t("labels.birthDate"), tab: "dasar" });
  if (!profile.avatarUrl) missingWajib.push({ label: t("labels.avatar"), tab: "tampilan" });
  if (!profile.coverUrl) missingWajib.push({ label: t("labels.cover"), tab: "tampilan" });

  const missingNonWajib = [];
  if (!profile.profession) missingNonWajib.push({ label: t("labels.profession"), tab: "profesi" });
  if (!profile.education) missingNonWajib.push({ label: t("labels.education"), tab: "pendidikan" });
  const hasSocialLinks = (profile.socialLinks && profile.socialLinks.length > 0) || (profile.user?.socialLinks && profile.user.socialLinks.length > 0);
  if (!hasSocialLinks) missingNonWajib.push({ label: t("labels.social"), tab: "sosmed" });
  if (!profile.hobbies || profile.hobbies.length === 0) missingNonWajib.push({ label: t("labels.hobby"), tab: "hobby" });
  
  const hasMinat = (profile.movies?.length > 0) || (profile.music?.length > 0) || (profile.sports?.length > 0) || (profile.games?.length > 0) || (profile.tvShows?.length > 0);
  if (!hasMinat) missingNonWajib.push({ label: t("labels.interests"), tab: "minat" });

  if (missingWajib.length === 0 && missingNonWajib.length === 0) {
    return null;
  }

  const handleNavigate = (tab: string) => {
    router.push(`/${locale}/p/${username}/${userId}?edit=true&editTab=${tab}`);
  };

  const content = (
    <>
      <div 
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold text-[14px] text-gray-800 dark:text-[#E4E6EB] leading-none mt-[1px]">{t("title")}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-2 pb-2 pt-1 mt-1">
          <p className="text-[12px] text-gray-500 dark:text-[#B0B3B8] pb-3 mb-3 leading-relaxed border-b border-gray-200 dark:border-[#3E4042]">
            {t("subtitle")}
          </p>
          <div className="space-y-1.5 mt-2">
            {missingWajib.map((item, idx) => (
              <div key={`w-${idx}`} className="flex items-center justify-between">
                <span className="text-[13px] text-gray-700 dark:text-[#E4E6EB]">{item.label}</span>
                <button 
                  onClick={() => handleNavigate(item.tab)}
                  className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  {t("addAction")}
                </button>
              </div>
            ))}
            {missingNonWajib.map((item, idx) => (
              <div key={`n-${idx}`} className="flex items-center justify-between">
                <span className="text-[13px] text-gray-700 dark:text-[#E4E6EB]">{item.label}</span>
                <button 
                  onClick={() => handleNavigate(item.tab)}
                  className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  {t("addAction")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (isMobileCard) {
    return (
      <div className="block lg:hidden w-full px-0 sm:px-0">
        <div className="bg-transparent sm:bg-white sm:dark:bg-[#242526] mb-2 sm:mb-4 sm:rounded-xl shadow-none sm:shadow-sm border-0 sm:border border-b border-gray-200 dark:border-[#3E4042] sm:border-gray-100 sm:dark:border-[#3E4042] pt-2 pb-3 sm:py-3 px-2 sm:px-4">
          <div className="mb-0">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-0 lg:mb-6">
      {content}
    </div>
  );
}
