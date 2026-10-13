"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export interface ProjectDraft {
  id?: string;
  title: string;
  description: string;
  status: "RELEASED" | "IN_PROGRESS" | "SEARCHING_TEAM" | "OPEN_SOURCE";
  techStack: string[];
  repoUrl: string;
  demoUrl: string;
  coverUrls?: string[];
  coverFiles?: File[];
  mediaUrls?: string[];
  roleNeeded: string;
  category?: string;
  customCategory?: string;
  collabTypes?: string[];
  linkedProductUrl?: string;
  isForSale?: boolean;
}

const CATEGORY_GROUPS = {
  SOFTWARE: ["WEB_DEV", "MOBILE_APP", "GAME_DEV", "DATA_AI", "DESKTOP_APP", "OPEN_SOURCE"],
  DESIGN: ["UI_UX", "GRAPHIC_DESIGN", "ANIMATION_3D", "VIDEO_FILM"],
  BUSINESS: ["ECOMMERCE", "SAAS", "FINTECH"],
  HARDWARE: ["IOT", "ROBOTICS", "ELECTRONICS"],
  RESEARCH: ["EDTECH", "RESEARCH"],
  ARTS: ["MUSIC_AUDIO"],
  OTHER: ["OTHER", "SOCIAL_IMPACT"]
};

function getCategoryGroup(cat: string) {
  for (const [group, cats] of Object.entries(CATEGORY_GROUPS)) {
    if (cats.includes(cat)) return group;
  }
  return "SOFTWARE";
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ProjectDraft) => void | Promise<string | void>;
  initial?: ProjectDraft | null;
  isSubmitting?: boolean;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isSubmitting = false
}: ProjectFormModalProps) {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectDraft["status"]>("RELEASED");
  const [techStack, setTechStack] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([""]);
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [coverPreviews, setCoverPreviews] = useState<string[]>([]);
  const [mediaTab, setMediaTab] = useState<"upload" | "link">("upload");
  const [roleNeeded, setRoleNeeded] = useState("");
  const [category, setCategory] = useState("WEB_DEV");
  const [customCategory, setCustomCategory] = useState("");
  const [collabTypes, setCollabTypes] = useState<string[]>([]);
  const [linkedProductUrl, setLinkedProductUrl] = useState("");
  const [isForSale, setIsForSale] = useState(false);
  const [linkWithProduct, setLinkWithProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dynLabels = (() => {
    const group = getCategoryGroup(category);
    switch (group) {
      case "SOFTWARE": return { tech: t("project.dynLabel_software_tech"), repo: t("project.dynLabel_software_repo"), demo: t("project.dynLabel_software_demo") };
      case "DESIGN": return { tech: t("project.dynLabel_design_tech"), repo: t("project.dynLabel_design_repo"), demo: t("project.dynLabel_design_demo") };
      case "BUSINESS": return { tech: t("project.dynLabel_business_tech"), repo: t("project.dynLabel_business_repo"), demo: t("project.dynLabel_business_demo") };
      case "HARDWARE": return { tech: t("project.dynLabel_hardware_tech"), repo: t("project.dynLabel_hardware_repo"), demo: t("project.dynLabel_hardware_demo") };
      case "RESEARCH": return { tech: t("project.dynLabel_research_tech"), repo: t("project.dynLabel_research_repo"), demo: t("project.dynLabel_research_demo") };
      case "ARTS": return { tech: t("project.dynLabel_arts_tech"), repo: t("project.dynLabel_arts_repo"), demo: t("project.dynLabel_arts_demo") };
      default: return { tech: t("project.dynLabel_other_tech"), repo: t("project.dynLabel_other_repo"), demo: t("project.dynLabel_other_demo") };
    }
  })();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setStatus(initial.status || "RELEASED");
      setTechStack(initial.techStack?.join(", ") || "");
      setRepoUrl(initial.repoUrl ? initial.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "") : "");
      setDemoUrl(initial.demoUrl || "");
      setMediaUrls(initial.mediaUrls?.length ? initial.mediaUrls : [""]);
      setCoverUrls(initial.coverUrls || []);
      setCoverPreviews(initial.coverUrls || []);
      setCoverFiles([]);
      if (initial.mediaUrls?.length && !initial.coverUrls?.length) {
        setMediaTab("link");
      } else {
        setMediaTab("upload");
      }
      setRoleNeeded(initial.roleNeeded || "");
      setCategory(initial.category || "WEB_DEV");
      setCustomCategory(initial.customCategory || "");
      setCollabTypes(initial.collabTypes || []);
      setLinkedProductUrl(initial.linkedProductUrl || "");
      setIsForSale(initial.isForSale || false);
      setLinkWithProduct(!!initial.linkedProductUrl);
    } else {
      setTitle("");
      setDescription("");
      setStatus("RELEASED");
      setTechStack("");
      setRepoUrl("");
      setDemoUrl("");
      setMediaUrls([""]);
      setCoverUrls([]);
      setCoverPreviews([]);
      setCoverFiles([]);
      setMediaTab("upload");
      setRoleNeeded("");
      setCategory("WEB_DEV");
      setCustomCategory("");
      setCollabTypes([]);
      setLinkedProductUrl("");
      setIsForSale(false);
      setLinkWithProduct(false);
    }
  }, [isOpen, initial]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSave = () => {
    setError(null);
    if (!title.trim()) {
      return setError(t("project.errTitle"));
    }
    if (!description.trim()) {
      return setError(t("project.errDescriptionReq"));
    }

    let finalRepoUrl = repoUrl.trim();
    if (finalRepoUrl) {
      if (finalRepoUrl.includes("github.com/")) {
        finalRepoUrl = finalRepoUrl.split("github.com/")[1];
      }
      finalRepoUrl = "https://github.com/" + finalRepoUrl.replace(/^\/+/, "");
    }

    let finalDemoUrl = demoUrl.trim();
    if (finalDemoUrl && !/^https?:\/\//i.test(finalDemoUrl)) {
      finalDemoUrl = "https://" + finalDemoUrl;
    }

    const URL_RE = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
    if (finalRepoUrl && !URL_RE.test(finalRepoUrl)) {
      return setError(t("project.errRepoUrl"));
    }
    if (finalDemoUrl && !URL_RE.test(finalDemoUrl)) {
      return setError(t("project.errDemoUrl"));
    }

    let hasMedia = false;

    if (mediaTab === "link") {
      const validLinks = mediaUrls.filter(u => u.trim());
      if (validLinks.length === 0) {
        return setError(t("project.errMediaRequired") || "Silakan masukkan setidaknya satu link media atau upload gambar.");
      }
      hasMedia = true;
      for (const mUrl of validLinks) {
        if (!URL_RE.test(mUrl.trim())) {
          return setError(t("project.errMediaUrl")); 
        }
      }
    } else {
      if (coverFiles.length === 0 && coverUrls.length === 0) {
        return setError(t("project.errMediaRequired") || "Silakan masukkan setidaknya satu link media atau upload gambar.");
      }
      hasMedia = true;
    }

    if (status === "SEARCHING_TEAM" && !roleNeeded.trim()) {
      return setError(t("project.errRoleNeeded"));
    }

    const techArray = techStack
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const projectPayload = {
      id: initial?.id,
      title: title.trim(),
      description: description.trim(),
      status,
      techStack: techArray,
      repoUrl: finalRepoUrl,
      demoUrl: finalDemoUrl,
      mediaUrls: mediaTab === "link" ? mediaUrls.map(u => u.trim()).filter(u => u) : [],
      coverUrls: mediaTab === "upload" ? coverUrls : [],
      coverFiles: mediaTab === "upload" ? coverFiles : [],
      roleNeeded: roleNeeded.trim(),
      category,
      customCategory: category === "OTHER" ? customCategory.trim() : "",
      collabTypes,
      linkedProductUrl: status === "RELEASED" && linkWithProduct ? linkedProductUrl.trim() : "",
      isForSale: status === "RELEASED" ? isForSale : false
    };

    const res = onSave(projectPayload);
    if (res instanceof Promise) {
      res.then(err => {
        if (err) setError(err);
      }).catch(e => {
        setError(e.message || "An error occurred");
      });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 py-6">
      <div 
        className="w-full max-w-[550px] max-h-full overflow-y-auto no-scrollbar md:custom-scrollbar bg-white dark:bg-[#242526] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-center p-4 border-b border-gray-200 dark:border-[#3E4042] bg-white dark:bg-[#242526] rounded-t-2xl">
          <h2 className="text-[20px] font-bold text-black dark:text-[#E4E6EB]">
            {initial ? t("project.editProject") : t("project.addProject")}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            className="absolute right-4 w-9 h-9 bg-gray-100 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors text-gray-600 dark:text-[#B0B3B8] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-[#3A3B3C]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.title")} <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder={t("project.titlePlaceholder")}
              className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between mb-2 border-b border-gray-200 dark:border-[#3E4042]">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => !isSubmitting && setMediaTab("upload")}
                disabled={isSubmitting}
                className={`pb-2 border-b-2 text-[15px] font-semibold transition-colors -mb-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${mediaTab === "upload" ? "border-[#1877F2] text-[#1877F2]" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-gray-200"}`}
              >
                {t("project.uploadMediaTab")}
              </button>
              <button
                type="button"
                onClick={() => !isSubmitting && setMediaTab("link")}
                disabled={isSubmitting}
                className={`pb-2 border-b-2 text-[15px] font-semibold transition-colors -mb-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${mediaTab === "link" ? "border-[#1877F2] text-[#1877F2]" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-gray-200"}`}
              >
                {t("project.linkMediaTab")}
              </button>
            </div>
            <span className="text-red-500 text-[13px] font-semibold pb-2">{t("project.requiredLabel")}</span>
          </div>

          <div className="bg-gray-50/50 dark:bg-[#18191A]/30 border border-gray-200 dark:border-[#3E4042] rounded-xl p-4">

            {mediaTab === "upload" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.coverImage")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                  {coverPreviews.map((preview, idx) => (
                    <div key={idx} className={`relative w-full aspect-video rounded-xl border border-gray-200 dark:border-[#4E4F50] overflow-hidden group ${isSubmitting ? "opacity-50" : ""}`}>
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      {!isSubmitting && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setCoverFiles(prev => prev.filter((_, i) => i !== idx));
                            setCoverPreviews(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {coverPreviews.length < 5 && (
                    <div 
                      onClick={() => !isSubmitting && fileInputRef.current?.click()}
                      className={`w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-[#4E4F50] flex flex-col items-center justify-center transition-colors ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3A3B3C]"}`}
                    >
                      <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="text-gray-500 text-[13px] font-medium">Upload</span>
                    </div>
                  )}
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  multiple
                  disabled={isSubmitting}
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    let total = coverFiles.length + files.length;
                    if (total > 5) {
                      setError(t("project.errMaxFiles"));
                      return;
                    }
                    const validFiles: File[] = [];
                    const validPreviews: string[] = [];
                    for (const f of files) {
                      if (f.size > 3.2 * 1024 * 1024) {
                        setError(t("project.errFileTooLarge"));
                        return;
                      }
                      validFiles.push(f);
                      validPreviews.push(URL.createObjectURL(f));
                    }
                    setCoverFiles(prev => [...prev, ...validFiles]);
                    setCoverPreviews(prev => [...prev, ...validPreviews]);
                    setError(null);
                  }}
                />
                <p className="text-[12px] text-gray-500 mt-1">{t("project.coverImageHint")}</p>
              </div>
            )}

            {mediaTab === "link" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.mediaUrl")}</label>
                <div className="space-y-3">
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        </div>
                        <input 
                          type="url" 
                          value={url} 
                          onChange={e => {
                            const newUrls = [...mediaUrls];
                            newUrls[idx] = e.target.value;
                            setMediaUrls(newUrls);
                          }}
                          disabled={isSubmitting}
                          placeholder={t("project.mediaUrlPlaceholder")}
                          className="w-full bg-white dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl pl-10 pr-4 py-2.5 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      {mediaUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {mediaUrls.length < 10 && (
                    <button
                      type="button"
                      onClick={() => !isSubmitting && setMediaUrls([...mediaUrls, ""])}
                      disabled={isSubmitting}
                      className="text-[14px] font-semibold text-[#1877F2] hover:text-[#166fe5] transition-colors inline-block mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("project.addLink")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">
              {t("project.description")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder={t("project.descriptionPlaceholder")}
              rows={4}
              className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.category")}</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="WEB_DEV">{t("project.cat_WEB_DEV")}</option>
                <option value="MOBILE_APP">{t("project.cat_MOBILE_APP")}</option>
                <option value="GAME_DEV">{t("project.cat_GAME_DEV")}</option>
                <option value="DATA_AI">{t("project.cat_DATA_AI")}</option>
                <option value="DESKTOP_APP">{t("project.cat_DESKTOP_APP")}</option>
                <option value="OPEN_SOURCE">{t("project.cat_OPEN_SOURCE")}</option>
                <option value="UI_UX">{t("project.cat_UI_UX")}</option>
                <option value="GRAPHIC_DESIGN">{t("project.cat_GRAPHIC_DESIGN")}</option>
                <option value="ANIMATION_3D">{t("project.cat_ANIMATION_3D")}</option>
                <option value="VIDEO_FILM">{t("project.cat_VIDEO_FILM")}</option>
                <option value="MUSIC_AUDIO">{t("project.cat_MUSIC_AUDIO")}</option>
                <option value="ECOMMERCE">{t("project.cat_ECOMMERCE")}</option>
                <option value="SAAS">{t("project.cat_SAAS")}</option>
                <option value="FINTECH">{t("project.cat_FINTECH")}</option>
                <option value="SOCIAL_IMPACT">{t("project.cat_SOCIAL_IMPACT")}</option>
                <option value="IOT">{t("project.cat_IOT")}</option>
                <option value="ROBOTICS">{t("project.cat_ROBOTICS")}</option>
                <option value="ELECTRONICS">{t("project.cat_ELECTRONICS")}</option>
                <option value="EDTECH">{t("project.cat_EDTECH")}</option>
                <option value="RESEARCH">{t("project.cat_RESEARCH")}</option>
                <option value="OTHER">{t("project.cat_OTHER")}</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.status")}</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="RELEASED">{t("project.statusReleased")}</option>
                <option value="IN_PROGRESS">{t("project.statusInProgress")}</option>
                <option value="OPEN_SOURCE">{t("project.statusOpenSource")}</option>
                <option value="SEARCHING_TEAM">{t("project.statusSearchingTeam")}</option>
              </select>
            </div>
          </div>

          {category === "OTHER" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.customCategory")} <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={customCategory} 
                onChange={e => setCustomCategory(e.target.value)}
                disabled={isSubmitting}
                placeholder={t("project.customCategoryPlaceholder")}
                className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {status === "SEARCHING_TEAM" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{t("project.roleNeeded")} <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={roleNeeded} 
                onChange={e => setRoleNeeded(e.target.value)}
                disabled={isSubmitting}
                placeholder={t("project.roleNeededPlaceholder")}
                className="w-full bg-blue-50 dark:bg-[#263951] border border-blue-200 dark:border-[#1877F2]/30 rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-blue-300 dark:placeholder-blue-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[12px] text-gray-500 mt-1">{t("project.roleNeededHint")}</p>
            </div>
          )}

          {status === "RELEASED" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4 bg-gray-50/50 dark:bg-[#18191A]/30 border border-gray-200 dark:border-[#3E4042] rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isForSale}
                    onChange={e => setIsForSale(e.target.checked)}
                    disabled={isSubmitting}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#4E4F50] rounded flex items-center justify-center peer-checked:border-[#1877F2] peer-checked:bg-[#1877F2] transition-colors group-hover:border-[#1877F2]/50">
                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 relative group/tooltip">
                  <span className="text-[14.5px] font-medium text-gray-700 dark:text-[#E4E6EB] select-none">{t("project.isForSaleToggle")}</span>
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[220px] p-2 bg-gray-900 dark:bg-gray-800 text-white text-[12px] rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 text-center pointer-events-none">
                    {t("project.isForSaleTooltip")}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={linkWithProduct}
                    onChange={e => setLinkWithProduct(e.target.checked)}
                    disabled={isSubmitting}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#4E4F50] rounded flex items-center justify-center peer-checked:border-[#1877F2] peer-checked:bg-[#1877F2] transition-colors group-hover:border-[#1877F2]/50">
                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 relative group/tooltip">
                  <span className="text-[14.5px] font-medium text-gray-700 dark:text-[#E4E6EB] select-none">{t("project.linkProductToggle")}</span>
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[260px] p-2 bg-gray-900 dark:bg-gray-800 text-white text-[12px] rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 text-center pointer-events-none">
                    {t("project.linkProductTooltip")}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                  </div>
                </div>
              </label>
              
              {linkWithProduct && (
                <div className="pt-2">
                  <label className="block text-[13px] font-semibold text-gray-600 dark:text-[#B0B3B8] mb-1.5">{t("project.productLink")}</label>
                  <input 
                    type="url" 
                    value={linkedProductUrl} 
                    onChange={e => setLinkedProductUrl(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={t("project.productLinkPlaceholder")}
                    className="w-full bg-white dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-2.5 text-black dark:text-[#E4E6EB] text-[14.5px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{dynLabels.tech}</label>
            <input 
              type="text" 
              value={techStack} 
              onChange={e => setTechStack(e.target.value)}
              disabled={isSubmitting}
              placeholder={t("project.techStackPlaceholder")}
              className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl px-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-[12px] text-gray-500 mt-1">{t("project.techStackHint")}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{dynLabels.repo}</label>
              {getCategoryGroup(category) === "SOFTWARE" || getCategoryGroup(category) === "OPEN_SOURCE" ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none gap-1.5">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    <span className="text-gray-400 font-medium text-[15px]">github.com/</span>
                  </div>
                  <input 
                    type="text" 
                    value={repoUrl} 
                    onChange={e => {
                      let val = e.target.value;
                      if (val.includes("github.com/")) val = val.split("github.com/")[1];
                      setRepoUrl(val.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^\/+/, ""));
                    }}
                    disabled={isSubmitting}
                    placeholder="username/repo"
                    className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl pl-[125px] pr-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </div>
                  <input 
                    type="url" 
                    value={repoUrl} 
                    onChange={e => setRepoUrl(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://..."
                    className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl pl-10 pr-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-[14px] font-semibold text-gray-700 dark:text-[#E4E6EB] mb-1.5">{dynLabels.demo}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                </div>
                <input 
                  type="url" 
                  value={demoUrl} 
                  onChange={e => setDemoUrl(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="https://..."
                  className="w-full bg-gray-50 dark:bg-[#3A3B3C] border border-gray-300 dark:border-[#4E4F50] rounded-xl pl-10 pr-4 py-3 text-black dark:text-[#E4E6EB] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-shadow placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-3 mt-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-[#3E4042] bg-gray-50/50 dark:bg-[#242526] flex items-center gap-3 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold text-gray-600 dark:text-[#B0B3B8] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("project.cancel")}
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold bg-[#1877F2] hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="opacity-90">{t("project.saveChanges")}...</span>
              </>
            ) : (
              initial ? t("project.saveChanges") : t("project.addProject")
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
