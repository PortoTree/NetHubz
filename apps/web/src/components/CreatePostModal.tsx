"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { createPost, updatePost } from "@/app/actions/posts";
import { getUserGalleries, createGallery } from "@/app/actions/galleries";
import { getAllUserProjects } from "@/app/actions/projects";
import { uploadToCloudinary } from "@/utils/uploadImage";
import { MediaRenderer } from "./MediaRenderer";
import { getCaretCoordinates } from "@/utils/getCaretCoordinates";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import GiveawayFormModal, { type GiveawayDraft } from "./GiveawayFormModal";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess?: () => void;
  initialPost?: any;
  startWithMediaModal?: boolean;
  startWithTagModal?: boolean;
  initialGalleryId?: string;
  initialGallery?: any;
  startWithGalleryModal?: boolean;
}

export default function CreatePostModal({ isOpen, onClose, currentUser, onSuccess, initialPost, startWithMediaModal, startWithTagModal, initialGalleryId, initialGallery, startWithGalleryModal }: CreatePostModalProps) {
  const t = useTranslations();
  const [postPrivacy, setPostPrivacy] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE" | "COMMUNITY_ONLY">("PUBLIC");
  const [isPrivacyDropdownOpen, setIsPrivacyDropdownOpen] = useState(false);
  const privacyDropdownRef = useRef<HTMLDivElement>(null);
  
  const [postContent, setPostContent] = useState(initialPost?.content || "");
  const [isPosting, setIsPosting] = useState(false);
  const [postLabel, setPostLabel] = useState<"DEFAULT" | "MENCARI" | "LOKASI" | "PROFESI" | "SEKOLAH">("DEFAULT");
  const [mediaLayout, setMediaLayout] = useState<"GRID" | "CAROUSEL">("GRID");
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaPreviewList, setMediaPreviewList] = useState<{ type: 'file' | 'url'; url: string; file?: File }[]>([]);
  const [mediaTab, setMediaTab] = useState<"file" | "url">("file");
  const [mediaUrlInputs, setMediaUrlInputs] = useState<string[]>([""]);
  const [tempFilePreviews, setTempFilePreviews] = useState<{ url: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [linkPreviewData, setLinkPreviewData] = useState<any>(initialPost?.linkMetadata || null);
  const [isFetchingLink, setIsFetchingLink] = useState(false);

  const [taggedUsers, setTaggedUsers] = useState<any[]>(initialPost?.taggedUsers || []);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [searchTagResults, setSearchTagResults] = useState<any[]>([]);
  const [isSearchingTags, setIsSearchingTags] = useState(false);
  const [isMorePopupOpen, setIsMorePopupOpen] = useState(false);
  const morePopupRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);


  // Project Attachment State
  const [projects, setProjects] = useState<any[]>([]);
  const [attachedProject, setAttachedProject] = useState<any>(initialPost?.project || null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Gallery state
  const [galleries, setGalleries] = useState<any[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>(initialGalleryId || initialPost?.galleryId || "none");
  const [isGalleryDropdownOpen, setIsGalleryDropdownOpen] = useState(false);

  // Sync initialGalleryId when it changes
  useEffect(() => {
    if (initialGalleryId) {
      setSelectedGalleryId(initialGalleryId);
    }
  }, [initialGalleryId]);

  // Sync initialGallery object if provided (useful for newly created galleries before refetch completes)
  useEffect(() => {
    if (initialGallery) {
      setGalleries(prev => {
        if (!prev.find(g => g.id === initialGallery.id)) {
          return [initialGallery, ...prev];
        }
        return prev;
      });
      setSelectedGalleryId(initialGallery.id);
    }
  }, [initialGallery]);
  const galleryDropdownRef = useRef<HTMLDivElement>(null);
  const [isCreateGalleryOpen, setIsCreateGalleryOpen] = useState(startWithGalleryModal || false);
  const [newGalleryName, setNewGalleryName] = useState("");
  const [isCreatingGallery, setIsCreatingGallery] = useState(false);
  const [pendingGalleryName, setPendingGalleryName] = useState<string | null>(null);
  const [noMediaGalleryWarning, setNoMediaGalleryWarning] = useState(false);

  // Inline Mentions State
  const [mentionQuery, setMentionQuery] = useState<{ query: string; position: number; top: number; left: number } | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [inlineTaggedUsernames, setInlineTaggedUsernames] = useState<string[]>([]);

  // Giveaway state
  const [giveawayDraft, setGiveawayDraft] = useState<GiveawayDraft | null>(null);
  const [isGiveawayModalOpen, setIsGiveawayModalOpen] = useState(false);

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchTagQuery.trim()) {
      setSearchTagResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingTags(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTagQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = data.users.filter((u: any) => !taggedUsers.some((tu: any) => tu.id === u.id));
          setSearchTagResults(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingTags(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTagQuery, taggedUsers]);

  useEffect(() => {
    if (!mentionQuery) {
      setMentionResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery.query)}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = data.users.filter((u: any) => u.id !== currentUser?.id);
          setMentionResults(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [mentionQuery?.query, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && isOpen) {
      getUserGalleries(currentUser.id).then(res => {
        if (res.success) {
          setGalleries(res.galleries || []);
        }
      });
    }
  }, [currentUser?.id, isOpen]);

  const handleCreateGallery = async () => {
    if (!newGalleryName.trim()) return;
    setIsCreatingGallery(true);
    
    const newName = newGalleryName.trim();
    const tempId = "pending_new_gallery";
    
    const tempGallery = {
      id: tempId,
      name: newName,
      isPending: true
    };
    
    setGalleries(prev => [tempGallery, ...prev]);
    setSelectedGalleryId(tempId);
    setPendingGalleryName(newName);
    
    setIsCreateGalleryOpen(false);
    setNewGalleryName("");
    setIsCreatingGallery(false);
  };

  const handleContentChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPostContent(text);

    // Filter out inline tags that were deleted from the text
    setTaggedUsers((prev) => prev.filter(user => {
      if (inlineTaggedUsernames.includes(user.username)) {
        return text.includes(`@${user.username}`);
      }
      return true;
    }));

    // Check for @mention trigger
    const cursor = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      const query = lastWord.slice(1);
      const coords = getCaretCoordinates(e.target, cursor);
      const rect = e.target.getBoundingClientRect();
      const top = rect.top + coords.top - e.target.scrollTop + (coords.height || 24);
      const left = rect.left + coords.left;
      
      setMentionQuery({ query, position: cursor, top, left });
    } else {
      setMentionQuery(null);
    }

    setLinkPreviewData((prev: any) => {
      if (prev && !text.includes(prev.url)) {
        return null;
      }
      return prev;
    });

    // Regex to find URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);

    if (matches && matches.length > 0) {
      const url = matches[0];
      
      // Check if it's a media URL
      const isMedia = !!url.match(/\.(mp4|webm|ogg|jpg|jpeg|png|webp|gif)$/i) || 
                      !!url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i) ||
                      !!url.match(/tiktok\.com\/@.*\/video\/(\d+)/i) ||
                      !!url.match(/instagram\.com\/(?:p|reel|tv)\/([^\/?#&]+)/i);

      if (isMedia) {
        if (!mediaPreviewList.some((m: any) => m.url === url) && mediaPreviewList.length < 8) {
          setMediaPreviewList(prev => [...prev, { type: 'url', url }]);
        }
      } else {
        if (!linkPreviewData && !isFetchingLink) {
          setIsFetchingLink(true);
          try {
            const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.title || data.image) {
                setLinkPreviewData((current: any) => {
                  // Only set if the url is still in the text (in case they deleted it while fetching)
                  // We can't access latest text easily, but if they deleted it, 
                  // another onChange will fire and clear it. So just set it.
                  return data;
                });
              }
            }
          } catch (e) {
            console.error(e);
          } finally {
            setIsFetchingLink(false);
          }
        }
      }
    }
  };


  useEffect(() => {
    if (isOpen) {
      setPostContent(initialPost?.content || "");
      setPostPrivacy(initialPost?.visibility || "PUBLIC");
      setPostLabel(initialPost?.label || "DEFAULT");
      setMediaLayout(initialPost?.mediaLayout || "GRID");
      setMediaPreviewList(initialPost?.mediaUrls?.map((url: string) => ({ type: 'url', url })) || []);
      setIsMediaModalOpen(startWithMediaModal || false);
      setIsTagModalOpen(startWithTagModal || false);
      setTaggedUsers(initialPost?.taggedUsers || []);
      setLinkPreviewData(initialPost?.linkMetadata || null);
      setInlineTaggedUsernames([]);
      setMentionQuery(null);
      if (!initialPost) setGiveawayDraft(null);
    }
  }, [isOpen, initialPost, startWithMediaModal, startWithTagModal]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, [isOpen]);

  // Close dropdown on outside click

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (privacyDropdownRef.current && !privacyDropdownRef.current.contains(event.target as Node)) {
        setIsPrivacyDropdownOpen(false);
      }
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setIsLabelDropdownOpen(false);
      }
      if (galleryDropdownRef.current && !galleryDropdownRef.current.contains(event.target as Node)) {
        setIsGalleryDropdownOpen(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let newPreviews: { url: string; file: File }[] = [];
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 3 * 1024 * 1024) {
        alert(`Ukuran gambar ${file.name} melebihi 3MB!`);
        continue;
      }
      if (!validTypes.includes(file.type)) {
        alert(`Format gambar ${file.name} harus JPG, PNG, atau WEBP!`);
        continue;
      }
      newPreviews.push({ url: URL.createObjectURL(file), file });
    }

    const totalAfterUpload = mediaPreviewList.length + tempFilePreviews.length + newPreviews.length;
    if (totalAfterUpload > 8) {
      alert(`Maksimal 8 gambar yang diperbolehkan! Sisa kuota Anda: ${Math.max(0, 8 - (mediaPreviewList.length + tempFilePreviews.length))} gambar.`);
      const remainingSlots = 8 - (mediaPreviewList.length + tempFilePreviews.length);
      newPreviews = newPreviews.slice(0, Math.max(0, remainingSlots));
    }

    setTempFilePreviews([...tempFilePreviews, ...newPreviews]);
  };

  const confirmMedia = () => {
    if (mediaTab === "file" && tempFilePreviews.length > 0) {
      const newMedia = tempFilePreviews.map(p => ({ type: 'file' as const, url: p.url, file: p.file }));
      setMediaPreviewList([...mediaPreviewList, ...newMedia]);
    } else if (mediaTab === "url") {
      const validUrls = mediaUrlInputs.map(u => u.trim()).filter(Boolean);
      if (validUrls.length > 0) {
        if (mediaPreviewList.length + validUrls.length > 8) {
          alert(`Maksimal 8 gambar yang diperbolehkan! Sisa kuota Anda: ${Math.max(0, 8 - mediaPreviewList.length)} gambar.`);
          return;
        }
        const newUrls = validUrls.map(url => ({ type: 'url' as const, url }));
        setMediaPreviewList([...mediaPreviewList, ...newUrls]);
      }
    }
    setTempFilePreviews([]);
    setMediaUrlInputs([""]);
    setIsMediaModalOpen(false);
  };
  
  const removeMedia = (index: number) => {
    const newList = [...mediaPreviewList];
    newList.splice(index, 1);
    setMediaPreviewList(newList);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const handlePost = async () => {
    if (!postContent.trim() && mediaPreviewList.length === 0 && !giveawayDraft) return;
    
    if (selectedGalleryId !== "none" && mediaPreviewList.length === 0) {
      setNoMediaGalleryWarning(true);
      return;
    }
    
    setIsPosting(true);

    try {
      let finalGalleryId = selectedGalleryId !== "none" ? selectedGalleryId : undefined;
      
      if (finalGalleryId === "pending_new_gallery" && pendingGalleryName) {
        const res = await createGallery(currentUser.id, pendingGalleryName);
        if (res.success && res.gallery) {
          finalGalleryId = res.gallery.id;
        } else {
          finalGalleryId = undefined;
        }
      }

      const finalMediaUrls: string[] = [];
      for (const media of mediaPreviewList) {
        if (media.type === 'file' && media.url) {
          const cloudUrl = await uploadToCloudinary(media.url, "post-image");
          finalMediaUrls.push(cloudUrl);
        } else if (media.type === 'url') {
          finalMediaUrls.push(media.url);
        }
      }

      let res;
      if (initialPost) {
        res = await updatePost(initialPost.id, currentUser.id, postContent, postPrivacy, postLabel, mediaLayout, taggedUsers.map((u: any) => u.id)); 
        // Update function doesn't support mediaUrls yet, but we will fix later
      } else {
        res = await createPost({
          authorId: currentUser.id,
          content: postContent,
          visibility: postPrivacy,
          label: postLabel,
          mediaUrls: finalMediaUrls,
          mediaLayout: mediaLayout,
          linkMetadata: linkPreviewData,
          taggedUserIds: taggedUsers.map((u: any) => u.id),
          galleryId: finalGalleryId,
          projectId: attachedProject?.id || undefined,
          giveaway: giveawayDraft ? {
            title: giveawayDraft.title,
            rewardType: giveawayDraft.rewardType,
            rewardLink: giveawayDraft.rewardLink,
            notes: giveawayDraft.notes,
            endsAt: giveawayDraft.endsAt,
            mode: giveawayDraft.mode,
            winnerCount: giveawayDraft.winnerCount,
            maxParticipants: giveawayDraft.maxParticipants,
            minAccountAgeDays: giveawayDraft.minAccountAgeDays,
            requirements: giveawayDraft.requirements.map(r => ({ type: r.type, targetId: r.targetId, url: r.url, platform: r.platform })),
          } : null,
        });
      }

      if (res.success) {
        setPostContent("");
        setTaggedUsers([]);
        setMediaPreviewList([]);
        setLinkPreviewData(null);
        setPostLabel("DEFAULT");
        setPostPrivacy("PUBLIC");
        setMediaLayout("GRID");
        setInlineTaggedUsernames([]);
        setMentionQuery(null);
        setSelectedGalleryId("none");
        setGiveawayDraft(null);
        setAttachedProject(null);
        onClose();
        if (onSuccess) onSuccess();
        // Dispatch custom event to trigger feed refresh
        window.dispatchEvent(new Event("refresh_feed"));
      } else {
        alert("Failed to create post: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center sm:bg-black/60 sm:dark:bg-black/70 sm:px-4">
      <div className={`w-full h-full sm:h-auto sm:max-w-[500px] bg-white dark:bg-[#242526] sm:rounded-xl sm:shadow-xl flex flex-col relative sm:border border-gray-200 dark:border-[#3E4042] ${isPosting ? 'pointer-events-none select-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center max-sm:justify-start justify-center p-4 border-b border-gray-200 dark:border-[#3E4042] relative">
          <h2 className="text-[20px] font-bold text-black dark:text-[#E4E6EB]">{initialPost ? t("feed.editPostModalTitle") : t("feed.createPostModalTitle")}</h2>
          <button onClick={isPosting ? undefined : onClose} disabled={isPosting} className={`absolute right-4 w-9 h-9 bg-gray-200 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-[#4E4F50] active:scale-90 active:bg-gray-300 dark:active:bg-[#4E4F50] transition-all duration-150 text-gray-600 dark:text-[#B0B3B8] select-none ${isPosting ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1 overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <img src={currentUser?.profile?.avatarUrl || "/default-avatar.svg"} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-[#3E4042]" />
            <div>
              <h3 className="font-semibold text-[15px] text-black dark:text-[#E4E6EB]">{currentUser?.profile?.displayName || currentUser?.displayName || currentUser?.username}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="relative" ref={labelDropdownRef}>
                  <button onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)} className="flex items-center gap-1 bg-gray-200 dark:bg-[#3A3B3C] px-2 py-0.5 rounded-md text-[12px] font-semibold text-gray-700 dark:text-[#E4E6EB] active:scale-95 transition-all duration-150 select-none">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    {postLabel === "DEFAULT" ? t("postLabel.default") : postLabel === "MENCARI" ? t("postLabel.mencariShort") : postLabel === "LOKASI" ? t("postLabel.lokasi") : postLabel === "PROFESI" ? t("postLabel.profesi") : t("postLabel.sekolah")}
                    <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  {isLabelDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#242526] rounded-lg shadow-xl border border-gray-200 dark:border-[#3E4042] py-2 z-50">
                      <button onClick={() => { setPostLabel("DEFAULT"); setIsLabelDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                        <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("postLabel.default")}</span>
                      </button>
                      <button onClick={() => { setPostLabel("MENCARI"); setPostPrivacy("PUBLIC"); setIsLabelDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                        <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("postLabel.mencari")}</span>
                      </button>
                      {currentUser?.profile?.locationName && (
                        <button onClick={() => { setPostLabel("LOKASI"); setIsLabelDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                          <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("postLabel.lokasi")}</span>
                        </button>
                      )}
                      {currentUser?.profile?.profession && (
                        <button onClick={() => { setPostLabel("PROFESI"); setIsLabelDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                          <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("postLabel.profesi")}</span>
                        </button>
                      )}
                      {currentUser?.profile?.school && (
                        <button onClick={() => { setPostLabel("SEKOLAH"); setIsLabelDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                          <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("postLabel.sekolah")}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Gallery Dropdown */}
                <div className="relative" ref={galleryDropdownRef}>
                  <button 
                    onClick={() => setIsGalleryDropdownOpen(!isGalleryDropdownOpen)} 
                    disabled={mediaPreviewList.length === 0 && tempFilePreviews.length === 0}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold active:scale-95 transition-all duration-150 select-none ${
                      (mediaPreviewList.length === 0 && tempFilePreviews.length === 0) 
                        ? 'bg-gray-100 dark:bg-[#3A3B3C]/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-[#E4E6EB]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                    {selectedGalleryId === "none" ? "Gallery" : galleries.find(g => g.id === selectedGalleryId)?.name || pendingGalleryName || "Gallery"}
                    <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  {isGalleryDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#242526] rounded-lg shadow-xl border border-gray-200 dark:border-[#3E4042] py-2 z-50">
                      <button onClick={() => { setSelectedGalleryId("none"); setIsGalleryDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                        <svg className="w-4 h-4 text-gray-500 dark:text-[#B0B3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        <span className="text-[14px] font-semibold text-gray-500 dark:text-[#B0B3B8]">{t("feed.noGallery")}</span>
                      </button>
                      {galleries.map(gallery => (
                        <button key={gallery.id} onClick={() => { setSelectedGalleryId(gallery.id); setIsGalleryDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                          <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{gallery.name}</span>
                        </button>
                      ))}
                      <div className="border-t border-gray-200 dark:border-[#3E4042] my-1"></div>
                      <button onClick={() => { setIsCreateGalleryOpen(true); setIsGalleryDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[14px] font-semibold">{t("feed.addGallery")}</span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="relative" ref={privacyDropdownRef}>
                  <button 
                    onClick={() => postLabel !== "MENCARI" && setIsPrivacyDropdownOpen(!isPrivacyDropdownOpen)} 
                    className={`flex items-center gap-1 bg-gray-200 dark:bg-[#3A3B3C] px-2 py-0.5 rounded-md text-[12px] font-semibold text-gray-700 dark:text-[#E4E6EB] active:scale-95 transition-all duration-150 select-none ${postLabel === "MENCARI" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {postPrivacy === "PUBLIC" ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                    )}
                    {postPrivacy === "PUBLIC" ? t("feed.privacyPublic") : postPrivacy === "FRIENDS" ? t("feed.privacyFriends") : t("feed.privacyPrivate")}
                    <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  {isPrivacyDropdownOpen && (
                    <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 w-40 bg-white dark:bg-[#242526] rounded-lg shadow-xl border border-gray-200 dark:border-[#3E4042] py-2 z-50">
                      <button onClick={() => { setPostPrivacy("PUBLIC"); setIsPrivacyDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                        <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" /></svg>
                        <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("feed.privacyPublic")}</span>
                      </button>
                      <button onClick={() => { setPostPrivacy("FRIENDS"); setIsPrivacyDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-left">
                        <svg className="w-5 h-5 text-gray-500 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                        <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("feed.privacyFriends")}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Textarea Layered Preview */}
          <div className="overflow-y-auto max-h-[300px] mt-2 mb-2 relative">
            <div className="relative min-h-[120px]">
              {/* Background preview */}
              <div 
                className="preview-layer absolute inset-0 w-full h-full text-[16px] p-0 m-0 pointer-events-none whitespace-pre-wrap break-words text-black dark:text-[#E4E6EB]"
              >
                {postContent ? (() => {
                  const renderTextFormatting = (text: string, keyPrefix = ''): React.ReactNode => {
                    if (!text) return null;
                    const match = text.match(/(\*[^\*\n]+\*|_[^_\n]+_|~[^~\n]+~)/);
                    if (!match || match.index === undefined) return text;
                    
                    const index = match.index;
                    const matchedStr = match[0];
                    const before = text.slice(0, index);
                    const after = text.slice(index + matchedStr.length);
                    
                    const char = matchedStr[0];
                    const innerText = matchedStr.slice(1, -1);
                    
                    let formattedInner;
                    if (char === '*') {
                      formattedInner = <b key={keyPrefix + 'b'}><span className="text-gray-400 font-normal">*</span>{renderTextFormatting(innerText, keyPrefix + 'in')}<span className="text-gray-400 font-normal">*</span></b>;
                    } else if (char === '_') {
                      formattedInner = <i key={keyPrefix + 'i'}><span className="text-gray-400 font-normal not-italic">_</span>{renderTextFormatting(innerText, keyPrefix + 'in')}<span className="text-gray-400 font-normal not-italic">_</span></i>;
                    } else if (char === '~') {
                      formattedInner = <del key={keyPrefix + 'd'}><span className="text-gray-400 font-normal no-underline">~</span>{renderTextFormatting(innerText, keyPrefix + 'in')}<span className="text-gray-400 font-normal no-underline">~</span></del>;
                    }

                    return (
                      <Fragment key={keyPrefix + 'frag'}>
                        {before}
                        {formattedInner}
                        {renderTextFormatting(after, keyPrefix + 'after')}
                      </Fragment>
                    );
                  };
                  return renderTextFormatting(postContent);
                })() : (
                  <span className="text-gray-500">{t("feed.whatsOnYourMind", { name: currentUser?.profile?.displayName || currentUser?.displayName || currentUser?.username })}</span>
                )}
                {/* trailing space to force newline render */}
                {postContent.endsWith('\n') && <br/>}
              </div>
              
              {/* Foreground textarea */}
              <textarea 
                className="textarea-layer w-full h-full bg-transparent p-0 m-0 border-none outline-none text-[16px] placeholder-transparent min-h-[120px] resize-none overflow-y-hidden z-10 relative caret-black dark:caret-[#E4E6EB]"
                style={{ color: 'transparent' }}
                value={postContent}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  handleContentChange(e);
                }}
                spellCheck={false}
              />
            </div>
            {mentionQuery && (
              <div 
                className="fixed z-[999999] bg-white dark:bg-[#3A3B3C] border border-gray-200 dark:border-[#4E4F50] rounded-xl shadow-xl w-[250px] max-h-48 overflow-y-auto"
                style={{ top: mentionQuery.top, left: mentionQuery.left }}
              >
                {mentionResults.length > 0 ? (
                  mentionResults.map((user) => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors text-left"
                      onClick={() => {
                        const textBefore = postContent.slice(0, mentionQuery.position - mentionQuery.query.length - 1);
                        const textAfter = postContent.slice(mentionQuery.position);
                        const newContent = `${textBefore}@${user.username} ${textAfter}`;
                        setPostContent(newContent);
                        
                        if (!inlineTaggedUsernames.includes(user.username)) {
                          setInlineTaggedUsernames(prev => [...prev, user.username]);
                        }
                        if (!taggedUsers.find(tu => tu.id === user.id)) {
                          setTaggedUsers(prev => [...prev, user]);
                        }
                        setMentionQuery(null);
                      }}
                    >
                      <img src={user.profile?.avatarUrl || "/default-avatar.svg"} className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-[14px] dark:text-[#E4E6EB]">{user.profile?.displayName || user.username}</span>
                        <span className="text-[12px] text-gray-500">@{user.username}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-[13px] text-gray-500 dark:text-[#B0B3B8]">
                    {t("feed.mentionNoUserFound")}
                  </div>
                )}
              </div>
            )}
            {mediaPreviewList.length > 0 && (
              <div className={`grid gap-2 mb-4 ${mediaPreviewList.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {mediaPreviewList.map((media, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video">
                    <div className="w-full h-full pointer-events-none">
                      <MediaRenderer url={media.url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <button onClick={() => removeMedia(idx)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {mediaPreviewList.length > 1 && (
              <div className="mb-4">
                <label className="text-[13px] font-semibold text-gray-500 dark:text-[#B0B3B8] mb-2 block">{t("feed.mediaLayoutTitle")}</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMediaLayout("GRID")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[14px] transition-colors border ${mediaLayout === 'GRID' ? 'bg-[#E7F3FF] dark:bg-[#263951] text-[#1877F2] border-[#1877F2]/20' : 'bg-transparent text-gray-600 dark:text-[#B0B3B8] border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-[#3A3B3C]'}`}
                  >
                    <div className="w-4 h-4 bg-current" style={{ maskImage: "url('/grid.svg')", WebkitMaskImage: "url('/grid.svg')", maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }} />
                    {t("feed.layoutGrid")}
                  </button>
                  <button 
                    onClick={() => setMediaLayout("CAROUSEL")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[14px] transition-colors border ${mediaLayout === 'CAROUSEL' ? 'bg-[#E7F3FF] dark:bg-[#263951] text-[#1877F2] border-[#1877F2]/20' : 'bg-transparent text-gray-600 dark:text-[#B0B3B8] border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-[#3A3B3C]'}`}
                  >
                    <div className="w-4 h-4 bg-current" style={{ maskImage: "url('/carousel.svg')", WebkitMaskImage: "url('/carousel.svg')", maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }} />
                    {t("feed.layoutCarousel")}
                  </button>
                </div>
              </div>
            )}

            
            {/* Tagged Users Preview */}
            {taggedUsers.length > 0 && (
              <div className="mb-4 bg-gray-50 dark:bg-[#242526] border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                  <span className="text-[13px] font-semibold text-gray-600 dark:text-gray-300">
                    Bersama {taggedUsers.length} orang
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {taggedUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-[#3A3B3C] border border-gray-200 dark:border-gray-600 rounded-full pl-1 pr-3 py-1">
                      <img src={user.profile?.avatarUrl || "/default-avatar.svg"} className="w-6 h-6 rounded-full object-cover" />
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold leading-tight dark:text-[#E4E6EB]">{user.profile?.displayName || user.username}</span>
                      </div>
                      <button onClick={() => setTaggedUsers(taggedUsers.filter((u: any) => u.id !== user.id))} className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Link Preview Card */}

            {isFetchingLink && (
              <div className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 bg-gray-50 dark:bg-[#242526]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1877F2] border-t-transparent"></div>
              </div>
            )}
            {!isFetchingLink && linkPreviewData && (
              <div className="relative mb-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-[#242526] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors cursor-pointer">
                <button onClick={() => setLinkPreviewData(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-10 transition-opacity opacity-0 hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <a href={linkPreviewData.url} target="_blank" rel="noopener noreferrer" className="block">
                  {linkPreviewData.image && (
                    <div className="w-full h-48 bg-gray-200 dark:bg-[#3A3B3C] border-b border-gray-200 dark:border-gray-700">
                      <img src={linkPreviewData.image} alt={linkPreviewData.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-[12px] text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1 truncate">{linkPreviewData.domain}</p>
                    <h3 className="font-semibold text-[16px] text-black dark:text-[#E4E6EB] leading-tight mb-1 line-clamp-2">{linkPreviewData.title}</h3>
                    {linkPreviewData.description && (
                      <p className="text-[14px] text-gray-600 dark:text-[#B0B3B8] line-clamp-2">{linkPreviewData.description}</p>
                    )}
                  </div>
                </a>
              </div>
            )}

            {/* Giveaway Summary Card */}
            {giveawayDraft && (
              <div className="mb-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3">
                <div className="flex items-start gap-3">
                  <img src="/navigasi/giveaway.svg" alt="" className="w-8 h-8 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-amber-900 dark:text-amber-200">{t("giveaway.badge")} · {giveawayDraft.rewardType === "GDRIVE_LINK" ? t("giveaway.rewardGdrive") : t("giveaway.rewardOther")}</p>
                    <p className="text-[13px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                      {giveawayDraft.mode === "RANDOM_DRAW" ? t("giveaway.winnersLabel", { count: giveawayDraft.winnerCount || 1 }) : t("giveaway.allEligibleLabel")}
                      {" · "}
                      {giveawayDraft.maxParticipants ? t("giveaway.limitMax") + " " + giveawayDraft.maxParticipants : t("giveaway.limitUnlimited")}
                    </p>
                    <p className="text-[13px] text-amber-800 dark:text-amber-300/90">
                      {t("giveaway.endSection")}: {new Date(giveawayDraft.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => setIsGiveawayModalOpen(true)} className="text-[12px] font-semibold px-2 py-1 rounded-md bg-white/70 dark:bg-black/20 text-amber-900 dark:text-amber-200 hover:bg-white dark:hover:bg-black/30">{t("giveaway.edit")}</button>
                    <button type="button" onClick={() => setGiveawayDraft(null)} className="text-[12px] font-semibold px-2 py-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">{t("giveaway.remove")}</button>
                  </div>
                </div>
              </div>
            )}
          </div>



          
            {attachedProject && (
              <div className="relative mb-4 border border-gray-200 dark:border-[#4E4F50] rounded-xl overflow-hidden p-3 bg-gray-50 dark:bg-[#3A3B3C]/50 flex gap-3">
                <button onClick={() => setAttachedProject(null)} className="absolute top-2 right-2 w-7 h-7 bg-white dark:bg-[#242526] rounded-full shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] z-10">✕</button>
                {attachedProject.coverUrls?.[0] || attachedProject.mediaUrls?.[0] ? (
                  <div className="relative w-20 h-16 shrink-0 border border-gray-200 dark:border-[#4E4F50] rounded-lg overflow-hidden pointer-events-none">
                    <MediaRenderer url={attachedProject.coverUrls?.[0] || attachedProject.mediaUrls?.[0]} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-16 rounded-lg bg-gray-200 dark:bg-[#4E4F50] flex items-center justify-center shrink-0 border border-gray-200 dark:border-[#4E4F50]">
                    <span className="text-[10px] text-gray-500">No Image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 py-1">
                  <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-0.5">Attached Project</div>
                  <div className="font-bold text-[15px] text-gray-900 dark:text-[#E4E6EB] truncate leading-tight">{attachedProject.title}</div>
                  <div className="text-[12px] text-gray-500 dark:text-[#B0B3B8] capitalize mt-0.5">{attachedProject.status?.replace('_', ' ')}</div>
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 mt-auto">
          {/* Extras */}
          <div className="flex items-center justify-end mb-4 relative" ref={emojiPickerRef}>
            <button 
              onClick={() => setIsEmojiPickerOpen(prev => !prev)}
              className="text-gray-400 hover:text-gray-500 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            {isEmojiPickerOpen && (
              <div className="absolute bottom-full right-0 max-sm:-right-2 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden picker-container max-sm:scale-[0.85] max-sm:origin-bottom-right">
                <style>{`
                  .picker-container em-emoji-picker {
                    height: 280px !important;
                    min-height: 280px !important;
                    max-height: 280px !important;
                  }
                `}</style>
                <Picker 
                  data={data} 
                  theme="auto" 
                  previewPosition="none"
                  skinTonePosition="search"
                  onEmojiSelect={(emoji: any) => {
                    setPostContent((prev: string) => prev + emoji.native);
                  }}
                />
              </div>
            )}
          </div>
          {/* Add to your post */}
          <div className="relative flex items-center justify-between border border-gray-300 dark:border-[#4E4F50] rounded-xl p-3 mb-4 shadow-sm">
            <span className="font-semibold text-[15px] text-black dark:text-[#E4E6EB]">{t("feed.addToYourPost")}</span>
            <div className="flex items-center gap-1">
              {/* Photo */}
              <button onClick={() => setIsMediaModalOpen(true)} className="group relative p-1.5 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-90 active:bg-gray-200 dark:active:bg-[#3A3B3C] rounded-full transition-all duration-150 select-none">
                <svg className="w-6 h-6 text-[#45BD62]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {t("feed.addPhoto")}
                </span>
              </button>

              {/* Tag People */}
              <button onClick={() => setIsTagModalOpen(true)} className="group relative p-1.5 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:scale-90 active:bg-gray-200 dark:active:bg-[#3A3B3C] rounded-full transition-all duration-150 select-none">
                <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {t("feed.tagPeople")}
                </span>
              </button>

              {/* Giveaway */}
              <button
                id="create-post-giveaway-btn"
                type="button"
                onClick={() => !initialPost && setIsGiveawayModalOpen(true)}
                disabled={!!initialPost}
                className={`group relative p-1.5 rounded-full transition-all duration-150 active:scale-90 select-none ${giveawayDraft ? "bg-amber-100 dark:bg-amber-500/20" : "hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:bg-gray-200 dark:active:bg-[#3A3B3C]"} ${initialPost ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <img src="/navigasi/giveaway.svg" alt="Giveaway" className="w-6 h-6 object-contain" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {t("feed.giveaway") || "Giveaway"}
                </span>
              </button>

              {/* More / Options */}
              <div className="relative" ref={morePopupRef}>
                <button
                  ref={moreBtnRef}
                  onClick={() => setIsMorePopupOpen(prev => !prev)}
                  className={`group relative p-1.5 rounded-full transition-all duration-150 active:scale-90 select-none ${
                    isMorePopupOpen
                      ? "bg-gray-200 dark:bg-[#3A3B3C]"
                      : "hover:bg-gray-200 dark:hover:bg-[#3A3B3C] active:bg-gray-200 dark:active:bg-[#3A3B3C]"
                  }`}
                >
                  <svg className="w-6 h-6 text-gray-500 dark:text-[#B0B3B8]" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="19" cy="12" r="2"/>
                  </svg>
                  {!isMorePopupOpen && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {t("feed.more") || "Lainnya"}
                    </span>
                  )}
                </button>

                {/* Floating More Popup */}
                {isMorePopupOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-[180px] bg-white dark:bg-[#3A3B3C] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-gray-200 dark:border-[#4E4F50] py-2 z-[200]">
                    {/* Product */}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors opacity-50 cursor-not-allowed">
                      <div className="w-8 h-8 rounded-full bg-[#8B4513]/10 dark:bg-[#CD853F]/10 flex items-center justify-center shrink-0">
                        <div className="w-5 h-5 bg-[#8B4513] dark:bg-[#CD853F]" style={{ WebkitMask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat", mask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat" }} />
                      </div>
                      <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("feed.product") || "Produk"}</span>
                    </button>
                    {/* Project */}
                    <button onClick={() => {
                      setIsProjectModalOpen(true);
                      setIsMorePopupOpen(false);
                      if (projects.length === 0 && !isLoadingProjects && currentUser?.id) {
                        setIsLoadingProjects(true);
                        getAllUserProjects(currentUser.id).then(res => {
                          if (res.success) setProjects(res.projects || []);
                          setIsLoadingProjects(false);
                        });
                      }
                    }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-[#4E4F50] active:scale-[0.98] transition-all duration-150 cursor-pointer select-none">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                        <div className="w-5 h-5 bg-purple-500" style={{ WebkitMask: "url(/navigasi/project.svg) center/contain no-repeat", mask: "url(/navigasi/project.svg) center/contain no-repeat" }} />
                      </div>
                      <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("feed.project") || "Proyek"}</span>
                    </button>
                    {/* Page */}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors opacity-50 cursor-not-allowed">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <img src="/visit.png" alt="Page" className="w-5 h-5 object-contain" />
                      </div>
                      <span className="text-[14px] font-semibold text-black dark:text-[#E4E6EB]">{t("feed.page") || "Halaman"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Post Button */}
          <button 
            onClick={handlePost}
            disabled={(!postContent.trim() && mediaPreviewList.length === 0 && !giveawayDraft) || isPosting}
            className="w-full bg-[#1877F2] hover:bg-blue-600 active:scale-[0.98] active:bg-blue-700 disabled:active:scale-100 disabled:bg-gray-200 disabled:dark:bg-[#4E4F50] text-white disabled:text-gray-400 disabled:dark:text-gray-500 font-semibold py-2 rounded-lg transition-all duration-150 flex justify-center items-center gap-2 select-none"
          >
            {isPosting ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {initialPost ? "Menyimpan..." : "Posting..."}
              </>
            ) : (initialPost ? "Simpan" : "Post")}
          </button>
        </div>

        {/* Submodal for Media Upload */}
        {isMediaModalOpen && (
          <div className="absolute inset-0 bg-white dark:bg-[#242526] z-50 flex flex-col rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMediaModalOpen(false)} className="w-9 h-9 bg-gray-100 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors text-gray-600 dark:text-[#B0B3B8]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-[20px] font-bold text-black dark:text-[#E4E6EB]">{t("feed.addMedia")}</h2>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col overflow-y-auto">
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 shrink-0">
                <button onClick={() => setMediaTab('file')} className={`flex-1 pb-2 text-sm font-semibold transition-colors border-b-2 ${mediaTab === 'file' ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-gray-500'}`}>{t("feed.uploadImage")}</button>
                <button onClick={() => setMediaTab('url')} className={`flex-1 pb-2 text-sm font-semibold transition-colors border-b-2 ${mediaTab === 'url' ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-gray-500'}`}>{t("feed.linkUrl")}</button>
              </div>

              {mediaTab === 'file' ? (
                tempFilePreviews.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0 mb-2">
                      <div className="grid grid-cols-2 gap-2">
                        {tempFilePreviews.map((p, idx) => (
                          <div key={idx} className="relative w-full h-[150px] bg-gray-100 dark:bg-black/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={p.url} alt={`Preview ${idx+1}`} className="w-full h-full object-cover" />
                            <button onClick={() => setTempFilePreviews(tempFilePreviews.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center shrink-0">
                      <button onClick={() => fileInputRef.current?.click()} className="text-sm text-[#1877F2] hover:underline font-semibold">{t("feed.addAnotherPhoto")}</button>
                    </div>
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 min-h-[250px]">
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <p className="text-sm text-gray-500 mb-4 text-center">{t("feed.imageFormatInfo")}</p>
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-gray-100 dark:bg-[#3A3B3C] text-black dark:text-white font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#4E4F50]">
                      {t("feed.chooseImage")}
                    </button>
                  </div>
                )
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar pr-2 pb-4">
                  <div className="space-y-4">
                    {mediaUrlInputs.map((urlInput, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder={t("feed.mediaUrlPlaceholder")} 
                            value={urlInput} 
                            onChange={(e) => {
                              const newInputs = [...mediaUrlInputs];
                              newInputs[index] = e.target.value;
                              setMediaUrlInputs(newInputs);
                            }} 
                            className="flex-1 min-w-0 bg-gray-100 dark:bg-[#3A3B3C] text-black dark:text-white rounded-lg px-4 py-3 outline-none" 
                          />
                          {mediaUrlInputs.length > 1 && (
                            <button 
                              onClick={() => {
                                const newInputs = [...mediaUrlInputs];
                                newInputs.splice(index, 1);
                                setMediaUrlInputs(newInputs);
                              }}
                              className="px-3 shrink-0 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                        {urlInput.match(/^https?:\/\/.*/i) && (
                          <div className="w-full h-[140px] rounded-xl overflow-hidden bg-gray-100 dark:bg-black/50 border border-gray-200 dark:border-gray-700 shrink-0">
                            <MediaRenderer url={urlInput} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {mediaUrlInputs.length + mediaPreviewList.length < 8 && (
                    <button 
                      onClick={() => setMediaUrlInputs([...mediaUrlInputs, ""])}
                      className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-[#3A3B3C] hover:text-[#1877F2] dark:hover:text-[#1877F2] transition-colors"
                    >
                      {t("feed.addUrl")}
                    </button>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 px-1 whitespace-pre-line leading-relaxed">
                    {t("feed.mediaUrlHelper")}
                  </p>
                </div>
              )}
              
              <button 
                onClick={confirmMedia}
                disabled={mediaTab === 'file' ? tempFilePreviews.length === 0 : !mediaUrlInputs.some(u => u.trim())}
                className="w-full mt-4 shrink-0 bg-[#1877F2] hover:bg-blue-600 disabled:bg-gray-200 disabled:dark:bg-[#4E4F50] text-white disabled:text-gray-400 disabled:dark:text-gray-500 font-semibold py-2 rounded-lg transition-colors"
              >
                {t("feed.confirm")}
              </button>
            </div>
          </div>
        )}

        {/* Submodal for Tagging Users */}
        {isTagModalOpen && (
          <div className="absolute inset-0 bg-white dark:bg-[#242526] z-50 flex flex-col rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsTagModalOpen(false)} className="w-9 h-9 bg-gray-100 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors text-gray-600 dark:text-[#B0B3B8]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-[20px] font-bold text-black dark:text-[#E4E6EB]">{t("feed.tagPeople")}</h2>
              </div>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("feed.searchFriendsPlaceholder")}
                  value={searchTagQuery}
                  onChange={(e) => setSearchTagQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#3A3B3C] border-none rounded-full text-[15px] text-black dark:text-[#E4E6EB] focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
                <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              {taggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {taggedUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-blue-50 dark:bg-[#263951] text-[#1877F2] border border-blue-100 dark:border-[#1877F2]/20 rounded-lg px-2.5 py-1.5">
                      <span className="text-[13px] font-semibold">{user.profile?.displayName || user.username}</span>
                      <button onClick={() => setTaggedUsers(taggedUsers.filter((u: any) => u.id !== user.id))} className="text-[#1877F2]/70 hover:text-[#1877F2] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {isSearchingTags ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1877F2] border-t-transparent"></div>
                </div>
              ) : searchTagResults.length > 0 ? (
                searchTagResults.map((user: any) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                  <button
                    key={user.id}
                    disabled={isSelf}
                    onClick={() => {
                      if (isSelf) return;
                      setTaggedUsers([...taggedUsers, user]);
                      setSearchTagQuery("");
                      // Removed setIsTagModalOpen(false) to allow multi-tagging
                    }}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors w-full text-left ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#3A3B3C]'}`}
                  >
                    <img src={user.profile?.avatarUrl || "/default-avatar.svg"} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-[15px] dark:text-[#E4E6EB]">{user.profile?.displayName || user.username} {isSelf && `(${t("feed.you")})`}</span>
                      <span className="text-[13px] text-gray-500">@{user.username}</span>
                    </div>
                  </button>
                )})
              ) : searchTagQuery.trim() ? (
                <div className="text-center text-gray-500 dark:text-[#B0B3B8] py-8">
                  {t("feed.noUserFound")}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-[#B0B3B8] py-8">
                  {t("feed.typeNameToSearch")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* No Media Warning Popup */}
      {noMediaGalleryWarning && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col p-5 border border-gray-200 dark:border-[#3E4042] text-center">
            <h3 className="text-[16px] font-semibold text-black dark:text-[#E4E6EB] mb-6 leading-relaxed">
              Anda menambahkan <span className="font-bold text-blue-500">"{selectedGalleryId === 'pending_new_gallery' ? pendingGalleryName : galleries.find(g => g.id === selectedGalleryId)?.name}"</span> ke dalam gallery, upload atau isi URL media anda.
            </h3>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setNoMediaGalleryWarning(false);
                  setIsMediaModalOpen(true);
                }} 
                className="w-full py-2.5 text-[15px] font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Upload media
              </button>
              <button 
                onClick={() => {
                  setNoMediaGalleryWarning(false);
                  setSelectedGalleryId("none");
                }} 
                className="w-full py-2.5 text-[15px] font-semibold bg-gray-200 dark:bg-[#3A3B3C] hover:bg-gray-300 dark:hover:bg-[#4E4F50] text-gray-800 dark:text-[#E4E6EB] rounded-lg transition-colors"
              >
                Lanjut, tanpa gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Gallery Popup */}
      {isCreateGalleryOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col p-4 border border-gray-200 dark:border-[#3E4042]">
            <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB] mb-4">{t("feed.createGallery")}</h3>
            <input 
              type="text" 
              placeholder={t("feed.galleryNamePlaceholder")}
              value={newGalleryName}
              onChange={(e) => setNewGalleryName(e.target.value)}
              className="w-full bg-gray-100 dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] border border-gray-300 dark:border-[#4E4F50] rounded-lg px-3 py-2 outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsCreateGalleryOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors">
                {t("feed.cancel")}
              </button>
              <button 
                onClick={handleCreateGallery} 
                disabled={!newGalleryName.trim() || isCreatingGallery}
                className="px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isCreatingGallery ? t("feed.saving") : t("feed.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#242526] w-full max-w-md rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 dark:border-[#3E4042]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <h2 className="text-[20px] font-bold text-gray-900 dark:text-[#E4E6EB]">Pilih Proyek</h2>
              <button onClick={() => setIsProjectModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] text-gray-600 dark:text-[#B0B3B8] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {isLoadingProjects ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-[#B0B3B8]">
                  Belum ada proyek. Buat proyek terlebih dahulu di profil kamu.
                </div>
              ) : (
                <div className="flex flex-col py-2">
                  {projects.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setAttachedProject(p);
                        setIsProjectModalOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${attachedProject?.id === p.id ? 'bg-purple-50 dark:bg-purple-500/10' : 'hover:bg-gray-100 dark:hover:bg-[#3A3B3C]'}`}
                    >
                      {p.coverUrls?.[0] || p.mediaUrls?.[0] ? (
                        <div className="relative w-14 h-10 rounded-md overflow-hidden pointer-events-none shrink-0 border border-gray-200 dark:border-[#4E4F50]">
                          <MediaRenderer url={p.coverUrls?.[0] || p.mediaUrls?.[0]} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-10 rounded-md bg-gray-200 dark:bg-[#4E4F50] flex items-center justify-center border border-gray-200 dark:border-[#4E4F50]">
                          <span className="text-[10px] text-gray-500">No Image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-gray-900 dark:text-[#E4E6EB] truncate leading-tight mb-0.5">{p.title}</div>
                        <div className="text-[12px] text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider">{p.status?.replace('_', ' ')}</div>
                      </div>
                      {attachedProject?.id === p.id && (
                        <svg className="w-5 h-5 text-purple-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <GiveawayFormModal
        isOpen={isGiveawayModalOpen}
        onClose={() => setIsGiveawayModalOpen(false)}
        onSave={(draft) => { setGiveawayDraft(draft); setIsGiveawayModalOpen(false); }}
        currentUser={currentUser}
        initial={giveawayDraft}
      />
    </>,
    document.body
  );
}
