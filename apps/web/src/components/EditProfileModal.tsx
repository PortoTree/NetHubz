"use client";

import { useTranslations } from "next-intl";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import CropModal from "@/components/CropModal";
import ProfileMediaSelectionModal from "@/components/ProfileMediaSelectionModal";
import { uploadToCloudinary } from "@/utils/uploadImage";
import { profileCache } from "@/utils/cache";
import { useRouter } from "next/navigation";
import { updateProfileMedia, getProfile, updateDisplayName, updateProfileInfo } from "@/app/actions/profile";
import { getBlockedUsers, handlePrimaryConnectionAction } from "@/app/actions/connections";
import { getOptimizedUrl } from "@/utils/cloudinary";

function CustomSelect({ options, value, onChange, className, columns = 1, getIcon, hideLabelOnDisplay = false, hideArrow = false }: { options: string[], value: string, onChange: (val: string) => void, className?: string, columns?: number, getIcon?: (opt: string) => any, hideLabelOnDisplay?: boolean, hideArrow?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      if (spaceBelow < 250 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <div 
        onClick={toggleOpen}
        className={`flex items-center ${hideLabelOnDisplay ? 'justify-center px-0' : 'justify-between px-4'} w-full py-2.5 rounded-xl bg-gray-50 dark:bg-[#3A3B3C] border border-gray-200 dark:border-gray-600 hover:border-[#10B981] dark:hover:border-[#10B981] cursor-pointer text-gray-900 dark:text-white transition-all shadow-sm`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
           {getIcon && (
             getIcon(value) 
               ? (typeof getIcon(value) === "string" ? <img src={getIcon(value)} alt={value} className="w-5 h-5 object-contain shrink-0" /> : getIcon(value))
               : <div className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full shrink-0"><svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></div>
           )}
           {!hideLabelOnDisplay && <span className="text-sm font-semibold truncate">{value}</span>}
        </div>
        {!hideArrow && <svg className={`w-4 h-4 ${hideLabelOnDisplay ? 'ml-1' : 'ml-2'} shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? (dropUp ? "" : "rotate-180") : (dropUp ? "rotate-180" : "")}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>}
      </div>
      
      {isOpen && (
        <div className={`absolute z-50 ${columns > 1 ? (columns === 4 ? 'w-[340px]' : 'w-[320px]') : (hideLabelOnDisplay ? 'w-[150px]' : 'w-full')} bg-white dark:bg-[#2A2B2C] border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl py-1.5 animate-in fade-in duration-150 ${dropUp ? "bottom-full mb-1.5 slide-in-from-bottom-2" : "top-full mt-1.5 slide-in-from-top-2"} ${columns > 1 ? "grid gap-1 px-1.5 py-2 max-h-[250px] overflow-y-auto custom-scrollbar" : "overflow-hidden"} ${columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : columns === 4 ? "grid-cols-4" : ""}`}>
          {options.map((opt, idx) => {
            const icon = getIcon ? getIcon(opt) : null;
            return (
            <div 
              key={idx}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`${columns > 1 ? "px-2 py-2 rounded-lg justify-center text-center" : "px-4 py-2.5 justify-between"} text-sm font-semibold cursor-pointer transition-colors flex items-center ${columns === 2 ? "gap-2 justify-start text-left" : ""} ${value === opt ? "text-[#10B981] bg-[#10B981]/10" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3B3C]"}`}
            >
              {icon && (typeof icon === "string" ? <img src={icon} alt={opt} className="w-5 h-5 object-contain shrink-0" /> : icon)}
              {!icon && getIcon && <div className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full shrink-0"><svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></div>}
              <span className="flex-1 truncate">{opt}</span>
              {value === opt && columns === 1 && (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
}

const SOFT_SKILLS = ["Accountability","Adaptasi","Analytical Thinking","Assertiveness","Attention to Detail","Bahasa Inggris","Berbicara di Depan Umum","Berpikir Kritis","Classroom Management","Coaching","Communication Skills","Confidence","Continuous Learning","Critical Thinking","Curiosity","Customer Service","Customer-focused","Delegasi","Detail-oriented","Diplomacy","Disiplin","Empati","Enthusiasm","Etos Kerja","Facilitation","Fleksibilitas","Goal-oriented","Humility","Influence","Inisiatif","Innovation","Integritas","Kecerdasan Emosional","Kepemimpinan","Kerja sama tim","Kerja Tim","Kerjasama","Kesabaran","Kesadaran Budaya","Keterampilan Interpersonal","Keterampilan Penjualan","Keterampilan Presentasi","Kolaborasi","Komunikasi","Komunikasi efektif","Koordinasi","Kreativitas","Layanan Pelanggan","Leadership","Manajemen Stres","Manajemen Waktu","Mediation","Mendengarkan Aktif","Mentoring","Motivasi Diri","Multitasking","Negosiasi","Networking","Open-mindedness","Organisasi","Pemecahan Masalah","Pengambilan Keputusan","Perhatian terhadap Detail","Persuasion","Positive Attitude","Presentasi","Proaktif","Problem solving","Process-oriented","Profesionalisme","Public Speaking","Punctuality","Quality-focused","Reliability","Resilience","Resolusi Konflik","Resourcefulness","Results-driven","Self-motivated","Strategic Thinking","Tact","Tanggung Jawab","Teamwork","Time Management","Visionary","Work Ethic"];
const HARD_SKILLS = ["3D Modeling","3D Rendering","A/B Testing","Account Management","Administrasi Jaringan","Airflow","Akuntansi","Analisis Bisnis","Analisis Data","Analisis Keuangan","Analisis Laporan Keuangan","Analisis Statistik","Android Development","Angular","Animasi","Apache Hadoop","Apache Kafka","Apache Spark","App Store Optimization","Application Security","Assessment Design","Audio Editing","Audit","AWS","B2B Sales","B2C Sales","Bash","Big Data","Brand Management","Branding","Budgeting","Business Development","Business Intelligence","C#","C++","CAD","Campaign Management","Candidate Sourcing","Chemical Engineering","CI/CD","Civil Engineering","Clinical Documentation","Cloud Security","Cold Calling","Color Grading","Compensation & Benefits","Competitor Analysis","Compliance","Computer Vision","Content Marketing","Contract Drafting","Contract Review","Conversion Optimization","Copywriting","Cordova","Corporate Law","Cryptography","CSS","Customer Insights","Customs Clearance","Dart","Data Engineering","Data Mining","Data Science","Data Visualization","Data Warehousing","Deep Learning","Demand Planning","Desain Grafis","Desain UI/UX","Desain Web","Digital Illustration","Distribution Management","Django","Docker","Due Diligence","E-commerce Management","E-learning Development","Editing Video","Educational Technology","Electrical Engineering","Electronic Health Records","Email Marketing","Employee Relations","Ethical Hacking","ETL","Event Management","Event Planning","Express.js","Firewall Management","Flask","Flutter","Food & Beverage Service","Forecasting","Fotografi","Freight Forwarding","Front Office Operations","GDPR Compliance","Go","Google Cloud Platform","Growth Hacking","Healthcare Administration","Hospitality Management","Hotel Management","Housekeeping Management","HR Analytics","HTML","IDS/IPS","Illustration","Import/Export","Incident Response","Industrial Engineering","Influencer Marketing","Information Architecture","Instructional Design","Intellectual Property","Interaction Design","Interviewing","Inventory Management","Ionic","iOS Development","ISO 27001","Java","JavaScript","Jetpack Compose","Keamanan Siber","Keras","Kotlin","Kreator Konten","Kubernetes","Labor Law","Laboratory Skills","Laravel","Layout Design","Lead Generation","Lean Manufacturing","Learning Management Systems","Legal Research","Legal Writing","Lesson Planning","Linux","Litigation","Logistics Coordination","Machine Learning","Manajemen Hubungan Pelanggan","Manajemen Inventaris","Manajemen Kualitas","Manajemen Operasional","Manajemen Proyek","Manajemen Rantai Pasokan","Manajemen Risiko","Market Research","Marketing Automation","Marketplace Management","Mechanical Engineering","Medical Billing","Medical Coding","Medical Terminology","Merchandising","Microsoft Azure","Mobile Analytics","Mobile UI Design","MongoDB","Monitoring","Motion Graphics","MySQL","Natural Language Processing","Network Security","Next.js","Node.js","NoSQL","NumPy","Nursing Care","Onboarding","Online Teaching","Order Fulfillment","Organizational Development","Pandas","Patient Care","Payroll Management","Pemasaran Digital","Pembukuan","Penetration Testing","Pengembangan Android","Pengembangan Bisnis","Pengembangan iOS","Pengembangan Kurikulum","Pengujian Perangkat Lunak","Penulisan Konten","Penulisan Teknis","Perencanaan Anggaran","Perencanaan Strategis","Performance Management","Performance Marketing","Perpajakan","Pharmacy Management","PHP","PLC Programming","PostgreSQL","PowerShell","Predictive Analytics","Pricing Strategy","Process Improvement","Procurement","Product Listing","Product Marketing","Project Estimation","Prototyping","Python","PyTorch","Quality Assurance","Quality Control","React","React Native","Recruitment","Redis","Regulatory Affairs","Reservation Systems","Riset Pasar","Ruby","Rust","Sales Forecasting","Sales Strategy","SCADA","Scikit-learn","Security Auditing","SEM","SEO","Shell Scripting","SIEM","Six Sigma","Social Media Marketing","Spring Boot","SQL","Statistical Modeling","Strategic Planning","Supply Chain Management","Swift","SwiftUI","Talent Acquisition","Technical Drawing","TensorFlow","Threat Intelligence","Time Series Analysis","Tour Guiding","Training & Development","Transportation Management","Travel Planning","Tutoring","TypeScript","Typography","Unix","Usability Testing","User Research","Vendor Management","Video Production","Vue.js","Vulnerability Assessment","Warehouse Management","Windows Server","Wireframing","Xamarin"];

const MUSIC_OPTIONS = ["Pop", "Rock", "Jazz", "Hip Hop", "R&B", "Classical", "K-Pop", "Dangdut", "Indie"];
const TV_OPTIONS = ["Drama", "Comedy", "Thriller", "Action", "Anime", "Documentary", "Reality Show"];
const FILM_OPTIONS = ["Action", "Sci-Fi", "Romance", "Horror", "Comedy", "Thriller", "Animation"];
const GAME_OPTIONS = ["RPG", "FPS", "MOBA", "Strategy", "Sports", "Simulation", "Puzzle", "Adventure"];
const SPORT_OPTIONS = ["Sepak Bola", "Basket", "Bulu Tangkis", "Tenis", "F1", "MotoGP", "Renang", "Esports"];

const HOBBIES = ["Membaca","Menulis","Fotografi","Berenang","Lari","Bersepeda","Mendaki","Gaming","Memasak","Baking","Berkebun","Melukis","Menggambar","Desain Grafis","Bermain Musik","Menyanyi","Menari","Traveling","Blogging","Vlogging","Programming","Coding","Otomotif","DIY/Crafting","Yoga","Meditasi","Fitness/Gym","Menonton Film","Anime","Mendengarkan Podcast","Koleksi Barang","Esports","Fotografi Jalanan","Catur","Bulu Tangkis","Sepak Bola","Basket","Tenis","Voli","Snorkeling","Diving","Cinta Alam","Relawan","Kuliner","Biliar"];
const SOFTWARE_SKILLS = ["3ds Max","Adobe After Effects","Adobe Captivate","Adobe Creative Suite","Adobe Illustrator","Adobe InDesign","Adobe Photoshop","Adobe Premiere Pro","Adobe XD","Affinity Designer","Ansible","Apache","Articulate Storyline","Asana","AutoCAD","Blender","Bukalapak","Canva","Capture One","CATIA","Chef","Cinema 4D","CircleCI","CorelDRAW","CRM","Datadog","DaVinci Resolve","Discord","Docker Desktop","Eclipse","ELK Stack","ERP","Excel","Facebook Ads Manager","Figma","Final Cut Pro","Firebase","Framer","Git","GitHub","GitHub Actions","GitLab","GitLab CI","Google Ads","Google Analytics","Google Docs","Google Sheets","Google Workspace","Grafana","HRIS","HubSpot","IntelliJ IDEA","InVision","Jenkins","Jira","Lazada","Lightroom","Magento","Mailchimp","MATLAB","Maya","Microsoft Excel","Microsoft Office","Microsoft PowerPoint","Microsoft Teams","Microsoft Word","Moodle","New Relic","Nginx","Oracle ERP","Point-of-sale (POS)","Postman","Power BI","PrestaShop","Principle","Procreate","Prometheus","ProtoPie","Puppet","QuickBooks","R Studio","Revit","Salesforce","SAP","Shopee","Shopify","Simulink","Sketch","SketchUp","Slack","SolidWorks","Splunk","SPSS","STATA","Substance Painter","Tableau","Terraform","Tokopedia","Travis CI","Trello","Vagrant","VirtualBox","Visual Studio Code","VMware","WooCommerce","WordPress","ZBrush","Zoom"];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  initialTab?: string;
}

function SkillInput({ title, options, selected, onChange, tPlaceholder }: { title: string, options: string[], selected: string[], onChange: (val: string[]) => void, tPlaceholder?: string }) {
  const t = useTranslations("editProfile");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o));
  const exactMatch = options.find(o => o.toLowerCase() === query.trim().toLowerCase());
  const showCustomAdd = query.trim() !== "" && !exactMatch && !selected.includes(query.trim());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (e: any) => {
    setQuery(e.target.value);
    setIsOpen(true);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 220 && rect.top > spaceBelow);
    }
  };

  const addSkill = (skill: string) => {
    onChange([...selected, skill]);
    setQuery("");
    setIsOpen(false);
  };

  const removeSkill = (skill: string) => {
    onChange(selected.filter(s => s !== skill));
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-sm font-semibold border border-[#10B981]/20">
              {s}
              <button onClick={() => removeSkill(s)} className="hover:text-emerald-700 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative">
        <input 
          type="text" 
          value={query}
          onChange={handleInput}
          onFocus={handleInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Just prevent form submission
            }
          }}
          placeholder={tPlaceholder || `${t("searchOrAdd")} ${title.toLowerCase()}...`}
          className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all"
        />
        {isOpen && (filtered.length > 0 || showCustomAdd) && (
          <div className={`absolute z-50 w-full bg-[#1E1E1E] dark:bg-[#1E1E1E] bg-white border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-y-auto custom-scrollbar max-h-[220px] py-1.5 animate-in fade-in zoom-in-95 duration-150 ${dropUp ? "bottom-full mb-1.5 slide-in-from-bottom-2" : "top-full mt-1.5 slide-in-from-top-2"}`}>
            {filtered.slice(0, 50).map(opt => (
              <div 
                key={opt}
                onClick={() => addSkill(opt)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2B2C] hover:text-[#10B981] dark:hover:text-white cursor-pointer transition-colors"
              >
                {opt}
              </div>
            ))}
            {showCustomAdd && (
              <div 
                onClick={() => addSkill(query.trim())}
                className={`px-4 py-2.5 text-sm font-semibold text-[#10B981] hover:bg-gray-100 dark:hover:bg-[#2A2B2C] cursor-pointer transition-colors flex items-center gap-1.5 ${filtered.length > 0 ? 'border-t border-gray-100 dark:border-gray-700/50' : ''}`}
              >
                [+] {query.trim()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditProfileModal({ isOpen, onClose, currentUser, initialTab }: EditProfileModalProps) {
  const t = useTranslations("editProfile");
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || "intro");
  const [mobileSubTab, setMobileSubTab] = useState<string | null>(initialTab || null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
        setMobileSubTab(initialTab);
      } else {
        setActiveTab("intro");
        setMobileSubTab(null);
      }

      // Robust mobile and desktop background scroll lock
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const originalBodyPosition = document.body.style.position;
      const originalBodyTop = document.body.style.top;
      const originalBodyLeft = document.body.style.left;
      const originalBodyRight = document.body.style.right;
      const originalBodyWidth = document.body.style.width;
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.position = originalBodyPosition;
        document.body.style.top = originalBodyTop;
        document.body.style.left = originalBodyLeft;
        document.body.style.right = originalBodyRight;
        document.body.style.width = originalBodyWidth;
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, initialTab]);

  const [displayNameChangesRemaining, setDisplayNameChangesRemaining] = useState(2);
  const [currentDisplayName, setCurrentDisplayName] = useState(currentUser?.username || "User");
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [updateNameStatus, setUpdateNameStatus] = useState<"success" | "error" | null>(null);
  const [updateNameMessage, setUpdateNameMessage] = useState("");

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      setUpdateNameStatus(null);
      setUpdateNameMessage("");
      getProfile(currentUser.id).then(res => {
        if (res.success && res.profile) {
          if (res.profile.avatarUrl) setAvatarPreview(res.profile.avatarUrl);
          if (res.profile.coverUrl) setCoverPreview(res.profile.coverUrl);
          if (res.profile.bio) setBioText(res.profile.bio); else setBioText("");
          if (res.profile.locationName) setLocationName(res.profile.locationName); else setLocationName("");
          if (res.profile.profession) setProfession(res.profile.profession); else setProfession("");
          if (res.profile.education) setEducation(res.profile.education); else setEducation("");
          if (res.profile.websiteUrl) setWebsiteUrl(res.profile.websiteUrl); else setWebsiteUrl("");
          
          if (res.profile.type) {
            setAccountType(res.profile.type);
            setOriginalAccountType(res.profile.type);
          } else {
            setAccountType("PERSONAL");
            setOriginalAccountType("PERSONAL");
          }
          
          if (res.profile.externalLinks) {
            try {
              const parsed = typeof res.profile.externalLinks === 'string' ? JSON.parse(res.profile.externalLinks) : res.profile.externalLinks;
              if (Array.isArray(parsed) && parsed.length > 0) {
                setExternalLinks(parsed);
              } else {
                setExternalLinks([{label: "", url: ""}]);
              }
            } catch (e) {
              setExternalLinks([{label: "", url: ""}]);
            }
          } else if (res.profile.websiteUrl) {
            setExternalLinks([{label: "", url: res.profile.websiteUrl}]);
          } else {
            setExternalLinks([{label: "", url: ""}]);
          }
          if ((res.profile.user as any)?.socialLinks && (res.profile.user as any).socialLinks.length > 0) {
            setSocialLinks((res.profile.user as any).socialLinks.map((s: any) => ({platform: s.platform, url: s.url})));
          } else {
            setSocialLinks([{platform: "Instagram", url: ""}]);
          }

          if ((res.profile.user as any)?.profileSettings) {
            const settings = (res.profile.user as any).profileSettings;
            const mapVis = (val: string) => val === "PRIVATE" ? t("private") : (val === "FRIENDS" ? t("friendsOnly") : t("public"));
            const mapInt = (val: string) => val === "TURN_OFF" ? t("turnOff") : (val === "FRIENDS" ? t("friendsOnly") : t("public"));
            
            if (settings.profileVisibility) setPrivacyAccount(mapVis(settings.profileVisibility));
            if (settings.privacyGender) setPrivacyGender(mapVis(settings.privacyGender));
            if (settings.privacyBirth) setPrivacyBirth(mapVis(settings.privacyBirth));
            if (settings.privacyLoc) setPrivacyLoc(mapVis(settings.privacyLoc));
            if (settings.privacyProf) setPrivacyProf(mapVis(settings.privacyProf));
            if (settings.privacySosmed) setPrivacySosmed(mapVis(settings.privacySosmed));
            if (settings.privacyFriendList) setPrivacyFriendList(mapVis(settings.privacyFriendList));
            if (settings.privacyFollowers) setPrivacyFollowers(mapVis(settings.privacyFollowers));
            if (settings.privacyFollowing) setPrivacyFollowing(mapVis(settings.privacyFollowing));
            if (settings.privacyActivity) setPrivacyActivity(mapVis(settings.privacyActivity));
            if (settings.privacyOwnedGroups) setPrivacyOwnedGroups(mapVis(settings.privacyOwnedGroups));
            if (settings.privacyJoinedGroups) setPrivacyJoinedGroups(mapVis(settings.privacyJoinedGroups));
            if (settings.privacyExternalLink) setPrivacyExternalLink(mapVis(settings.privacyExternalLink));
            if (settings.privacyTag) setPrivacyTag(mapVis(settings.privacyTag));
            if (settings.privacyComment) setPrivacyComment(mapInt(settings.privacyComment));
            if (settings.privacyOnline) setPrivacyOnline(mapInt(settings.privacyOnline));
            if (settings.privacyDM !== undefined) setPrivacyDM(settings.privacyDM ? t("allow") : t("disallow"));
          }

          if (res.profile.gender) setGender(res.profile.gender); else setGender(t("selectPlaceholder"));
          if (res.profile.birthDate) {
            const d = new Date(res.profile.birthDate);
            setDobDay(d.getDate().toString());
            const months = [t("months.jan"), t("months.feb"), t("months.mar"), t("months.apr"), t("months.may"), t("months.jun"), t("months.jul"), t("months.aug"), t("months.sep"), t("months.oct"), t("months.nov"), t("months.dec")];
            setDobMonth(months[d.getMonth()] || months[0]);
            setDobYear(d.getFullYear().toString());
          } else {
            setDobDay(t("selectPlaceholder"));
            setDobMonth(t("selectPlaceholder"));
            setDobYear(t("selectPlaceholder"));
          }
          if (res.profile.displayName) {
            setCurrentDisplayName(res.profile.displayName);
            setDraftDisplayName(res.profile.displayName);
          }
          if (res.profile.softSkills) setSelectedSoft(res.profile.softSkills);
          if (res.profile.hardSkills) setSelectedHard(res.profile.hardSkills);
          if (res.profile.softwareSkills) setSelectedSoftware(res.profile.softwareSkills);
          if (res.profile.hobbies) setSelectedHobby(res.profile.hobbies);
          if (res.profile.music) setSelectedMusic(res.profile.music);
          if (res.profile.tvShows) setSelectedTV(res.profile.tvShows);
          if (res.profile.movies) setSelectedFilm(res.profile.movies);
          if (res.profile.games) setSelectedGame(res.profile.games);
          if (res.profile.sports) setSelectedSport(res.profile.sports);

          
          if (res.profile.displayNameChangeDates) {
            const now = new Date();
            const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            const recentChanges = res.profile.displayNameChangeDates.filter((d: any) => new Date(d) > fifteenDaysAgo);
            setDisplayNameChangesRemaining(2 - recentChanges.length);
          }
        }
      });
    }
  }, [isOpen, currentUser]);

  const handleSaveDisplayName = async () => {
    setUpdateNameStatus(null);
    setUpdateNameMessage("");
    if (!currentUser?.id || draftDisplayName.trim() === "" || draftDisplayName === currentDisplayName) {
      setIsEditingName(false);
      return;
    }
    
    setIsUpdatingName(true);
    const token = localStorage.getItem("token") || "";
    const res = await updateDisplayName(token, currentUser.id, draftDisplayName);
    setIsUpdatingName(false);
    
    if (res.success) {
      if (profileCache.has(currentUser.id)) {
        profileCache.delete(currentUser.id);
      }
      router.refresh();
      window.dispatchEvent(new CustomEvent("profile_updated", { detail: { type: "info" } }));

      setCurrentDisplayName(res.displayName || draftDisplayName);
      if (res.remainingChanges !== undefined) {
        setDisplayNameChangesRemaining(res.remainingChanges);
      }
      setUpdateNameStatus("success");
      setUpdateNameMessage("Berhasil update display name!");
      setTimeout(() => {
        setIsEditingName(false);
        setUpdateNameStatus(null);
      }, 2000);
    } else {
      setUpdateNameStatus("error");
      setUpdateNameMessage("Gagal update: " + res.error);
    }
  };

  const [locationName, setLocationName] = useState("");
  const [profession, setProfession] = useState("");
  const [education, setEducation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [externalLinks, setExternalLinks] = useState<{label: string, url: string}[]>([{label: "", url: ""}]);
  const [socialLinks, setSocialLinks] = useState<{platform: string, url: string}[]>([{platform: "Instagram", url: ""}]);
  const [accountType, setAccountType] = useState("PERSONAL");
  const [originalAccountType, setOriginalAccountType] = useState("PERSONAL");
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

  const handleSaveInfo = async (fieldToClose: (val: boolean) => void, overrides: any = {}) => {
    if (!currentUser?.id) return;
    setIsUpdatingInfo(true);
    
    // Parse DOB back to ISO Date
    let birthDate = null;
    if (dobYear && dobMonth && dobDay) {
       const monthIndex = [t("months.jan"), t("months.feb"), t("months.mar"), t("months.apr"), t("months.may"), t("months.jun"), t("months.jul"), t("months.aug"), t("months.sep"), t("months.oct"), t("months.nov"), t("months.dec")].indexOf(dobMonth);
       if (monthIndex !== -1) {
          birthDate = new Date(parseInt(dobYear), monthIndex, parseInt(dobDay)).toISOString();
       }
    }

    const validLinks = externalLinks.filter(l => l.url.trim() !== "");
    const validSocials = socialLinks.filter(s => s.url.trim() !== "");
    
    const token = localStorage.getItem("token") || "";
    const res = await updateProfileInfo(token, currentUser.id, {
      bio: bioText,
      locationName,
      websiteUrl: validLinks.length > 0 ? validLinks[0].url : "",
      externalLinks: validLinks,
      socialLinks: validSocials,
      education,
      profession,
      gender: gender === t("selectPlaceholder") ? null : gender,
      birthDate,
      softSkills: selectedSoft,
      hardSkills: selectedHard,
      softwareSkills: selectedSoftware,
      hobbies: selectedHobby,
      music: selectedMusic,
      tvShows: selectedTV,
      movies: selectedFilm,
      games: selectedGame,
      sports: selectedSport,
      type: accountType,
      profileVisibility: privacyAccount === t("private") ? "PRIVATE" : (privacyAccount === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyGender: privacyGender === t("private") ? "PRIVATE" : (privacyGender === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyBirth: privacyBirth === t("private") ? "PRIVATE" : (privacyBirth === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyLoc: privacyLoc === t("private") ? "PRIVATE" : (privacyLoc === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyProf: privacyProf === t("private") ? "PRIVATE" : (privacyProf === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacySosmed: privacySosmed === t("private") ? "PRIVATE" : (privacySosmed === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyFriendList: privacyFriendList === t("private") ? "PRIVATE" : (privacyFriendList === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyFollowers: privacyFollowers === t("private") ? "PRIVATE" : (privacyFollowers === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyFollowing: privacyFollowing === t("private") ? "PRIVATE" : (privacyFollowing === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyActivity: privacyActivity === t("private") ? "PRIVATE" : (privacyActivity === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyOwnedGroups: privacyOwnedGroups === t("private") ? "PRIVATE" : (privacyOwnedGroups === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyJoinedGroups: privacyJoinedGroups === t("private") ? "PRIVATE" : (privacyJoinedGroups === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyExternalLink: privacyExternalLink === t("private") ? "PRIVATE" : (privacyExternalLink === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyTag: privacyTag === t("private") ? "PRIVATE" : (privacyTag === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyComment: privacyComment === t("turnOff") ? "TURN_OFF" : (privacyComment === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyOnline: privacyOnline === t("turnOff") ? "TURN_OFF" : (privacyOnline === t("friendsOnly") ? "FRIENDS" : "PUBLIC"),
      privacyDM: privacyDM === t("allow"),
      ...overrides
    });
    setIsUpdatingInfo(false);
    if (res.success) {
      if (profileCache.has(currentUser.id)) {
        profileCache.delete(currentUser.id);
      }
      router.refresh();
      window.dispatchEvent(new CustomEvent("profile_updated", { detail: { type: "info" } }));
      fieldToClose(false);
    } else {
      alert("Gagal menyimpan profil: " + res.error);
    }
  };

  // Intro States
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [isEditingDOB, setIsEditingDOB] = useState(false);
  const [dobDay, setDobDay] = useState(t("selectPlaceholder"));
  const [dobMonth, setDobMonth] = useState(t("selectPlaceholder"));
  const [dobYear, setDobYear] = useState(t("selectPlaceholder"));
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingProfession, setIsEditingProfession] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [isEditingSosmed, setIsEditingSosmed] = useState(false);
  const [isEditingSoftSkill, setIsEditingSoftSkill] = useState(false);
  const [isEditingHardSkill, setIsEditingHardSkill] = useState(false);
  const [isEditingSoftwareSkill, setIsEditingSoftwareSkill] = useState(false);
  const [selectedSoft, setSelectedSoft] = useState<string[]>([]);
  const [selectedHard, setSelectedHard] = useState<string[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const [isEditingHobby, setIsEditingHobby] = useState(false);
  const [selectedHobby, setSelectedHobby] = useState<string[]>([]);
  const [isEditingMusic, setIsEditingMusic] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [isEditingTV, setIsEditingTV] = useState(false);
  const [selectedTV, setSelectedTV] = useState<string[]>([]);
  const [isEditingFilm, setIsEditingFilm] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<string[]>([]);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string[]>([]);
  const [isEditingSport, setIsEditingSport] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string[]>([]);
  

  const [eduCurrent, setEduCurrent] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [bioText, setBioText] = useState("");
  
  // Media States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropType, setCropType] = useState<"avatar" | "cover">("avatar");
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean, title: string, message: string, retryType: "avatar" | "cover" | null }>({ isOpen: false, title: "", message: "", retryType: null });
  
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState<"avatar" | "cover">("avatar");

  const MAX_AVATAR_SIZE = 3.2 * 1024 * 1024; // 3.2MB internal limit
  const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setErrorModal({ isOpen: true, title: t("invalidFormatTitle"), message: t("invalidFormatMessage"), retryType: "avatar" });
        if (avatarInputRef.current) avatarInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        setErrorModal({ isOpen: true, title: t("fileTooLargeTitle"), message: t("fileTooLargeAvatar"), retryType: "avatar" });
        if (avatarInputRef.current) avatarInputRef.current.value = '';
        return;
      }
      setErrorModal(prev => ({ ...prev, isOpen: false }));
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setCropType("avatar");
      setCropModalOpen(true);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setErrorModal({ isOpen: true, title: t("invalidFormatTitle"), message: t("invalidFormatMessage"), retryType: "cover" });
        if (coverInputRef.current) coverInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_COVER_SIZE) {
        setErrorModal({ isOpen: true, title: t("fileTooLargeTitle"), message: t("fileTooLargeCover"), retryType: "cover" });
        if (coverInputRef.current) coverInputRef.current.value = '';
        return;
      }
      setErrorModal(prev => ({ ...prev, isOpen: false }));
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setCropType("cover");
      setCropModalOpen(true);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedUrl: string, typeOverride?: "avatar" | "cover") => {
    const typeToUse = typeOverride || cropType;
    if (typeToUse === "avatar") {
      setAvatarPreview(croppedUrl);
    } else {
      setCoverPreview(croppedUrl);
    }

    try {
      const cloudinaryUrl = await uploadToCloudinary(croppedUrl, "profile-image");
      if (currentUser?.id) {
        const token = localStorage.getItem("token") || "";
        const res = await updateProfileMedia(token, currentUser.id, typeToUse, cloudinaryUrl);
        const finalUrl = res.success && res.url ? res.url : cloudinaryUrl;
        
        // Update local cache for immediate navigation feedback
        if (profileCache.has(currentUser.id)) {
           const cached = profileCache.get(currentUser.id);
           if (typeToUse === 'avatar') cached.avatarUrl = finalUrl;
           else cached.coverUrl = finalUrl;
           profileCache.set(currentUser.id, cached);
        }

        router.refresh();

        // Notify Navbar
        window.dispatchEvent(new CustomEvent("avatar-updated", {
          detail: { type: typeToUse, url: finalUrl }
        }));
        
        // Notify Home & Profile Pages
        window.dispatchEvent(new CustomEvent("profile_updated", {
          detail: { type: typeToUse, url: finalUrl }
        }));
      }
    } catch (error) {
      console.error("Failed to save image:", error);
    }
  };

  const handleSelectLibraryItem = async (url: string) => {
    if (mediaModalType === "avatar") {
      setAvatarPreview(url);
    } else {
      setCoverPreview(url);
    }

    try {
      if (currentUser?.id) {
        const token = localStorage.getItem("token") || "";
        const res = await updateProfileMedia(token, currentUser.id, mediaModalType, url);
        const finalUrl = res.success && res.url ? res.url : url;
        
        if (profileCache.has(currentUser.id)) {
           const cached = profileCache.get(currentUser.id);
           if (mediaModalType === 'avatar') cached.avatarUrl = finalUrl;
           else cached.coverUrl = finalUrl;
           profileCache.set(currentUser.id, cached);
        }

        router.refresh();

        window.dispatchEvent(new CustomEvent("avatar-updated", {
          detail: { type: mediaModalType, url: finalUrl }
        }));
        window.dispatchEvent(new CustomEvent("profile_updated", {
          detail: { type: mediaModalType, url: finalUrl }
        }));
      }
    } catch (error) {
      console.error("Failed to save library image:", error);
    }
  };

  // Form States (for custom selects)
  const [gender, setGender] = useState(t("selectPlaceholder"));
  
  // Privacy States
  const [privacyGender, setPrivacyGender] = useState(t("public"));
  const [privacyBirth, setPrivacyBirth] = useState(t("public"));
  const [privacyLoc, setPrivacyLoc] = useState(t("public"));
  const [privacyProf, setPrivacyProf] = useState(t("public"));
  const [privacySosmed, setPrivacySosmed] = useState(t("public"));
  const [privacyFriendList, setPrivacyFriendList] = useState(t("public"));
  const [privacyComment, setPrivacyComment] = useState(t("public"));
  const [privacyDM, setPrivacyDM] = useState(t("allow"));
  const [privacyTag, setPrivacyTag] = useState(t("public"));
  const [privacyOnline, setPrivacyOnline] = useState(t("public"));
  const [privacyOwnedGroups, setPrivacyOwnedGroups] = useState(t("public"));
  const [privacyJoinedGroups, setPrivacyJoinedGroups] = useState(t("public"));
  const [privacyFollowers, setPrivacyFollowers] = useState(t("public"));
  const [privacyFollowing, setPrivacyFollowing] = useState(t("public"));
  const [privacyActivity, setPrivacyActivity] = useState(t("public"));
  const [privacyAccount, setPrivacyAccount] = useState(t("public"));
  const [privacyExternalLink, setPrivacyExternalLink] = useState(t("public"));

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(false);

  useEffect(() => {
    if (activeTab === "privasi" && currentUser?.token && isOpen) {
      setIsLoadingBlockedUsers(true);
      getBlockedUsers(currentUser.token, currentUser.id).then((res) => {
        if (res.success && res.blocks) {
          setBlockedUsers(res.blocks);
        }
        setIsLoadingBlockedUsers(false);
      });
    }
  }, [currentUser?.id, activeTab, isOpen]);

  if (!isOpen || !mounted) return null;

  const getPrivacyIcon = (val: string) => {
    if (val === t("public")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
    if (val === t("friendsOnly")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
    if (val === t("private")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>;
    if (val === t("turnOff")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
    if (val === t("disallow")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>;
    if (val === t("allow")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>;
    if (val === t("show")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
    if (val === t("hide")) return <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>;
    return null;
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "Instagram": return "/sosmed/instagram.webp";
      case "Whatsapp": return "/sosmed/whatsapp.webp";
      case "Facebook": return "/sosmed/facebook.webp";
      case "Tiktok": return "/sosmed/tiktok.webp";
      case "Github": return "/sosmed/github.webp";
      case "Portotree": return "/sosmed/portotree.webp";
      case "Linkedin": return "/sosmed/linkedin.webp";
      case "Youtube": return "/sosmed/youtube.webp";
      case "Telegram": return "/sosmed/telegram.webp";
      case "Twitter": return "/sosmed/twiter.webp";
      default: return null;
    }
  };

  const getPrefix = (platform: string) => {
    switch (platform) {
      case "Instagram": return "instagram.com/";
      case "Whatsapp": return "wa.me/";
      case "Facebook": return "facebook.com/";
      case "Tiktok": return "tiktok.com/@";
      case "Github": return "github.com/";
      case "Portotree": return "portotree.com/p/";
      case "Linkedin": return "linkedin.com/in/";
      case "Youtube": return "youtube.com/@";
      case "Telegram": return "t.me/";
      case "Twitter": return "twitter.com/";
      default: return "";
    }
  };

  const extractUsername = (val: string, platform: string) => {
    let cleanVal = val.trim();
    const prefix = getPrefix(platform);
    
    if (prefix) {
      // match e.g. https://www.instagram.com/ or instagram.com/
      const regex = new RegExp(`^(https?:\\/\\/)?(www\\.)?${prefix.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'i');
      if (regex.test(cleanVal)) {
        cleanVal = cleanVal.replace(regex, '');
      } else if (cleanVal.toLowerCase().includes(prefix.toLowerCase())) {
        const parts = cleanVal.toLowerCase().split(prefix.toLowerCase());
        cleanVal = cleanVal.substring(cleanVal.length - parts[1].length);
      }
    }
    
    // if still a URL, get last segment
    if (cleanVal.startsWith('http') || cleanVal.includes('.com/')) {
      cleanVal = cleanVal.split('/').filter(Boolean).pop() || cleanVal;
    }
    
    // Clean query params
    cleanVal = cleanVal.split('?')[0];

    // Remove @ if the prefix already includes it or if it's generally not needed in the input
    if ((platform === "Tiktok" || platform === "Youtube") && cleanVal.startsWith('@')) {
       cleanVal = cleanVal.substring(1);
    }
    
    if (platform === "Whatsapp") {
      cleanVal = cleanVal.replace(/\\D/g, '');
    }

    return cleanVal;
  };

  const TABS = [
    { id: "intro", label: t("intro") },
    { id: "dasar", label: t("basicInfo") },
    { id: "tampilan", label: t("appearance") },
    { id: "profesi", label: t("profession") },
    { id: "pendidikan", label: t("education") },
    { id: "links", label: t("links") },
    { id: "sosmed", label: t("socialMedia") },
    { id: "skill", label: t("skill") },
    { id: "hobby", label: t("hobby") },
    { id: "minat", label: t("interests") },
    { id: "privasi", label: t("privacy") }
  ];

  const privacySettings = [
    { label: t("privacyAccount"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyAccount, setState: setPrivacyAccount, key: "profileVisibility" },
    { label: t("privacyDob"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyBirth, setState: setPrivacyBirth, key: "privacyBirth" },
    { label: t("privacyLoc"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyLoc, setState: setPrivacyLoc, key: "privacyLoc" },
    { label: t("privacyFriendList"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyFriendList, setState: setPrivacyFriendList, key: "privacyFriendList" },
    { label: t("privacyFollowers"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyFollowers, setState: setPrivacyFollowers, key: "privacyFollowers" },
    { label: t("privacyComment"), options: [t("public"), t("friendsOnly"), t("turnOff")], state: privacyComment, setState: setPrivacyComment, key: "privacyComment" },
    { label: t("privacyDM"), options: [t("allow"), t("disallow")], state: privacyDM, setState: setPrivacyDM, key: "privacyDM" },
    { label: t("privacyTag"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyTag, setState: setPrivacyTag, key: "privacyTag" },
    { label: t("privacyOnline"), options: [t("public"), t("friendsOnly"), t("turnOff")], state: privacyOnline, setState: setPrivacyOnline, key: "privacyOnline" },
    { label: t("privacyActivity"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyActivity, setState: setPrivacyActivity, key: "privacyActivity" },
    { label: t("privacyOwnedGroups"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyOwnedGroups, setState: setPrivacyOwnedGroups, key: "privacyOwnedGroups" },
    { label: t("privacyJoinedGroups"), options: [t("public"), t("friendsOnly"), t("private")], state: privacyJoinedGroups, setState: setPrivacyJoinedGroups, key: "privacyJoinedGroups" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-4 bg-black/60 overscroll-contain">
      <div className="bg-white dark:bg-[#242526] w-full max-w-5xl rounded-none md:rounded-2xl shadow-2xl flex flex-col h-[100dvh] md:h-[85vh] md:min-h-[600px] md:max-h-[900px] overflow-hidden overscroll-contain animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 md:py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-[#242526]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back Button on Mobile (only shown when inside a tab) */}
            {mobileSubTab && (
              <button 
                onClick={() => setMobileSubTab(null)}
                className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
              <span className="md:hidden">
                {mobileSubTab 
                  ? (TABS.find(t => t.id === mobileSubTab)?.label || t("title")) 
                  : t("title")}
              </span>
              <span className="hidden md:inline">
                {t("title")}
              </span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Sidebar (Kiri) */}
          <div className={`w-full md:w-[260px] shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1E1E1E] flex flex-col ${mobileSubTab ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'}`}>
            {/* Tabs */}
            <div className="flex-1 p-3 space-y-1.5 md:space-y-1 overflow-y-auto custom-scrollbar overscroll-contain">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileSubTab(tab.id);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 md:py-2.5 rounded-xl font-semibold text-sm md:text-[13px] transition-all cursor-pointer text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2A2B2C] ${
                      isActive 
                        ? "md:bg-[#10B981]/15 md:text-[#10B981] md:dark:bg-[#10B981]/10 md:dark:text-[#10B981]" 
                        : "md:text-gray-700 md:hover:bg-gray-200/80 md:dark:text-gray-300 md:dark:hover:bg-[#3A3B3C]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 md:hidden shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content (Kanan) */}
          <div className={`flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 md:px-12 md:py-8 custom-scrollbar bg-white dark:bg-[#242526] overscroll-contain ${mobileSubTab ? 'block' : 'hidden md:block'}`}>
            
            {/* 1. INTRO */}
            {activeTab === "intro" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
                {!isEditingBio ? (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("bioHeader")}</h3>
                      <button onClick={() => setIsEditingBio(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                        <svg className="w-7 h-7 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/></svg>
                        <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("aboutYou")}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("bioHeader")}</h3>
                    
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Edit Bio</label>
                      <textarea 
                        value={bioText}
                        onChange={(e) => { if(e.target.value.length <= 121) setBioText(e.target.value) }}
                        rows={4} 
                        placeholder={t("introduceYourself")} 
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all resize-none"
                      ></textarea>
                      <div className="flex items-center justify-between mt-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <span className="text-xs font-medium text-gray-500">{bioText.length}/121</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setIsEditingBio(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
                        {t("cancel")}
                        </button>
                      <button onClick={() => handleSaveInfo(setIsEditingBio)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50 flex gap-2">
                        {isUpdatingInfo ? "..." : t("save")}
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. INFORMASI DASAR */}
            {activeTab === "dasar" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
                {!isEditingName ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("identity")}</h3>
                    <button onClick={() => setIsEditingName(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors text-[18px]">Aa</div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{currentDisplayName}</span>
                        <span className="text-[13px] font-medium text-gray-500">@{currentUser?.username || "pampam"}</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("identity")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                          {t("displayName")} 
                          <span className={`text-xs ${displayNameChangesRemaining === 0 ? "text-red-500" : "text-gray-500"}`}>
                            {t("displayNameRemaining", { count: displayNameChangesRemaining })}
                          </span>
                        </label>
                        <input 
                          type="text" 
                          value={draftDisplayName} 
                          onChange={(e) => setDraftDisplayName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
                          disabled={displayNameChangesRemaining === 0 || isUpdatingName}
                          className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                        {displayNameChangesRemaining === 0 && (
                          <p className="text-xs text-red-500 mt-1">{t("displayNameLimitReached")}</p>
                        )}
                        {updateNameStatus === "error" && (
                          <p className="text-xs font-bold text-red-500 mt-1">{updateNameMessage}</p>
                        )}
                        {updateNameStatus === "success" && (
                          <p className="text-xs font-bold text-[#10B981] mt-1">{updateNameMessage}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t("username")}</label>
                        <input type="text" defaultValue={currentUser?.username || "pampam"} disabled className="w-full px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-[#2A2B2C] border border-transparent text-gray-500 outline-none cursor-not-allowed" />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                      <button onClick={() => { setIsEditingName(false); setDraftDisplayName(currentDisplayName); }} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
                        {t("cancel")}
                        </button>
                      <button 
                        onClick={handleSaveDisplayName} 
                        disabled={displayNameChangesRemaining === 0 || draftDisplayName === currentDisplayName || isUpdatingName || draftDisplayName.trim() === ""}
                        className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isUpdatingName ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Menyimpan...
                          </>
                        ) : t("save")}
                        </button>
                    </div>
                  </div>
                )}
                {!isEditingGender ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("genderTitle")}</h3>
                    <button onClick={() => setIsEditingGender(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{gender !== t("selectPlaceholder") ? gender : t("addGender")}</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("genderTitle")}</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <CustomSelect options={[t("genderMale"), t("genderFemale"), t("genderOther")]} value={gender} onChange={setGender} />
                      </div>
                      <CustomSelect className="w-[52px] shrink-0" options={[t("public"), t("friendsOnly"), t("private")]} value={privacyGender} onChange={setPrivacyGender} getIcon={getPrivacyIcon} hideLabelOnDisplay={true} hideArrow={true} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                      <button onClick={() => setIsEditingGender(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingGender)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}

                {!isEditingDOB ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("dobTitle")}</h3>
                    <button onClick={() => setIsEditingDOB(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">
                          {dobDay === t("selectPlaceholder") ? t("addDOB") : `${dobDay} ${dobMonth} ${dobYear}`}
                        </span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("dobTitle")}</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <div className="flex gap-2 w-full">
                          <CustomSelect 
                            className="flex-1" 
                            columns={4}
                            options={[t("selectPlaceholder"), ...Array.from({length: 31}, (_, i) => String(i+1))]} 
                            value={dobDay} 
                            onChange={setDobDay} 
                          />
                          <CustomSelect 
                            className="flex-1" 
                            columns={3}
                            options={[t("selectPlaceholder"), t("months.jan"), t("months.feb"), t("months.mar"), t("months.apr"), t("months.may"), t("months.jun"), t("months.jul"), t("months.aug"), t("months.sep"), t("months.oct"), t("months.nov"), t("months.dec")]} 
                            value={dobMonth} 
                            onChange={setDobMonth} 
                          />
                          <CustomSelect 
                            className="flex-1" 
                            columns={4}
                            options={[t("selectPlaceholder"), ...Array.from({length: 100}, (_, i) => String(new Date().getFullYear() - i))]} 
                            value={dobYear} 
                            onChange={setDobYear} 
                          />
                        </div>
                      </div>
                      <CustomSelect className="w-[52px] shrink-0" options={[t("public"), t("friendsOnly"), t("private")]} value={privacyBirth} onChange={setPrivacyBirth} getIcon={getPrivacyIcon} hideLabelOnDisplay={true} hideArrow={true} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                      <button onClick={() => setIsEditingDOB(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingDOB)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}

                {!isEditingLocation ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("locationTitle")}</h3>
                    <button onClick={() => setIsEditingLocation(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{locationName || t("addLocation")}</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("locationTitle")}</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder={t("locationPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all" />
                      </div>
                      <CustomSelect className="w-[52px] shrink-0" options={[t("public"), t("friendsOnly"), t("private")]} value={privacyLoc} onChange={setPrivacyLoc} getIcon={getPrivacyIcon} hideLabelOnDisplay={true} hideArrow={true} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 pb-4">
                      <button onClick={() => setIsEditingLocation(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingLocation)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. TAMPILAN */}
            {activeTab === "tampilan" && (
              <div className="space-y-8 max-w-xl animate-in fade-in duration-200">
                <div>
                  <label className="block text-base font-bold text-gray-900 dark:text-white mb-4">{t("avatarTitle")}</label>
                  <div className="flex items-center gap-6">
                    <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
                    <div onClick={() => { setMediaModalType("avatar"); setMediaModalOpen(true); }} className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 relative group cursor-pointer shadow-sm shrink-0">
                      <img src={getOptimizedUrl(avatarPreview, "avatar") || "/default-avatar.svg"} alt="Avatar" className="w-full h-full object-cover bg-white dark:bg-gray-800" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                    </div>
                    <div>
                      <button onClick={() => { setMediaModalType("avatar"); setMediaModalOpen(true); }} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-semibold transition-colors">{t("avatarBtn")}</button>
                      <p className="text-xs text-gray-500 mt-2">{t("avatarDesc")}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                <div>
                  <label className="block text-base font-bold text-gray-900 dark:text-white mb-4">{t("coverTitle")}</label>
                  <input type="file" ref={coverInputRef} onChange={handleCoverChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
                  <div onClick={() => { setMediaModalType("cover"); setMediaModalOpen(true); }} className="w-full h-[150px] rounded-2xl overflow-hidden relative group cursor-pointer border border-gray-200 dark:border-gray-700">
                    <img src={getOptimizedUrl(coverPreview, "cover") || "/sampul-placeholder.png"} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                        {t("coverBtn")}
                      </span>
                    </div>
                  </div>
                </div>

                
              </div>
            )}

            {/* 4. PROFESI/PEKERJAAN */}
            {activeTab === "profesi" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
                
                {/* Profesi Saat Ini */}
                {!isEditingProfession ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("profNow")}</h3>
                    <button onClick={() => setIsEditingProfession(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{profession || t("addProf")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("profNow")}</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder={t("profPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all" />
                      </div>
                      <CustomSelect className="w-[52px] shrink-0" options={[t("public"), t("friendsOnly"), t("private")]} value={privacyProf} onChange={setPrivacyProf} getIcon={getPrivacyIcon} hideLabelOnDisplay={true} hideArrow={true} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                      <button onClick={() => setIsEditingProfession(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingProfession)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}


              </div>
            )}

            {/* PENDIDIKAN */}
            {activeTab === "pendidikan" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
                {!isEditingEducation ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("eduNow")}</h3>
                    <button onClick={() => setIsEditingEducation(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{education || t("addEdu")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200 pb-20">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("eduNow")}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t("eduSchool")}</label>
                        <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} placeholder={t("eduSchoolPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t("eduDegree")}</label>
                        <input type="text" placeholder={t("eduDegreePlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t("eduStart")}</label>
                          <input type="number" placeholder="2020" className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t("eduEnd")}</label>
                          <input type="number" placeholder="2024" disabled={eduCurrent} className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all ${eduCurrent ? 'bg-gray-100 dark:bg-[#2A2B2C] border-transparent text-gray-400 cursor-not-allowed' : 'bg-transparent border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white'}`} />
                        </div>
                      </div>
                      
                      <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                        <input type="checkbox" checked={eduCurrent} onChange={(e) => setEduCurrent(e.target.checked)} className="w-4 h-4 rounded text-[#10B981] border-gray-300 focus:ring-[#10B981]" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("eduCurrent")}</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <CustomSelect className="w-[140px]" options={[t("public"), t("friendsOnly"), t("private")]} value={privacyProf} onChange={setPrivacyProf} getIcon={getPrivacyIcon} />
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingEducation(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                        <button onClick={() => handleSaveInfo(setIsEditingEducation)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. LINKS */}
            {activeTab === "links" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
                {!isEditingLinks ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("linkTitle")}</h3>
                    <button onClick={() => setIsEditingLinks(true)} className="flex flex-col gap-2 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      {externalLinks.filter(l => l.url.trim() !== "").length > 0 ? (
                        externalLinks.filter(l => l.url.trim() !== "").map((link, idx) => (
                          <div key={idx} className="flex items-center gap-4 w-full">
                            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors shrink-0">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300 truncate">{link.label ? `${link.label} - ${link.url}` : link.url}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors shrink-0">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addLink")}</span>
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("linkTitle")}</h3>
                    
                    <div className="space-y-3">
                      {externalLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-3">
                          <input type="text" value={link.label} onChange={(e) => {
                            const newLinks = [...externalLinks];
                            newLinks[idx].label = e.target.value;
                            setExternalLinks(newLinks);
                          }} placeholder="Label (Ops)" className="w-1/3 px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all" />
                          <input type="text" value={link.url} onChange={(e) => {
                            const newLinks = [...externalLinks];
                            newLinks[idx].url = e.target.value;
                            setExternalLinks(newLinks);
                          }} placeholder="https://website-kamu.com" className="flex-1 px-4 py-2.5 rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-gray-900 dark:text-white outline-none transition-all" />
                          
                          <CustomSelect className="w-[52px] shrink-0" options={[t("public"), t("friendsOnly"), t("private")]} value={privacyExternalLink} onChange={setPrivacyExternalLink} getIcon={getPrivacyIcon} hideLabelOnDisplay={true} hideArrow={true} />
                          <button onClick={() => {
                            if (externalLinks.length > 1) {
                              setExternalLinks(externalLinks.filter((_, i) => i !== idx));
                            } else {
                              setExternalLinks([{label: "", url: ""}]);
                            }
                          }} className={`p-2.5 rounded-xl transition-colors border shrink-0 flex items-center justify-center ${externalLinks.length === 1 && link.url === "" && link.label === "" ? 'text-gray-400 border-transparent cursor-not-allowed' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border-transparent hover:border-red-200 dark:hover:border-red-500/20'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                      
                      {externalLinks.length < 3 && (
                        <button onClick={() => setExternalLinks([...externalLinks, {label: "", url: ""}])} className="text-sm font-bold text-[#10B981] hover:text-emerald-600 flex items-center gap-1.5 px-1 py-1 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                          {t("linkBtn")}
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingLinks(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingLinks)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. SOCIAL MEDIA */}
            {activeTab === "sosmed" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200 pb-32">
                {!isEditingSosmed ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t("socialTitle")}</h3>
                    <button onClick={() => setIsEditingSosmed(true)} className="flex flex-col gap-2 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      {socialLinks.filter(s => s.url.trim() !== "").length > 0 ? (
                        socialLinks.filter(s => s.url.trim() !== "").map((social, idx) => (
                          <div key={idx} className="flex items-center gap-4 w-full">
                            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent shrink-0">
                              <img src={`/sosmed/${social.platform.toLowerCase()}.webp`} alt={social.platform} className="w-5 h-5 object-contain drop-shadow-sm" />
                            </div>
                            <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300 truncate">{social.platform}: {social.url}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          </div>
                          <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addSocial")}</span>
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200 relative z-10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("socialTitle")}</h3>
                    
                    <div className="space-y-3">
                      {socialLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3">
                          <CustomSelect 
                              className="w-[68px] shrink-0" 
                              options={["Instagram", "Whatsapp", "Facebook", "Tiktok", "Github", "Portotree", "Linkedin", "Youtube", "Telegram", "Twitter"]} 
                              value={link.platform} 
                              onChange={(val) => {
                                const newLinks = [...socialLinks];
                                newLinks[idx].platform = val;
                                setSocialLinks(newLinks);
                              }}
                              columns={2}
                              getIcon={getSocialIcon}
                              hideLabelOnDisplay={true}
                            />
                            <div className="flex-1 flex rounded-xl bg-transparent border border-gray-300 dark:border-gray-600 focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981] transition-all overflow-hidden">
                              {getPrefix(link.platform) && (
                                <span className="pl-3 pr-2 py-2.5 text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center bg-gray-100 dark:bg-[#2A2B2C] border-r border-gray-300 dark:border-gray-600 shrink-0 max-w-[140px] overflow-hidden truncate">
                                  {getPrefix(link.platform)}
                                </span>
                              )}
                              <input 
                                type="text" 
                                placeholder={link.platform === "Whatsapp" ? "Your number" : "username"} 
                                value={link.url}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  val = extractUsername(val, link.platform);
                                  const newLinks = [...socialLinks];
                                  newLinks[idx].url = val;
                                  setSocialLinks(newLinks);
                                }}
                                className="flex-1 px-3 py-2.5 bg-transparent text-gray-900 dark:text-white outline-none text-sm w-full min-w-0" 
                              />
                            </div>
                            <CustomSelect className="w-[52px] shrink-0" options={[t("public"), t("friendsOnly"), t("private")]} value={privacySosmed} onChange={setPrivacySosmed} getIcon={getPrivacyIcon} hideLabelOnDisplay={true} hideArrow={true} />
                            <button onClick={() => {
                              if (socialLinks.length > 1) {
                                setSocialLinks(socialLinks.filter((_, i) => i !== idx));
                              } else {
                                setSocialLinks([{platform: "Instagram", url: ""}]);
                              }
                            }} className={`p-2.5 rounded-xl transition-colors border shrink-0 flex items-center justify-center ${socialLinks.length === 1 && link.url === "" ? 'text-gray-400 border-transparent cursor-not-allowed' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border-transparent hover:border-red-200 dark:hover:border-red-500/20'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                      ))}

                      {socialLinks.length < 5 && (
                        <button onClick={() => setSocialLinks([...socialLinks, {platform: "Instagram", url: ""}])} className="text-sm font-bold text-[#10B981] hover:text-emerald-600 flex items-center gap-1.5 px-1 py-1 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                          {t("socialBtn")}
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingSosmed(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingSosmed)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. SKILL */}
            {activeTab === "skill" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200 pb-32">
                
                {/* Soft Skill */}
                {!isEditingSoftSkill ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Soft Skill</h3>
                    <button onClick={() => setIsEditingSoftSkill(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addSoft")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Soft Skill</h3>
                    <SkillInput title="Soft Skill" tPlaceholder={t("searchOrAdd") + " soft skill..."} options={SOFT_SKILLS} selected={selectedSoft} onChange={setSelectedSoft} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingSoftSkill(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingSoftSkill)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}

                {/* Hard Skill */}
                {!isEditingHardSkill ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Hard Skill</h3>
                    <button onClick={() => setIsEditingHardSkill(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addHard")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hard Skill</h3>
                    <SkillInput title="Hard Skill" tPlaceholder={t("searchOrAdd") + " hard skill..."} options={HARD_SKILLS} selected={selectedHard} onChange={setSelectedHard} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingHardSkill(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingHardSkill)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}

                {/* Software Skill */}
                {!isEditingSoftwareSkill ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Software Skill</h3>
                    <button onClick={() => setIsEditingSoftwareSkill(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addSoftware")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Software Skill</h3>
                    <SkillInput title="Software Skill" tPlaceholder={t("searchOrAdd") + " software skill..."} options={SOFTWARE_SKILLS} selected={selectedSoftware} onChange={setSelectedSoftware} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingSoftwareSkill(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingSoftwareSkill)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. HOBBY */}
            {activeTab === "hobby" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200 pb-32">
                
                {!isEditingHobby ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Hobby</h3>
                    <button onClick={() => setIsEditingHobby(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addHobby")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hobby</h3>
                    <SkillInput title="Hobby" tPlaceholder={t("searchOrAdd") + " hobby..."} options={HOBBIES} selected={selectedHobby} onChange={setSelectedHobby} />
                    
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingHobby(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingHobby)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 9. MINAT */}
            {activeTab === "minat" && (
              <div className="space-y-6 max-w-xl animate-in fade-in duration-200 pb-32">
                
                {/* Music */}
                {!isEditingMusic ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Music</h3>
                    <button onClick={() => setIsEditingMusic(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addInterest")} Music</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Music</h3>
                    <SkillInput title="Music" tPlaceholder={t("searchOrAdd") + " Music..."} options={MUSIC_OPTIONS} selected={selectedMusic} onChange={setSelectedMusic} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingMusic(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingMusic)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
                
                {/* TV programmes */}
                {!isEditingTV ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">TV programmes</h3>
                    <button onClick={() => setIsEditingTV(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addInterest")} TV programmes</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">TV programmes</h3>
                    <SkillInput title="TV programmes" tPlaceholder={t("searchOrAdd") + " TV programmes..."} options={TV_OPTIONS} selected={selectedTV} onChange={setSelectedTV} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingTV(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingTV)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
                
                {/* Films */}
                {!isEditingFilm ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Films</h3>
                    <button onClick={() => setIsEditingFilm(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addInterest")} Films</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Films</h3>
                    <SkillInput title="Films" tPlaceholder={t("searchOrAdd") + " Films..."} options={FILM_OPTIONS} selected={selectedFilm} onChange={setSelectedFilm} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingFilm(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingFilm)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
                
                {/* Games */}
                {!isEditingGame ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Games</h3>
                    <button onClick={() => setIsEditingGame(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addInterest")} Games</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Games</h3>
                    <SkillInput title="Games" tPlaceholder={t("searchOrAdd") + " Games..."} options={GAME_OPTIONS} selected={selectedGame} onChange={setSelectedGame} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingGame(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingGame)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
                
                {/* Sports teams and athletes */}
                {!isEditingSport ? (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Sports teams and athletes</h3>
                    <button onClick={() => setIsEditingSport(true)} className="flex items-center gap-4 w-full px-2 py-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-xl transition-colors text-left group">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent text-gray-500 dark:text-gray-400 font-bold group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300">{t("addInterest")} Sports teams and athletes</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sports teams and athletes</h3>
                    <SkillInput title="Sports teams and athletes" tPlaceholder={t("searchOrAdd") + " Sports teams..."} options={SPORT_OPTIONS} selected={selectedSport} onChange={setSelectedSport} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setIsEditingSport(false)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">{t("cancel")}</button>
                      <button onClick={() => handleSaveInfo(setIsEditingSport)} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">{isUpdatingInfo ? "..." : t("save")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 10. PRIVASI */}
            {activeTab === "privasi" && (
              <div className="space-y-4 max-w-xl animate-in fade-in duration-200 pb-8">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("privacy")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("privacyDesc")}</p>
                </div>

                {privacySettings.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#3A3B3C]/40 border border-gray-100 dark:border-gray-700/50 hover:border-[#10B981]/30 transition-colors">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.label}</label>
                    <CustomSelect 
                      className="w-full sm:w-[160px]" 
                      options={item.options} 
                      value={item.state} 
                      onChange={(val) => {
                        item.setState(val);
                        let mappedVal: string | boolean = "PUBLIC";
                        if (val === t("private")) mappedVal = "PRIVATE";
                        else if (val === t("friendsOnly")) mappedVal = "FRIENDS";
                        else if (val === t("turnOff")) mappedVal = "TURN_OFF";
                        
                        if (item.key === "privacyDM") {
                          mappedVal = val === t("allow") ? true : false;
                        }
                        
                        handleSaveInfo(() => {}, { [item.key]: mappedVal });
                      }} 
                      getIcon={getPrivacyIcon} 
                    />
                  </div>
                ))}

                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("blockedAccounts", { fallback: "Akun yang Diblokir" })}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("blockedAccountsDesc", { fallback: "Daftar pengguna yang telah Anda blokir. Mereka tidak dapat melihat profil Anda atau berinteraksi dengan Anda." })}</p>
                  
                  {isLoadingBlockedUsers ? (
                    <div className="flex justify-center p-4">
                      <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="text-center p-6 bg-gray-50 dark:bg-[#3A3B3C]/20 rounded-xl border border-gray-100 dark:border-gray-700/50">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("noBlockedAccounts", { fallback: "Tidak ada akun yang diblokir." })}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {blockedUsers.map((block) => (
                        <div key={block.blockedUser.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#3A3B3C]/40 border border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-3">
                            <img src={block.blockedUser.profile?.avatarUrl ? getOptimizedUrl(block.blockedUser.profile.avatarUrl, "avatar") : "/default-avatar.svg"} alt={block.blockedUser.username} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{block.blockedUser.profile?.displayName || block.blockedUser.username}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">@{block.blockedUser.username}</p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (!currentUser?.token) return;
                              const { handlePrimaryConnectionAction } = await import('@/app/actions/connections');
                              // Assuming handlePrimaryConnectionAction handles unblocking when called, 
                              // wait, actually we have a toggleBlock function! But handlePrimaryConnectionAction isn't exactly toggleBlock.
                              // Let's use toggleBlock from connections.ts
                              const { toggleBlock } = await import('@/app/actions/connections');
                              const res = await toggleBlock(currentUser.token, currentUser.id, block.blockedUser.id);
                              if (res.success && !res.isBlocked) {
                                setBlockedUsers(prev => prev.filter(b => b.blockedUser.id !== block.blockedUser.id));
                              }
                            }}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            {t("unblock", { fallback: "Buka Blokir" })}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Account Type Selection */}
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-[15px] font-bold text-gray-900 dark:text-white mb-3">{t("accountType")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Personal Option */}
                    <div 
                      onClick={() => setAccountType("PERSONAL")}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                        accountType === "PERSONAL" 
                        ? "border-[#10B981] bg-[#10B981]/5 shadow-sm" 
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2A2B2C] hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accountType === "PERSONAL" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <h5 className="font-bold text-gray-900 dark:text-white text-[15px]">{t("personalAccount")}</h5>
                      </div>
                      <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${accountType === "PERSONAL" ? "border-[#10B981]" : "border-gray-300 dark:border-gray-600"}`}>
                        {accountType === "PERSONAL" && <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>}
                      </div>
                    </div>

                    {/* Business Option */}
                    <div 
                      onClick={() => setAccountType("BUSINESS")}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                        accountType === "BUSINESS" 
                        ? "border-[#10B981] bg-[#10B981]/5 shadow-sm" 
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2A2B2C] hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accountType === "BUSINESS" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h5 className="font-bold text-gray-900 dark:text-white text-[15px]">{t("businessAccount")}</h5>
                      </div>
                      <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${accountType === "BUSINESS" ? "border-[#10B981]" : "border-gray-300 dark:border-gray-600"}`}>
                        {accountType === "BUSINESS" && <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>}
                      </div>
                    </div>
                  </div>
                  
                  {accountType !== originalAccountType && (
                    <div className="flex justify-end gap-2 pt-4 mt-2">
                      <button onClick={() => setAccountType(originalAccountType)} className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
                        {t("cancel")}
                      </button>
                      <button onClick={() => handleSaveInfo(() => setOriginalAccountType(accountType), { type: accountType })} disabled={isUpdatingInfo} className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors text-sm disabled:opacity-50">
                        {isUpdatingInfo ? "..." : t("save")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#242526] w-full max-w-sm rounded-[24px] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 border-4 border-red-50 dark:border-red-900/10">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{errorModal.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-[15px] mb-6 leading-relaxed">{errorModal.message}</p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t("cancel")}
                </button>
                <button 
                  onClick={() => {
                    const type = errorModal.retryType;
                    setErrorModal({ ...errorModal, isOpen: false });
                    setTimeout(() => {
                      if (type === "avatar") avatarInputRef.current?.click();
                      if (type === "cover") coverInputRef.current?.click();
                    }, 300);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                  {t("reupload")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        aspect={cropType === "avatar" ? 1 : 3 / 1}
        cropShape={cropType === "avatar" ? "round" : "rect"}
      />
      <ProfileMediaSelectionModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        type={mediaModalType}
        onTriggerUpload={() => {
          if (mediaModalType === "avatar") avatarInputRef.current?.click();
          else coverInputRef.current?.click();
        }}
        onSelectLibraryItem={handleSelectLibraryItem}
      />
    </div>,
    document.body
  );
}
