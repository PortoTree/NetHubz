
"use client";

import React, { useState, useEffect, use, useLayoutEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import PostFeed from "@/components/PostFeed";
import HorizontalProjectCard from "@/components/HorizontalProjectCard";
import EditProfileModal from "@/components/EditProfileModal";
import CropModal from "@/components/CropModal";
import ProfileMediaSelectionModal from "@/components/ProfileMediaSelectionModal";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import { ShinyButton } from "@/components/ui/shiny-button";
import { uploadToCloudinary } from "@/utils/uploadImage";
import { updateProfileMedia, deleteProfileMedia, getProfile, getProfileStats } from "@/app/actions/profile";
import toast from "react-hot-toast";
import { getUserGalleries, createGallery, updateGallery, deleteGallery, deleteMediaFromGallery, moveMediaToAnotherGallery, setGalleryCover } from "@/app/actions/galleries";
import { getConnectionStatus, handlePrimaryConnectionAction, toggleBlock, removeFollower } from "@/app/actions/connections";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { MediaRenderer } from "@/components/MediaRenderer";
import { createProject, getUserProjects, deleteProject, updateProject } from "@/app/actions/projects";
import CreatePostModal from "@/components/CreatePostModal";
import ProjectFormModal, { ProjectDraft } from "@/components/ProjectFormModal";

import { profileCache, connectionCache, galleryCache, projectsCache, notifyConnectionChanged } from "@/utils/cache";

// Merges Global-Cache bio (getProfile) with SWR stats (getProfileStats).
// If stats are unavailable, previous stats in the client cache are preserved to avoid UI flicker.
function mergeProfileStats(profile: any, stats: any) {
  if (!profile) return profile;
  const prevUser = profileCache.get(profile.userId)?.user || {};
  const statsPart = stats || {
    followers: prevUser.followers,
    following: prevUser.following,
    friendshipsAsUser: prevUser.friendshipsAsUser,
    friendshipsAsFriend: prevUser.friendshipsAsFriend,
    _count: prevUser._count,
  };
  return { ...profile, user: { ...profile.user, ...statsPart } };
}

function ProfilePageContent({
  params,
}: {
  params: Promise<{ locale: string; username: string; id: string }>;
}) {
  const t = useTranslations("profile");
  const tEdit = useTranslations("editProfile");
  const tFeed = useTranslations("feed");
  const tProject = useTranslations("project");
  const tMedia = useTranslations("profileMediaOptions");

  const getMediaThumbnail = (url: string, type: 'thumb' | 'feed' | 'preview' = 'thumb') => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return getOptimizedUrl(url, type);
  };

  const unwrappedParams = use(params);
  const username = unwrappedParams.username ? decodeURIComponent(unwrappedParams.username) : "pampam";
  const id = unwrappedParams.id || "123";
  const locale = unwrappedParams.locale || "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlGalleryId = searchParams.get("galleryId");

  const [activeTab, setActiveTab] = useState(urlTab || "posts");
  const [currentUser, setCurrentUser] = useState<any>({ username: "Guest", id: "1" });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(searchParams.get("edit") === "true");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isProfileOptionsOpen, setIsProfileOptionsOpen] = useState(false);

  // Use cache to initialize states if available
  const cachedProfile = profileCache.get(id);

  // Media states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(cachedProfile?.avatarUrl || null);
  const [coverPreview, setCoverPreview] = useState<string | null>(cachedProfile?.coverUrl || null);
  const [displayName, setDisplayName] = useState<string | null>(cachedProfile?.displayName || null);
  const [profileData, setProfileData] = useState<any>(cachedProfile || null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!cachedProfile);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>({
    isFollowing: false,
    friendshipStatus: null,
    friendshipRequestedBy: null,
    isBlocked: false,
    hasBlockedYou: false
  });
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [needsExpansion, setNeedsExpansion] = useState(false);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropType, setCropType] = useState<"avatar" | "cover">("avatar");

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean, title: string, message: string, retryType: "avatar" | "cover" | null }>({ isOpen: false, title: "", message: "", retryType: null });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState<"avatar" | "cover">("avatar");
  const [mediaActionMenu, setMediaActionMenu] = useState<{
    type: "avatar" | "cover";
    coords: { x: number; y: number };
  } | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  const handleDeleteProfileMedia = async () => {
    if (!mediaActionMenu || isDeletingMedia) return;
    const typeToDelete = mediaActionMenu.type;
    if (!window.confirm(tMedia("deleteConfirm"))) return;

    setIsDeletingMedia(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await deleteProfileMedia(token, profileData?.id || currentUser?.id, typeToDelete);
      if (res.success) {
        if (typeToDelete === "avatar") {
          setAvatarPreview(null);
        } else {
          setCoverPreview(null);
        }
        window.dispatchEvent(new CustomEvent('profile-media-updated', {
          detail: { type: typeToDelete, url: null }
        }));
        toast.success(tMedia("deleteSuccess"));
        setMediaActionMenu(null);
      } else {
        toast.error(tMedia("deleteFailed"));
      }
    } catch (e) {
      console.error(e);
      toast.error(tMedia("deleteFailed"));
    } finally {
      setIsDeletingMedia(false);
    }
  };

  // Gallery states
  const [galleries, setGalleries] = useState<any[]>([]);
  const [isLoadingGalleries, setIsLoadingGalleries] = useState(true);
  const [isCreateGalleryOpen, setIsCreateGalleryOpen] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState("");
  const [isCreatingGallery, setIsCreatingGallery] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projects, setProjects] = useState<any[]>(() => projectsCache.get(id)?.projects || []);
  const [hasMoreProjects, setHasMoreProjects] = useState<boolean>(() => projectsCache.get(id)?.hasMore || false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(() => !projectsCache.has(id));

  const loadProjects = useCallback(async () => {
    if (projectsCache.has(id)) {
      const cached = projectsCache.get(id);
      setProjects(cached.projects);
      setHasMoreProjects(cached.hasMore);
      setIsLoadingProjects(false);
      return;
    }
    
    setIsLoadingProjects(true);
    const res = await getUserProjects(username);
    
    const loadedProjects = res.projects || [];
    const hasMore = res.hasMore || false;
    
    projectsCache.set(id, { projects: loadedProjects, hasMore });
    setProjects(loadedProjects);
    setHasMoreProjects(hasMore);
    setIsLoadingProjects(false);
  }, [id, username]);

  useEffect(() => {
    loadProjects();
    const handleRefresh = () => {
      loadProjects(); // SWR: keep stale list visible while revalidating (no blink)
    };
    window.addEventListener("refresh_projects", handleRefresh);
    return () => {
      window.removeEventListener("refresh_projects", handleRefresh);
    };
  }, [loadProjects, id]);
  const [startWithGalleryModal, setStartWithGalleryModal] = useState(false);
  const [createdGalleryId, setCreatedGalleryId] = useState<string | undefined>(undefined);
  const [createdGallery, setCreatedGallery] = useState<any>(undefined);
  const [activeGalleryMenuId, setActiveGalleryMenuId] = useState<string | null>(null);
  const [galleryMenuCoords, setGalleryMenuCoords] = useState<{ x: number, y: number } | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editingGalleryName, setEditingGalleryName] = useState("");
  const [isEditingGalleryLoading, setIsEditingGalleryLoading] = useState(false);
  const [activeMediaMenuId, setActiveMediaMenuId] = useState<string | null>(null);
  const [mediaMenuCoords, setMediaMenuCoords] = useState<{ x: number, y: number } | null>(null);
  
  // Move Media States
  const [isMoveGalleryModalOpen, setIsMoveGalleryModalOpen] = useState(false);
  const [mediaToMove, setMediaToMove] = useState<{ postId: string, mediaId: string, currentGalleryId?: string, mediaUrl?: string, originalUrl?: string } | null>(null);
  const [isMovingMediaId, setIsMovingMediaId] = useState<string | null>(null);
  const [isGridLayoutExpanded, setIsGridLayoutExpanded] = useState(false);
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);
  const [isDeletingGalleryLoading, setIsDeletingGalleryLoading] = useState(false);
  const [isDeleteMediaModalOpen, setIsDeleteMediaModalOpen] = useState(false);
  const [isDeletingMediaLoading, setIsDeletingMediaLoading] = useState(false);
  
  // Project Actions States
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeletingProjectLoading, setIsDeletingProjectLoading] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectDraft | null>(null);

  const MAX_AVATAR_SIZE = 3.2 * 1024 * 1024; // 3.2MB internal limit
  const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setErrorModal({ isOpen: true, title: tEdit("invalidFormatTitle"), message: tEdit("invalidFormatMessage"), retryType: "avatar" });
        if (avatarInputRef.current) avatarInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        setErrorModal({ isOpen: true, title: tEdit("fileTooLargeTitle"), message: tEdit("fileTooLargeAvatar"), retryType: "avatar" });
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
        setErrorModal({ isOpen: true, title: tEdit("invalidFormatTitle"), message: tEdit("invalidFormatMessage"), retryType: "cover" });
        if (coverInputRef.current) coverInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_COVER_SIZE) {
        setErrorModal({ isOpen: true, title: tEdit("fileTooLargeTitle"), message: tEdit("fileTooLargeCover"), retryType: "cover" });
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
      setIsUploadingAvatar(true);
    } else {
      setCoverPreview(croppedUrl);
      setIsUploadingCover(true);
    }

    try {
      const cloudinaryUrl = await uploadToCloudinary(croppedUrl, "profile-image");
      const token = localStorage.getItem("token") || "";
      if (!token) return;

      let userId: string | null = null;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.sub || payload.id || payload._id || payload.userId || null;
      } catch (e) {
        console.error("Failed to decode token");
      }

      if (userId) {
        const res = await updateProfileMedia(token, userId, typeToUse, cloudinaryUrl);
        if (!res.success) {
          console.error("updateProfileMedia failed:", res.error);
        } else {
          // Dispatch event so Navbar avatar updates instantly without re-fetch
          window.dispatchEvent(new CustomEvent("avatar-updated", {
            detail: { url: cloudinaryUrl, type: typeToUse }
          }));
          window.dispatchEvent(new CustomEvent("profile_updated", {
            detail: { url: cloudinaryUrl, type: typeToUse }
          }));
          // Also update local preview with the final Cloudinary URL
          if (typeToUse === "avatar") setAvatarPreview(cloudinaryUrl);
          else setCoverPreview(cloudinaryUrl);
        }
      }
    } catch (error) {
      console.error("Failed to save image:", error);
    } finally {
      if (typeToUse === "avatar") {
        setIsUploadingAvatar(false);
      } else {
        setIsUploadingCover(false);
      }
    }
  };

  const handleSelectLibraryItem = async (url: string) => {
    if (mediaModalType === "avatar") {
      setAvatarPreview(url);
    } else {
      setCoverPreview(url);
    }

    try {
      const token = localStorage.getItem("token") || "";
      if (!token) return;

      let userId: string | null = null;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.sub || payload.id || payload._id || payload.userId || null;
      } catch (e) {
        console.error("Failed to decode token");
      }

      if (userId) {
        const res = await updateProfileMedia(token, userId, mediaModalType, url);
        if (!res.success) {
          console.error("updateProfileMedia failed:", res.error);
        } else {
          window.dispatchEvent(new CustomEvent("avatar-updated", {
            detail: { url, type: mediaModalType }
          }));
          window.dispatchEvent(new CustomEvent("profile_updated", {
            detail: { url, type: mediaModalType }
          }));
        }
      }
    } catch (error) {
      console.error("Failed to save library image:", error);
    }
  };

  const [activeAlbumIdx, setActiveAlbumIdx] = useState<number | null>(null);
  const [albumGridCols, setAlbumGridCols] = useState<number>(3);
  const [inlineCarouselIdx, setInlineCarouselIdx] = useState(0);
  const [galleryPreviewModalOpen, setGalleryPreviewModalOpen] = useState(false);
  const [galleryPreviewIdx, setGalleryPreviewIdx] = useState(0);
  const [activeStatTab, setActiveStatTab] = useState<'friends' | 'followers' | null>(null);
  const [statSearchQuery, setStatSearchQuery] = useState("");
  const [expandedGroupTab, setExpandedGroupTab] = useState<'managed' | 'joined' | null>(null);
  const [statPage, setStatPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [showScrollToTabs, setShowScrollToTabs] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const anchorEl = document.getElementById('profile-tabs-anchor');
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        setShowScrollToTabs(rect.top < -100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const carouselRef = React.useRef<HTMLDivElement>(null);
  const albumCarouselRef = React.useRef<HTMLDivElement>(null);

  const [showAlbumLeftArrow, setShowAlbumLeftArrow] = useState(false);
  const [showAlbumRightArrow, setShowAlbumRightArrow] = useState(false);

  const checkAlbumCarouselOverflow = () => {
    if (albumCarouselRef.current) {
      const el = albumCarouselRef.current;
      setShowAlbumLeftArrow(el.scrollLeft > 0);
      setShowAlbumRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  };

  useEffect(() => {
    checkAlbumCarouselOverflow();
    window.addEventListener('resize', checkAlbumCarouselOverflow);
    return () => window.removeEventListener('resize', checkAlbumCarouselOverflow);
  }, [galleries, isLoadingGalleries]);

  const scrollAlbumCarousel = (direction: 'left' | 'right') => {
    if (albumCarouselRef.current) {
      const scrollAmount = 300;
      albumCarouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const isOwnProfile = currentUser && currentUser.id === id;

  const isVisible = (privacy?: string) => {
    if (isOwnProfile) return true;
    if (!privacy || privacy === "PUBLIC") return true;
    if (privacy === "PRIVATE") return false;
    if (privacy === "FRIENDS") return connectionStatus?.friendshipStatus === "ACCEPTED";
    return true;
  };



  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode, themeLoaded]);

  useLayoutEffect(() => {
    let currentId: string | null = null;
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub || payload.id || payload._id || payload.userId || "1";
        currentId = userId;
        if (payload.username || payload.name) {
          setCurrentUser({
            id: userId,
            username: payload.username || payload.name || "User",
            displayName: payload.displayName || payload.username || payload.name || "User",
            token: token,
          });
        }
      } catch (e) {
        console.error("Failed to parse token");
      }
    }

    // Check connection cache immediately if we have currentId
    const connectionCacheKey = currentId ? `${currentId}-${id}` : null;
    if (connectionCacheKey && connectionCache.has(connectionCacheKey)) {
      setConnectionStatus(connectionCache.get(connectionCacheKey));
    }

    // Check profile cache
    if (profileCache.has(id)) {
      const cachedProf = profileCache.get(id);
      setProfileData(cachedProf);
      if (cachedProf.avatarUrl) setAvatarPreview(cachedProf.avatarUrl);
      if (cachedProf.coverUrl) setCoverPreview(cachedProf.coverUrl);
      if (cachedProf.displayName) setDisplayName(cachedProf.displayName);
      setIsLoadingProfile(false);
    }

    const fetchGalleriesData = (isBackground = false) => {
      getUserGalleries(id, currentId).then(galleriesRes => {
        if (galleriesRes.success) {
          const loadedGalleries = galleriesRes.galleries || [];
          setGalleries(loadedGalleries);
          galleryCache.set(id, loadedGalleries);
          
          // Auto-open the specified gallery if deep-linked (only on initial load)
          if (urlTab === "gallery" && urlGalleryId && !isBackground && !galleries.length) {
            const idx = loadedGalleries.findIndex((g: any) => g.id === urlGalleryId);
            if (idx !== -1) {
              setActiveAlbumIdx(idx);
            }
          }
        }
        if (!isBackground) setIsLoadingGalleries(false);
      });
    };

    // Fetch real profile data to populate initial images and details
    // We use `id` from the URL, NOT `userId` from the token!
    const profilePromise = getProfile(id);
    const statsPromise = getProfileStats(id);
    const connectionPromise = currentId
      ? getConnectionStatus(currentId, id)
      : Promise.resolve({ friendshipStatus: null, isFollowing: false, isBlocked: false });

    if (galleryCache.has(id)) {
      setGalleries(galleryCache.get(id));
      setIsLoadingGalleries(false);
      fetchGalleriesData(true); // background revalidate
    } else {
      fetchGalleriesData(false);
    }

    Promise.all([profilePromise, connectionPromise, statsPromise]).then(([res, status, statsRes]) => {
      if (res.success && res.profile) {
        res = { ...res, profile: mergeProfileStats(res.profile, statsRes?.stats) } as any;
      }
      if (res.success && res.profile) {
        profileCache.set(id, res.profile);
        if (res.profile.avatarUrl) setAvatarPreview(res.profile.avatarUrl);
        if (res.profile.coverUrl) setCoverPreview(res.profile.coverUrl);
        if (res.profile.displayName) setDisplayName(res.profile.displayName);
        setProfileData(res.profile);
      }
      if (connectionCacheKey) {
        connectionCache.set(connectionCacheKey, status);
      }
      setConnectionStatus(status);
      setIsLoadingProfile(false);
    });

    const handleProfileUpdated = (e: any) => {
      if (e.detail && e.detail.type && e.detail.url) {
        if (e.detail.type === 'avatar') setAvatarPreview(e.detail.url);
        if (e.detail.type === 'cover') setCoverPreview(e.detail.url);

        setProfileData((prev: any) => {
          if (!prev) return prev;
          const newProfile = { ...prev };
          if (e.detail.type === 'avatar') newProfile.avatarUrl = e.detail.url;
          if (e.detail.type === 'cover') newProfile.coverUrl = e.detail.url;
          return newProfile;
        });
      }
    };
    
    const handleFeedRefresh = () => {
      fetchGalleriesData(true);
    };

    window.addEventListener("profile_updated", handleProfileUpdated);
    window.addEventListener("refresh_feed", handleFeedRefresh);
    window.addEventListener("silent_refresh_feed", handleFeedRefresh);

    setThemeLoaded(true);

    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdated);
      window.removeEventListener("refresh_feed", handleFeedRefresh);
      window.removeEventListener("silent_refresh_feed", handleFeedRefresh);
    };
  }, [id]);

  // Immediate auto-scroll for deep-link
  useEffect(() => {
    if (urlTab === "gallery") {
      setTimeout(() => {
        const anchorEl = document.getElementById('profile-tabs-anchor');
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + rect.top - 56, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [urlTab]);

  const handleCreateGallery = async () => {
    if (!newGalleryName.trim() || !currentUser) return;
    setIsCreatingGallery(true);
    const res = await createGallery(currentUser.id, newGalleryName.trim());
    if (res.success && res.gallery) {
      setGalleries(prev => {
        const next = [...prev, res.gallery];
        galleryCache.set(id, next);
        return next;
      });
      setIsCreateGalleryOpen(false);
      setNewGalleryName("");
      setCreatedGalleryId(res.gallery.id);
      setCreatedGallery(res.gallery);
      setIsCreatePostModalOpen(true);
    } else {
      alert(res.error || "Failed to create gallery");
    }
    setIsCreatingGallery(false);
  };

  const handleEditGallery = async () => {
    if (!editingGalleryId || !editingGalleryName.trim()) return;
    setIsEditingGalleryLoading(true);
    const res = await updateGallery(editingGalleryId, editingGalleryName.trim());
    if (res.success && res.gallery) {
      setGalleries(prev => {
        const next = prev.map(g => g.id === editingGalleryId ? { ...g, name: res.gallery.name } : g);
        galleryCache.set(id, next);
        return next;
      });
      setEditingGalleryId(null);
      setEditingGalleryName("");
    } else {
      alert(res.error || "Failed to update gallery");
    }
    setIsEditingGalleryLoading(false);
  };

  const handleDeleteGallery = async () => {
    if (!deletingGalleryId) return;
    setIsDeletingGalleryLoading(true);
    const res = await deleteGallery(deletingGalleryId);
    if (res.success) {
      setGalleries(prev => {
        const next = prev.filter(g => g.id !== deletingGalleryId);
        galleryCache.set(id, next);
        return next;
      });
      if (activeAlbumIdx !== null && galleries[activeAlbumIdx]?.id === deletingGalleryId) {
        setActiveAlbumIdx(null);
      }
      
      // Update post feed
      window.dispatchEvent(new CustomEvent("gallery_deleted", {
        detail: { galleryId: deletingGalleryId }
      }));
      
      setDeletingGalleryId(null);
    } else {
      alert(res.error || "Failed to delete gallery");
    }
    setIsDeletingGalleryLoading(false);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !currentUser) return;
    setIsDeletingProjectLoading(true);
    try {
      await deleteProject(projectToDelete.id, currentUser.id);
      window.dispatchEvent(new Event("refresh_projects"));
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingProjectLoading(false);
      setIsDeleteProjectModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleDeleteMedia = async () => {
    if (!mediaToMove) return;
    setIsDeletingMediaLoading(true);
    const token = localStorage.getItem("token");
    if (token) {
      // Optimistic post update
      window.dispatchEvent(new CustomEvent("post_media_removed", {
        detail: { postId: mediaToMove.postId, mediaId: mediaToMove.mediaId, originalUrl: mediaToMove.originalUrl }
      }));

      await deleteMediaFromGallery(mediaToMove.postId, mediaToMove.mediaId);
      // Refresh galleries
      const res = await getUserGalleries(id, currentUser?.id);
      if (res.success && res.galleries) {
        setGalleries(res.galleries);
        galleryCache.set(id, res.galleries);
      }
    }
    setIsDeletingMediaLoading(false);
    setIsDeleteMediaModalOpen(false);
    setMediaToMove(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeGalleryMenuId) {
        setActiveGalleryMenuId(null);
        setGalleryMenuCoords(null);
      }
      if (activeMediaMenuId) {
        setActiveMediaMenuId(null);
        setMediaMenuCoords(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeGalleryMenuId, activeMediaMenuId]);

  const handlePrimaryAction = async () => {
    if (!currentUser || isProcessing) return;
    setIsProcessing(true);
    const token = localStorage.getItem("token") || "";

    const res = await handlePrimaryConnectionAction(token, currentUser.id, id);
    if (res.success) {
      notifyConnectionChanged(currentUser.id, id as string);
      // Manual component update to bypass ANY Next.js caching issues
      const newStatus = { ...connectionStatus };
      const newProfile = profileData ? JSON.parse(JSON.stringify(profileData)) : null;

      let newFollowers = newProfile?.user?._count?.followers || 0;

      if (connectionStatus.friendshipStatus === "ACCEPTED") {
        // 1. Remove Friend
        newStatus.friendshipStatus = null;
        newStatus.isFollowing = false;
        newFollowers = Math.max(0, newFollowers - 1);
        if (newProfile?.user?._count) {
          if ((newProfile.user._count.friendshipsAsUser || 0) > 0) {
            newProfile.user._count.friendshipsAsUser -= 1;
          } else if ((newProfile.user._count.friendshipsAsFriend || 0) > 0) {
            newProfile.user._count.friendshipsAsFriend -= 1;
          }
        }
      } else if (connectionStatus.friendshipStatus === "PENDING") {
        if (connectionStatus.friendshipRequestedBy !== currentUser.id) {
          // 2. Accept Request
          newStatus.friendshipStatus = "ACCEPTED";
          if (!connectionStatus.isFollowing) {
            newStatus.isFollowing = true;
            newFollowers += 1;
          }
          if (newProfile?.user?._count) {
            newProfile.user._count.friendshipsAsFriend = (newProfile.user._count.friendshipsAsFriend || 0) + 1;
          }
        } else {
          // 3. Cancel Request
          newStatus.friendshipStatus = null;
          newStatus.isFollowing = false;
          newFollowers = Math.max(0, newFollowers - 1);
        }
      } else {
        if (connectionStatus.isFollowing) {
          // 4. Unfollow
          newStatus.isFollowing = false;
          newFollowers = Math.max(0, newFollowers - 1);
        } else {
          // 5. Follow & Send Request
          newStatus.isFollowing = true;
          newStatus.friendshipStatus = "PENDING";
          newStatus.friendshipRequestedBy = currentUser.id;
          newFollowers += 1;
        }
      }

      setConnectionStatus(newStatus);
      if (newProfile?.user) {
        newProfile.user._count.followers = newFollowers;
        setProfileData(newProfile);
      }
    }
    setIsProcessing(false);
  };

  const handleToggleBlock = async () => {
    if (!currentUser) return;
    const token = localStorage.getItem("token") || "";
    const res = await toggleBlock(token, currentUser.id, id);
    if (res.success) {
      const status = await getConnectionStatus(currentUser.id, id);
      setConnectionStatus(status);
    }
    setIsProfileOptionsOpen(false);
  };

  const handleListConnectionAction = async (targetUserId: string, actionType: 'remove_follower' | 'other') => {
    if (!currentUser || isProcessing) return;
    setIsProcessing(true);
    const token = localStorage.getItem("token") || "";

    let res: any;
    if (actionType === 'remove_follower') {
      res = await removeFollower(token, currentUser.id, targetUserId);
    } else {
      res = await handlePrimaryConnectionAction(token, currentUser.id, targetUserId);
    }

    if (res.success) {
      const [freshProfile, freshStats] = await Promise.all([getProfile(id), getProfileStats(id)]);
      if (freshProfile.success && freshProfile.profile) {
        const merged = mergeProfileStats(freshProfile.profile, freshStats?.stats);
        profileCache.set(id, merged);
        setProfileData(merged);
      }
    }
    setIsProcessing(false);
  };

  const handleListBlockAction = async (targetUserId: string) => {
    if (!currentUser || isProcessing) return;
    setIsProcessing(true);
    const token = localStorage.getItem("token") || "";
    const res = await toggleBlock(token, currentUser.id, targetUserId);
    if (res.success) {
      const [freshProfile, freshStats] = await Promise.all([getProfile(id), getProfileStats(id)]);
      if (freshProfile.success && freshProfile.profile) {
        const merged = mergeProfileStats(freshProfile.profile, freshStats?.stats);
        profileCache.set(id, merged);
        setProfileData(merged);
      }
    }
    setIsProcessing(false);
  };

  useEffect(() => {
    if (isDetailModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isDetailModalOpen]);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsExpansion(contentRef.current.scrollHeight > 180);
    }
  }, [profileData]);

  // Listen for friend-accepted event dispatched from Navbar notification panel
  useEffect(() => {
    const handleFriendAccepted = async (e: Event) => {
      const event = e as CustomEvent<{ senderId: string; currentUserId: string }>;
      const { senderId, currentUserId } = event.detail;

      // Update if we're on the sender's profile OR on our own profile
      const isOnSenderProfile = senderId === id;
      const isOnOwnProfile = currentUserId === id;
      if (!isOnSenderProfile && !isOnOwnProfile) return;

      // Re-fetch fresh data from server for accurate counts
      const [freshProfileRes, freshStatsRes, freshStatus] = await Promise.all([
        getProfile(id),
        getProfileStats(id),
        getConnectionStatus(currentUserId, id),
      ]);
      const freshProfile = freshProfileRes.success && freshProfileRes.profile
        ? { success: true, profile: mergeProfileStats(freshProfileRes.profile, freshStatsRes?.stats) }
        : { success: false, profile: null };

      if (freshProfile.success && freshProfile.profile) {
        profileCache.set(id, freshProfile.profile);
        setProfileData(freshProfile.profile);
        if (freshProfile.profile.avatarUrl) setAvatarPreview(freshProfile.profile.avatarUrl);
        if (freshProfile.profile.coverUrl) setCoverPreview(freshProfile.profile.coverUrl);
        if (freshProfile.profile.displayName) setDisplayName(freshProfile.profile.displayName);
      }
      if (freshStatus) {
        setConnectionStatus(freshStatus);
      }
    };

    window.addEventListener("friend-accepted", handleFriendAccepted);
    return () => window.removeEventListener("friend-accepted", handleFriendAccepted);
  }, [id]);

  const settings = profileData?.user?.profileSettings;
  const showLoc = profileData?.locationName && isVisible(settings?.privacyLoc);
  const showExtLink = (profileData?.externalLinks || profileData?.websiteUrl) && isVisible(settings?.privacyExternalLink);
  const showProf = profileData?.profession && isVisible(settings?.privacyProf);
  const showEdu = profileData?.education && isVisible(settings?.privacyProf);
  const showGender = profileData?.gender && isVisible(settings?.privacyGender);
  const showBirth = profileData?.birthDate && isVisible(settings?.privacyBirth);

  const hasExpandableInfo = showExtLink || showEdu || showProf || showGender || showBirth;
  const hasAnyInfo = profileData?.bio || showLoc || hasExpandableInfo;

  const isBlockedByMe = connectionStatus?.isBlocked;
  const isBlockedByThem = connectionStatus?.hasBlockedYou;
  const isProfileInaccessible = isBlockedByMe || isBlockedByThem;

  let statsUsers: any[] = [];
  if (profileData?.user) {
    if (activeStatTab === 'friends') {
      const friends1 = (profileData.user.friendshipsAsUser || []).map((f: any) => ({
        id: f.friend.id,
        name: f.friend.profile?.displayName || f.friend.username,
        username: f.friend.username,
        isFriend: true,
        avatar: f.friend.profile?.avatarUrl || '/default-avatar.svg'
      }));
      const friends2 = (profileData.user.friendshipsAsFriend || []).map((f: any) => ({
        id: f.user.id,
        name: f.user.profile?.displayName || f.user.username,
        username: f.user.username,
        isFriend: true,
        avatar: f.user.profile?.avatarUrl || '/default-avatar.svg'
      }));
      statsUsers = [...friends1, ...friends2];
    } else if (activeStatTab === 'followers') {
      statsUsers = (profileData.user.followers || []).map((f: any) => {
        const isAlsoFriend = (profileData.user.friendshipsAsUser || []).some((fr: any) => fr.friend.id === f.follower.id) ||
          (profileData.user.friendshipsAsFriend || []).some((fr: any) => fr.user.id === f.follower.id);
        return {
          id: f.follower.id,
          name: f.follower.profile?.displayName || f.follower.username,
          username: f.follower.username,
          isFriend: isAlsoFriend,
          avatar: f.follower.profile?.avatarUrl || '/default-avatar.svg'
        };
      });
    }
  }

  // Filter based on search query
  if (statSearchQuery.trim()) {
    const q = statSearchQuery.toLowerCase();
    statsUsers = statsUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  }

  const managedGroups: any[] = [];
  const joinedGroups: any[] = [];


  return (
    <main className="min-h-screen bg-[#F3F2EF] dark:bg-[#18191A] text-black dark:text-[#E4E6EB] pb-20 pt-[56px] font-sans">

      {/* Cloned Sticky Navigation Bar */}
      <div 
        className={`fixed top-[56px] left-0 right-0 z-[45] w-full transition-transform duration-300 pointer-events-none ${
          showScrollToTabs ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-6 px-2 md:px-6">
            {/* Fake Left Sidebar Spacer */}
            <div className="hidden md:block w-full md:w-[320px] shrink-0 pointer-events-none"></div>
            
            {/* Cloned Nav Container inside Right Column */}
            <div className="flex-1 min-w-0">
              <div className="w-full max-w-[590px] mx-auto flex justify-center bg-white/30 dark:bg-[#18191A]/30 backdrop-blur-md py-2 border border-white/40 dark:border-white/10 shadow-lg rounded-b-2xl pointer-events-auto">
                <ul className="flex gap-3 px-2">
                  {[
                    {
                      id: 'posts', label: 'Post', gradientFrom: '#10B981', gradientTo: '#34D399',
                      icon: <div className="w-6 h-6 bg-current" style={{ WebkitMask: "url(/navigasi/posting.svg) center/contain no-repeat", mask: "url(/navigasi/posting.svg) center/contain no-repeat" }} />
                    },
                    {
                      id: 'gallery', label: 'Gallery', gradientFrom: '#56CCF2', gradientTo: '#2F80ED',
                      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11V9a2 2 0 00-2-2H9a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2v-2M15 4H5a2 2 0 00-2 2v10m12 0l-3-3m0 0l-3 3m3-3v6" /></svg>
                    },
                    {
                      id: 'project', label: 'Project', gradientFrom: '#a955ff', gradientTo: '#ea51ff',
                      icon: <div className="w-6 h-6 bg-current" style={{ WebkitMask: "url(/navigasi/project.svg) center/contain no-repeat", mask: "url(/navigasi/project-outline.svg) center/contain no-repeat" }} />
                    }
                  ].map(({ id, label, icon, gradientFrom, gradientTo }) => (
                    <li
                      key={id}
                      onClick={() => {
                        // Ganti tab dulu → tunggu DOM render ulang (2 frame) → 
                        // baru hitung posisi anchor yang sudah final dan scroll kesana.
                        // Ini menghilangkan "dua fase scroll" karena posisi target
                        // sudah tidak akan berubah lagi setelah kita scroll.
                        setActiveTab(id);
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            const anchorEl = document.getElementById('profile-tabs-anchor');
                            if (anchorEl) {
                              const rect = anchorEl.getBoundingClientRect();
                              window.scrollTo({ top: window.scrollY + rect.top - 56, behavior: 'smooth' });
                            }
                          });
                        });
                      }}
                      style={{ '--gradient-from': gradientFrom, '--gradient-to': gradientTo } as React.CSSProperties}
                      className={`relative h-[52px] bg-white dark:bg-[#3A3B3C] shadow-lg dark:shadow-black/40 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer overflow-hidden ${activeTab === id ? 'w-[140px] shadow-none' : 'w-[52px] group hover:w-[140px]'}`}
                    >
                      <span className={`absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] transition-opacity duration-500 ${activeTab === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
                      <span className={`absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] -z-10 transition-opacity duration-500 ${activeTab === id ? 'opacity-50' : 'opacity-0 group-hover:opacity-50'}`}></span>
                      <span className={`relative z-10 text-gray-500 dark:text-gray-300 transition-all duration-300 ${activeTab === id ? 'scale-0 w-0 overflow-hidden' : 'scale-100 group-hover:scale-0 group-hover:w-0 group-hover:overflow-hidden'}`}>
                        {icon}
                      </span>
                      <span className={`absolute text-white uppercase tracking-wide text-sm font-bold transition-all duration-300 ${activeTab === id ? 'scale-100 opacity-100' : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`} style={{ transitionDelay: activeTab === id ? '0ms' : '100ms' }}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP LOADING BAR (YOUTUBE STYLE) */}
      {isProcessing && (
        <div className="fixed top-[56px] left-0 w-full h-[3px] bg-transparent z-50 overflow-hidden">
          <div className="h-full bg-blue-500 animate-[loadingBar_1s_ease-in-out_infinite]" style={{
            width: '30%',
            position: 'absolute',
            left: '-30%'
          }}></div>
        </div>
      )}

      <style>{`
        @keyframes loadingBar {
          0% { left: -30%; width: 30%; }
          50% { left: 50%; width: 50%; }
          100% { left: 100%; width: 30%; }
        }
      `}</style>

      <div className="max-w-[1100px] mx-auto px-0 md:px-8">

        {/* Cover Photo */}
        <div className="w-full h-44 sm:h-56 md:h-auto md:aspect-[3/1] rounded-none md:rounded-b-[40px] relative overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm">
          {isLoadingProfile ? (
            <div className="w-full h-full bg-gray-300 dark:bg-[#3E4042] animate-pulse" />
          ) : (
            <>
              <input type="file" ref={coverInputRef} onChange={handleCoverChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
              <img
                src={isProfileInaccessible ? "/sampul-placeholder.png" : (getOptimizedUrl(coverPreview, "cover") || "/sampul-placeholder.png")}
                alt="Cover"
                className={`w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${isUploadingCover ? "opacity-50" : ""}`}
                onClick={(e) => {
                  if (isOwnProfile) {
                    e.stopPropagation();
                    setMediaActionMenu({
                      type: "cover",
                      coords: { x: e.clientX, y: e.clientY }
                    });
                  } else {
                    setPreviewImageSrc(coverPreview || "/sampul-placeholder.png");
                    setPreviewModalOpen(true);
                  }
                }}
              />
              {isUploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin shadow-lg" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="flex flex-col md:flex-row gap-6 -mt-10 sm:-mt-14 md:-mt-[80px] px-0 md:px-6 relative z-10">

          {/* Left Sidebar */}
          <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-0 md:gap-6 relative z-20">
            {/* Actual Profile Card */}
            <div className="w-full bg-gradient-to-b from-white to-[#D9D9D9] dark:from-[#3A3B3C] dark:to-[#18191A] rounded-t-[32px] rounded-b-none md:rounded-[40px] px-5 sm:px-6 md:px-8 pt-6 md:pt-8 pb-5 shadow-xl flex flex-col justify-between border-t border-b md:border border-white/20 dark:border-white/5 transition-all duration-300 min-h-[420px] md:min-h-[460px]">
              <div className="flex flex-col items-center w-full h-full">
                {/* Avatar */}
                <div className="relative mb-3 md:mb-4">
                  <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full border-[3.5px] md:border-[4px] border-white dark:border-[#3A3B3C] bg-white dark:bg-[#242526] flex items-center justify-center shadow-md overflow-hidden">
                    {isLoadingProfile ? (
                      <div className="w-full h-full bg-gray-300 dark:bg-[#3E4042] animate-pulse" />
                    ) : (
                      <>
                        <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
                        <img
                          src={isProfileInaccessible ? "/default-avatar.svg" : (getOptimizedUrl(avatarPreview, "avatar") || "/default-avatar.svg")}
                          alt="Avatar"
                          className={`w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${isUploadingAvatar ? "opacity-50" : ""}`}
                          onClick={(e) => {
                            if (isOwnProfile) {
                              e.stopPropagation();
                              setMediaActionMenu({
                                type: "avatar",
                                coords: { x: e.clientX, y: e.clientY }
                              });
                            } else {
                              setPreviewImageSrc(avatarPreview || "/default-avatar.svg");
                              setPreviewModalOpen(true);
                            }
                          }}
                        />
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-[3px] border-black/20 border-t-black dark:border-white/30 dark:border-t-white rounded-full animate-spin shadow-sm" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isLoadingProfile ? (
                  <div className="flex flex-col items-center gap-2 w-full mt-2">
                    <div className="h-7 w-48 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse"></div>
                    <div className="h-5 w-32 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse mb-3"></div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white text-center">
                      {isProfileInaccessible ? (isBlockedByThem ? t("someone", { fallback: "Seseorang" }) : displayName || username) : (displayName || (username === "pampam" ? "nama akun" : username))}
                    </h1>
                    <p className="text-[13px] md:text-[15px] text-gray-700 dark:text-gray-300 font-medium mb-3 text-center">@{username}</p>
                  </>
                )}
                {/* Social Media Icons */}
                {!isProfileInaccessible && isVisible(settings?.privacySosmed) && profileData?.user?.socialLinks && profileData.user.socialLinks.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5 mb-3 md:mb-8 px-2 md:px-4">
                    {profileData.user.socialLinks.map((social: any) => {
                      const getSocialUrl = (platform: string, username: string) => {
                        if (username.startsWith('http')) return username;
                        switch (platform) {
                          case "Instagram": return `https://instagram.com/${username}`;
                          case "Whatsapp": return `https://wa.me/${username}`;
                          case "Facebook": return `https://facebook.com/${username}`;
                          case "Tiktok": return `https://tiktok.com/@${username}`;
                          case "Github": return `https://github.com/${username}`;
                          case "Portotree": return `https://portotree.com/p/${username}`;
                          case "Linkedin": return `https://linkedin.com/in/${username}`;
                          case "Youtube": return `https://youtube.com/@${username}`;
                          case "Telegram": return `https://t.me/${username}`;
                          case "Twitter": return `https://twitter.com/${username}`;
                          default: return `https://${username}`;
                        }
                      };
                      return (
                        <a
                          key={social.id}
                          href={getSocialUrl(social.platform, social.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 dark:bg-[#3A3B3C] flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm border border-gray-200 dark:border-[#4E4F50] shrink-0 group relative z-10"
                        >
                          <img src={`/sosmed/${social.platform.toLowerCase()}.webp`} alt={social.platform} className="w-4 h-4 md:w-5 md:h-5 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />

                          {/* Tooltip */}
                          <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-[#1C1E21] dark:bg-white text-[#E4E6EB] dark:text-black px-2.5 py-1.5 rounded-lg text-[12px] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex items-center gap-1.5 shadow-xl z-50 pointer-events-none">
                            <img src={`/sosmed/${social.platform.toLowerCase()}.webp`} alt={social.platform} className="w-3.5 h-3.5 object-contain shrink-0" />
                            <span>{social.platform}</span>
                            <span className="font-bold">{social.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            {/* Tooltip arrow */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1C1E21] dark:bg-white rotate-45"></div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}

                {/* Mobile Edit Profile Button (only on mobile & own profile) */}
                {isOwnProfile && (
                  <div className="flex md:hidden w-full justify-center mb-4">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-[#4E4F50] dark:hover:bg-[#5E5F60] text-black dark:text-white font-bold py-2 px-5 rounded-full text-sm transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t("editProfile")}
                    </button>
                  </div>
                )}


                {/* Profile Details List */}
                <div className="w-full flex flex-col flex-1">
                  {isProfileInaccessible ? null : isLoadingProfile ? (
                    <div className="flex flex-col gap-4 mt-4 w-full">
                      <div className="h-4 w-full bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse"></div>
                      <div className="h-4 w-4/5 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse"></div>
                      <div className="h-4 w-2/3 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <div
                      ref={contentRef}
                      className={`flex flex-col gap-4 ${!hasAnyInfo ? 'flex-1' : ''} mt-4 transition-all duration-300 ease-in-out relative ${isProfileExpanded ? "max-h-[1000px]" : "max-h-[180px] overflow-hidden"}`}
                    >
                      {!hasAnyInfo && (
                        <div className="flex-1 flex items-center justify-center text-[15px] font-bold text-gray-400 dark:text-gray-500 italic pb-12">
                          {t("noInfoPlaceholder")}
                        </div>
                      )}
                      {/* 1. Bio */}
                      {profileData?.bio && (
                        <div className="flex items-start gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="leading-relaxed">{profileData.bio}</span>
                        </div>
                      )}

                      {/* 2. Lokasi */}
                      {showLoc && (
                        <div className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {profileData.locationName}
                        </div>
                      )}

                      {/* 3. Link web (External Links) */}
                      {showExtLink && (() => {
                        let links: { label: string, url: string }[] = [];
                        if (profileData?.externalLinks) {
                          try {
                            links = typeof profileData.externalLinks === 'string' ? JSON.parse(profileData.externalLinks) : profileData.externalLinks;
                          } catch (e) { }
                        } else if (profileData?.websiteUrl) {
                          links = [{ label: "", url: profileData.websiteUrl }];
                        }

                        if (!Array.isArray(links) || links.length === 0) return null;

                        return (
                          <div className="flex items-start gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                            <div className="flex flex-col gap-1.5 w-full">
                              {links.map((link, idx) => {
                                if (!link.url) return null;
                                const fullUrl = link.url.startsWith("http") ? link.url : `https://${link.url}`;
                                const displayLabel = link.label?.trim() ? link.label : link.url;
                                return (
                                  <div key={idx} className="relative group/link w-fit max-w-full">
                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="underline cursor-pointer hover:text-blue-500 transition-colors inline-block max-w-[220px] truncate relative z-10">
                                      {displayLabel}
                                    </a>
                                    {link.label?.trim() && (
                                      <div className="absolute bottom-full left-0 mb-1 bg-[#1C1E21] dark:bg-white text-[#E4E6EB] dark:text-black px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap opacity-0 invisible group-hover/link:opacity-100 group-hover/link:visible transition-all shadow-xl z-[999] pointer-events-none">
                                        {link.url}
                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-[#1C1E21] dark:bg-white rotate-45"></div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4. Profesi */}
                      {showProf && (
                        <div className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          <span>{profileData.profession}</span>
                        </div>
                      )}

                      {/* 4.5 Pendidikan */}
                      {showEdu && (
                        <div className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                          </svg>
                          <span>{profileData.education}</span>
                        </div>
                      )}

                      {/* 5. Gender */}
                      {showGender && (
                        <div className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          {profileData.gender}
                        </div>
                      )}

                      {/* 6. Tanggal lahir */}
                      {showBirth && (
                        <div className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200 font-semibold">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {new Date(profileData.birthDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand / Collapse Button */}
                {needsExpansion && !isLoadingProfile && (
                  <button
                    onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                    className="w-full mt-auto pt-4 pb-2 flex items-center justify-center gap-2 text-[15px] font-bold text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors group cursor-pointer shrink-0"
                  >
                    {isProfileExpanded ? t("showLess") : t("showMore")}
                    <svg
                      className={`w-4 h-4 transition-transform duration-300 ${isProfileExpanded ? "rotate-180" : "group-hover:translate-y-1"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Reputasi Card */}
            {!isProfileInaccessible && profileData?.type === "BUSINESS" && (
              <div className="w-full shrink-0 bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-800/30 rounded-[30px] p-5 flex flex-col justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {/* Reputasi Logo */}
                    <div className="w-[70px] h-[70px] shrink-0">
                      <img src="/reputasi.png" alt={t("reputation")} className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                  </div>
                  <div className="text-white flex flex-col justify-center">
                    <p className="font-bold text-[18px] leading-none mb-1.5 tracking-wide">{isOwnProfile ? t("yourPoints") : `@${username}`}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="font-extrabold text-[22px] leading-none tracking-wide">1.238</p>
                      <img
                        src="/review.png"
                        alt="Star"
                        className="w-6 h-6 object-contain mb-0.5 shrink-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex gap-2">
                    <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-1.5 rounded-full text-[13px] transition-colors">
                      {isOwnProfile ? t("howItWorks") : t("check")}
                    </button>
                    {isOwnProfile ? (
                      <div className="flex-1 flex items-center justify-center border border-red-500/70 rounded-full py-1.5">
                        <span className="text-red-500 font-medium text-[13px]">{t("notActive")}</span>
                      </div>
                    ) : (
                      <button className="flex-1 bg-gradient-to-b from-red-600 to-red-900 hover:from-red-500 hover:to-red-800 border-t border-red-500 text-white font-semibold py-1.5 rounded-full text-[13px] shadow-sm transition-colors">
                        {t("report")}
                      </button>
                    )}
                  </div>
                  <ShinyButton
                    variant={isOwnProfile ? "green" : "reputation"}
                    hoverText={
                      isOwnProfile ? (
                        t("activateNow")
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span>{t("addReputation")}</span>
                        </span>
                      )
                    }
                  >
                    {isOwnProfile ? t("activate") : t("reputation")}
                  </ShinyButton>
                </div>
              </div>
            )}

            {/* View Details Button */}
            {!isLoadingProfile && !isProfileInaccessible && (
              <button
                onClick={() => setIsDetailModalOpen(true)}
                className="w-full mt-0 md:mt-4 bg-white dark:bg-[#242526] hover:bg-gray-50 dark:hover:bg-[#2c2d2e] border-b md:border border-gray-200 dark:border-[#3E4042] md:border-gray-200 md:dark:border-[#3A3B3C] rounded-none md:rounded-[24px] px-5 py-3.5 md:p-4 shadow-sm flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-[#E4E6EB] text-[14px] md:text-[15px] tracking-tight">{t("viewDetails")}</span>
                </div>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}


          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col gap-4 md:mt-24 min-w-0 px-3 sm:px-4 md:px-0">

            {/* Top Row: Friends & Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-4">
              <div className="flex items-center justify-center w-full sm:w-auto gap-8 sm:gap-10">
                <div
                  onClick={() => {
                    if (!isProfileInaccessible) {
                      setActiveStatTab(activeStatTab === 'followers' ? null : 'followers');
                      setStatPage(1);
                      setStatSearchQuery("");
                    }
                  }}
                  className={`flex flex-col items-center ${!isProfileInaccessible ? 'cursor-pointer group' : ''}`}
                >
                  <span className={`text-[14px] font-medium transition-colors ${activeStatTab === 'followers' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'} ${!isProfileInaccessible ? 'group-hover:text-black dark:group-hover:text-white' : ''}`}>{t("followers")}</span>
                  {isLoadingProfile ? (
                    <div className="w-6 h-6 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse mt-0.5"></div>
                  ) : (
                    <span className="text-[18px] font-bold mt-0.5 text-black dark:text-white">
                      {isProfileInaccessible ? "-" : profileData?.user?._count?.followers || 0}
                    </span>
                  )}
                </div>
                <div
                  onClick={() => {
                    if (!isProfileInaccessible) {
                      setActiveStatTab(activeStatTab === 'friends' ? null : 'friends');
                      setStatPage(1);
                      setStatSearchQuery("");
                    }
                  }}
                  className={`flex flex-col items-center ${!isProfileInaccessible ? 'cursor-pointer group' : ''}`}
                >
                  <span className={`text-[14px] font-medium transition-colors ${activeStatTab === 'friends' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'} ${!isProfileInaccessible ? 'group-hover:text-black dark:group-hover:text-white' : ''}`}>{t("friends")}</span>
                  {isLoadingProfile ? (
                    <div className="w-6 h-6 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse mt-0.5"></div>
                  ) : (
                    <span className="text-[18px] font-bold mt-0.5 text-black dark:text-white">
                      {isProfileInaccessible ? "-" : (profileData?.user?._count?.friendshipsAsUser || 0) + (profileData?.user?._count?.friendshipsAsFriend || 0)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">{t("posts") || "Postingan"}</span>
                  {isLoadingProfile ? (
                    <div className="w-6 h-6 bg-gray-300 dark:bg-[#3E4042] rounded animate-pulse mt-0.5"></div>
                  ) : (
                    <span className="text-[18px] font-bold mt-0.5 text-black dark:text-white">
                      {isProfileInaccessible ? "-" : profileData?.user?._count?.posts || 0}
                    </span>
                  )}
                </div>
              </div>
              <div className={`items-center gap-3 ${isOwnProfile ? 'hidden md:flex' : 'flex mt-4 sm:mt-0 justify-center w-full sm:w-auto'}`}>
                {isOwnProfile ? (
                  <button onClick={() => setIsEditModalOpen(true)} className="bg-gray-200 hover:bg-gray-300 dark:bg-[#4E4F50] dark:hover:bg-[#5E5F60] text-black dark:text-white font-bold py-2 px-5 rounded-full text-sm transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {t("editProfile")}
                  </button>
                ) : isLoadingProfile ? (
                  <>
                    <div className="w-[100px] h-9 bg-gray-200 dark:bg-[#3A3B3C] rounded-full animate-pulse"></div>
                    <div className="w-[80px] h-9 bg-gray-200 dark:bg-[#3A3B3C] rounded-full animate-pulse"></div>
                    <div className="w-9 h-9 bg-gray-200 dark:bg-[#3A3B3C] rounded-full animate-pulse"></div>
                  </>
                ) : (
                  <>
                    {!isProfileInaccessible && (
                      <>
                        <button
                          onClick={handlePrimaryAction}
                          disabled={isProcessing}
                          className={`${connectionStatus.friendshipStatus === "ACCEPTED" ? "bg-gray-200 hover:bg-red-500 text-black hover:text-white" :
                            connectionStatus.friendshipStatus === "PENDING" && connectionStatus.friendshipRequestedBy !== currentUser?.id ? "bg-yellow-500 hover:bg-yellow-600 text-white" :
                              (connectionStatus.friendshipStatus === "PENDING" || connectionStatus.isFollowing) ? "bg-transparent border border-gray-300 dark:border-[#4E4F50] text-black dark:text-[#E4E6EB] hover:bg-red-50 hover:border-red-500 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:border-red-500 dark:hover:text-red-400" :
                                "bg-[#10B981] hover:bg-emerald-600 text-white"
                            } font-bold py-2 px-4 rounded-full text-sm shadow-sm transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {connectionStatus.friendshipStatus === "ACCEPTED" ? t("friendBtn") :
                            connectionStatus.friendshipStatus === "PENDING" && connectionStatus.friendshipRequestedBy !== currentUser?.id ? t("acceptRequestBtn") :
                              (connectionStatus.friendshipStatus === "PENDING" || connectionStatus.isFollowing) ? t("following") :
                                t("followBtn")}
                        </button>

                        <button className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-sm transition-colors">
                          {t("sendMessage", { fallback: "Pesan" })}
                        </button>
                      </>
                    )}

                    {isBlockedByMe && (
                      <button
                        onClick={handleToggleBlock}
                        disabled={isProcessing}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full text-sm shadow-sm transition-colors flex items-center gap-2"
                      >
                        {isProcessing ? "Loading..." : t("unblock", { fallback: "Buka Blokir" })}
                      </button>
                    )}

                    <div className="relative">
                      <button
                        onClick={() => setIsProfileOptionsOpen(!isProfileOptionsOpen)}
                        className="w-9 h-9 flex shrink-0 items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-700 dark:text-[#E4E6EB] rounded-full transition-colors shadow-sm cursor-pointer">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 12a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                      {isProfileOptionsOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsProfileOptionsOpen(false)} />
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 transition-colors">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {t("activity")}
                            </button>
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3A3B3C] flex items-center gap-3 transition-colors border-t border-gray-100 dark:border-white/5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              {t("reportAccount")}
                            </button>
                            <button
                              onClick={handleToggleBlock}
                              className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              {connectionStatus.isBlocked ? "Buka Blokir (Unblock)" : (t("blockAccount") || "Blokir Akun")}
                            </button>
                          </div>
                        </>

                      )}
                    </div>
                  </>
                )}
              </div>
            </div>


            {/* Main Profile Content Area */}
            {!isProfileInaccessible ? (
              <>
                <div className="w-full max-w-[590px] mx-auto mt-4 mb-2 min-h-[480px] flex flex-col">
                  {activeStatTab ? (
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center px-1 mb-3">
                        <h3 className="text-[15px] font-bold text-black dark:text-white">
                          {activeStatTab === 'friends' ? (t("friends") || "Teman") : (t("followers") || "Pengikut")}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-[#F3F2EF] dark:bg-[#18191A] z-10 py-1">
                        <div className="relative flex-1 max-w-[240px]">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          </div>
                          <input type="text" value={statSearchQuery} onChange={(e) => { setStatSearchQuery(e.target.value); setStatPage(1); }} placeholder={t("search") || "Cari..."} className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-[#242526] border border-gray-200 dark:border-gray-700 rounded-full text-[13px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" />
                        </div>
                        <button onClick={() => { setActiveStatTab(null); setStatPage(1); setStatSearchQuery(""); }} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-gray-500 transition-colors ml-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      {(activeStatTab === 'friends' && !isVisible(settings?.privacyFriendList)) || (activeStatTab === 'followers' && !isVisible(settings?.privacyFollowers)) ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">
                            {activeStatTab === 'friends' ? (t("friendsHidden") || "Daftar teman disembunyikan") : (t("followersHidden") || "Daftar followers disembunyikan")}
                          </p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-[280px]">
                            {activeStatTab === 'friends' ? (t("friendsHiddenDesc") || "Pengguna ini menyembunyikan daftar temannya.") : (t("followersHiddenDesc") || "Pengguna ini menyembunyikan daftar pengikutnya.")}
                          </p>
                        </div>
                      ) : statsUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">
                            {activeStatTab === 'friends' ? (t("noFriends") || "Tidak ada daftar pertemanan") : (t("noFollowers") || "Tidak ada daftar pengikut")}
                          </p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-[280px]">
                            {activeStatTab === 'friends' ? (t("noFriendsDesc") || "Pengguna ini belum memiliki teman atau pertemanan belum disetujui.") : (t("noFollowersDesc") || "Pengguna ini belum memiliki pengikut saat ini.")}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {statsUsers.slice((statPage - 1) * 8, statPage * 8).map((user, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-[#242526]/40 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#2A2B2C] hover:shadow-sm transition-all cursor-pointer group">
                              <div className="flex items-center gap-3" onClick={() => router.push(`/${locale}/p/${user.username}/${user.id}`)}>
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">{user.name}</span>
                                  <span className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">@{user.username}</span>
                                </div>
                              </div>
                              <div className="relative flex items-center justify-center">
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors peer focus:outline-none">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                </button>
                                <div className="absolute right-0 top-6 mt-1 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 opacity-0 invisible peer-focus:opacity-100 peer-focus:visible hover:opacity-100 hover:visible transition-all z-50 overflow-hidden">
                                  <button onClick={() => router.push(`/${locale}/p/${user.username}/${user.id}`)} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-white/5">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    {t("viewProfile")}
                                  </button>
                                  <button onClick={() => handleListConnectionAction(user.id, (isOwnProfile && activeStatTab === 'followers' && !user.isFriend) ? 'remove_follower' : 'other')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-white/5">
                                    {isOwnProfile ? (
                                      <>
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                        {user.isFriend ? t("removeFriend") : t("removeFollower")}
                                      </>
                                    ) : user.isFriend ? (
                                      <>
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                        {t("removeFriend")}
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        {t("followBtn")}
                                      </>
                                    )}
                                  </button>
                                  <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-white/5">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {t("reportAccount")}
                                  </button>
                                  <button onClick={() => handleListBlockAction(user.id)} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    {t("blockAccount")}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {statsUsers.length > 8 && (
                        <div className="flex justify-center items-center mt-auto pt-6 px-2 gap-4">
                          <button
                            disabled={statPage === 1}
                            onClick={() => setStatPage(p => p - 1)}
                            className="p-2 rounded-full bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Halaman {statPage}</span>
                          <button
                            disabled={statPage * 8 >= statsUsers.length}
                            onClick={() => setStatPage(p => p + 1)}
                            className="p-2 rounded-full bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 flex-1">
                      {/* 1. Grup yang kamu buat */}
                      {(!expandedGroupTab || expandedGroupTab === 'managed') && isVisible(settings?.privacyOwnedGroups) && (
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[15px] font-bold text-black dark:text-white flex items-center gap-2">
                              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                              {t("managedGroups")}
                            </h3>
                            {expandedGroupTab === 'managed' ? (
                              <button onClick={() => { setExpandedGroupTab(null); setGroupPage(1); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            ) : (
                              managedGroups.length > 2 && (
                                <button onClick={() => { setExpandedGroupTab('managed'); setGroupPage(1); }} className="text-[13px] font-bold text-[#10B981] hover:text-emerald-700 transition-colors">{t("seeAll") || "Lihat Semua"}</button>
                              )
                            )}
                          </div>

                          {managedGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                              <p className="text-[14px] font-bold text-gray-700 dark:text-gray-300">Tidak ada grup</p>
                              <p className="text-[12px] text-gray-500 mt-1 max-w-[200px]">Pengguna ini belum membuat grup apa pun.</p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {managedGroups.slice(expandedGroupTab === 'managed' ? (groupPage - 1) * 5 : 0, expandedGroupTab === 'managed' ? groupPage * 5 : 2).map((group, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-[#242526]/40 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#2A2B2C] hover:shadow-sm transition-all cursor-pointer group">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform`}>
                                      {group.initial}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{group.name}</p>
                                        {group.role === 'Owner' ? (
                                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm">
                                            <img src="/owner.svg" alt="Owner" className="w-3 h-3 invert dark:invert-0" style={{ filter: "brightness(0) invert(1)" }} />
                                            <span className="text-[10px] font-bold uppercase">{group.role}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm">
                                            <img src="/admin.svg" alt="Admin" className="w-3 h-3 invert dark:invert-0" style={{ filter: "brightness(0) invert(1)" }} />
                                            <span className="text-[10px] font-bold uppercase">{group.role}</span>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{group.members} Member</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-semibold text-[13px] transition-colors">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                      {t("joinGroup")}
                                    </button>
                                    <div className="relative flex items-center justify-center">
                                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors peer focus:outline-none">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                      </button>
                                      <div className="absolute right-0 top-6 mt-1 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 opacity-0 invisible peer-focus:opacity-100 peer-focus:visible hover:opacity-100 hover:visible transition-all z-50 overflow-hidden">
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-white/5">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                          {t("viewGroup")}
                                        </button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                          {t("reportCommunity")}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {expandedGroupTab === 'managed' && managedGroups.length > 5 && (
                            <div className="flex justify-center items-center mt-auto pt-6 px-2 gap-4">
                              <button
                                disabled={groupPage === 1}
                                onClick={() => setGroupPage(p => p - 1)}
                                className="p-2 rounded-full bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Halaman {groupPage}</span>
                              <button
                                disabled={groupPage * 5 >= managedGroups.length}
                                onClick={() => setGroupPage(p => p + 1)}
                                className="p-2 rounded-full bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Komunitas yang diikuti */}
                      {(!expandedGroupTab || expandedGroupTab === 'joined') && isVisible(settings?.privacyJoinedGroups) && (
                        <div className={`flex flex-col flex-1 ${expandedGroupTab ? "" : "w-full mt-2"}`}>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[15px] font-bold text-black dark:text-white flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                              {t("joinedGroups")}
                            </h3>
                            {expandedGroupTab === 'joined' ? (
                              <button onClick={() => { setExpandedGroupTab(null); setGroupPage(1); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] text-gray-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            ) : (
                              joinedGroups.length > 2 && (
                                <button onClick={() => { setExpandedGroupTab('joined'); setGroupPage(1); }} className="text-[13px] font-bold text-[#10B981] hover:text-emerald-700 transition-colors">{t("seeAll") || "Lihat Semua"}</button>
                              )
                            )}
                          </div>

                          {joinedGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                              <p className="text-[14px] font-bold text-gray-700 dark:text-gray-300">Tidak ada grup</p>
                              <p className="text-[12px] text-gray-500 mt-1 max-w-[200px]">Pengguna ini belum bergabung dengan grup apa pun.</p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {joinedGroups.slice(expandedGroupTab === 'joined' ? (groupPage - 1) * 5 : 0, expandedGroupTab === 'joined' ? groupPage * 5 : 2).map((group, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-[#242526]/40 border border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-[#2A2B2C] hover:shadow-sm transition-all cursor-pointer group">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform`}>
                                      {group.initial}
                                    </div>
                                    <div>
                                      <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{group.name}</p>
                                      <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{group.members} Member</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    {/* Visit Button */}
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-emerald-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 font-semibold text-[13px] transition-colors">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      {t("visit")}
                                    </button>

                                    {/* 3-dots Dropdown */}
                                    <div className="relative flex items-center justify-center">
                                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors peer focus:outline-none">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                      </button>
                                      <div className="absolute right-0 top-6 mt-1 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 opacity-0 invisible peer-focus:opacity-100 peer-focus:visible hover:opacity-100 hover:visible transition-all z-50 overflow-hidden">
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-white/5">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                          {t("joinOnly") || "Gabung"}
                                        </button>
                                        <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                          {t("reportCommunity")}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {expandedGroupTab === 'joined' && joinedGroups.length > 5 && (
                            <div className="flex justify-center items-center mt-auto pt-6 px-2 gap-4">
                              <button
                                disabled={groupPage === 1}
                                onClick={() => setGroupPage(p => p - 1)}
                                className="p-2 rounded-full bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Halaman {groupPage}</span>
                              <button
                                disabled={groupPage * 5 >= joinedGroups.length}
                                onClick={() => setGroupPage(p => p + 1)}
                                className="p-2 rounded-full bg-gray-200 dark:bg-[#3A3B3C] text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div id="profile-tabs-anchor" className="w-full max-w-[590px] mx-auto border-t border-gray-300 dark:border-gray-700 mt-4"></div>

                {/* Tabs Navigation - Gradient Pill Style */}
                <div className="flex justify-center w-full relative z-10">
                  <ul className="flex gap-3 p-2">
                    {[
                      {
                        id: 'posts', label: 'Post', gradientFrom: '#10B981', gradientTo: '#34D399',
                        icon: <div className="w-6 h-6 bg-current" style={{ WebkitMask: "url(/navigasi/posting.svg) center/contain no-repeat", mask: "url(/navigasi/posting.svg) center/contain no-repeat" }} />
                      },
                      {
                        id: 'gallery', label: 'Gallery', gradientFrom: '#56CCF2', gradientTo: '#2F80ED',
                        icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11V9a2 2 0 00-2-2H9a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2v-2M15 4H5a2 2 0 00-2 2v10m12 0l-3-3m0 0l-3 3m3-3v6" /></svg>
                      },
                      {
                        id: 'project', label: 'Project', gradientFrom: '#a955ff', gradientTo: '#ea51ff',
                        icon: <div className="w-6 h-6 bg-current" style={{ WebkitMask: "url(/navigasi/project.svg) center/contain no-repeat", mask: "url(/navigasi/project-outline.svg) center/contain no-repeat" }} />
                      }
                    ].map(({ id, label, icon, gradientFrom, gradientTo }) => (
                      <li
                        key={id}
                        onClick={() => setActiveTab(id)}
                        style={{ '--gradient-from': gradientFrom, '--gradient-to': gradientTo } as React.CSSProperties}
                        className={`relative h-[52px] bg-white dark:bg-[#3A3B3C] shadow-lg dark:shadow-black/40 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer overflow-hidden ${activeTab === id ? 'w-[140px] shadow-none' : 'w-[52px] group hover:w-[140px]'}`}
                      >
                        {/* Gradient background */}
                        <span className={`absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] transition-opacity duration-500 ${activeTab === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
                        {/* Blur glow */}
                        <span className={`absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] -z-10 transition-opacity duration-500 ${activeTab === id ? 'opacity-50' : 'opacity-0 group-hover:opacity-50'}`}></span>
                        {/* Icon */}
                        <span className={`relative z-10 text-gray-500 dark:text-gray-300 transition-all duration-300 ${activeTab === id ? 'scale-0 w-0 overflow-hidden' : 'scale-100 group-hover:scale-0 group-hover:w-0 group-hover:overflow-hidden'}`}>
                          {icon}
                        </span>
                        {/* Label */}
                        <span className={`absolute text-white uppercase tracking-wide text-sm font-bold transition-all duration-300 ${activeTab === id ? 'scale-100 opacity-100' : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`} style={{ transitionDelay: activeTab === id ? '0ms' : '100ms' }}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>





                {/* Tab Content Area */}
                <div className="mt-2 flex flex-col gap-4 max-w-[590px] w-full mx-auto min-h-[100vh] pb-8">
                  <div className={activeTab === 'posts' ? 'block' : 'hidden'}>
                    {/* Create Post Input */}
                    {isOwnProfile && (
                      <div className="bg-transparent sm:bg-white sm:dark:bg-[#242526] rounded-none sm:rounded-xl shadow-none sm:shadow-sm border-0 sm:border border-b border-gray-200 dark:border-[#3E4042] sm:border-gray-100 sm:dark:border-[#3E4042] p-4 w-full mb-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-[#3E4042] sm:border-gray-100">
                          <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-emerald-600 dark:border-emerald-400">
                            <img
                              src={avatarPreview ? getOptimizedUrl(avatarPreview, "avatar") : "/default-avatar.svg"}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder={tFeed("createPost")}
                            className="w-full bg-white sm:bg-[#F0F2F5] dark:bg-[#242526] sm:dark:bg-[#3A3B3C] hover:bg-gray-50 sm:hover:bg-[#E4E6EB] dark:hover:bg-[#3A3B3C] sm:dark:hover:bg-[#4E4F50] transition-colors rounded-full px-4 py-2.5 focus:outline-none cursor-pointer text-gray-600 dark:text-[#B0B3B8] text-[17px] shadow-sm sm:shadow-none"
                            readOnly
                            onClick={() => { setStartWithGalleryModal(false); setIsCreatePostModalOpen(true); }}
                          />
                        </div>
                        <div className="flex justify-between items-center sm:gap-3 pt-3 px-1">
                          <button onClick={() => { setStartWithGalleryModal(false); setIsCreatePostModalOpen(true); }} className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                            <div className="w-[24px] h-[24px] bg-current text-[#8B4513]" style={{ WebkitMask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat", mask: "url(/navigasi/produk-aktif.svg) center/contain no-repeat" }} />
                            {tFeed("product") || "Product"}
                          </button>
                          <button onClick={() => { setStartWithGalleryModal(false); setIsCreatePostModalOpen(true); }} className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                            <div className="w-[24px] h-[24px] bg-current text-purple-500" style={{ WebkitMask: "url(/navigasi/project.svg) center/contain no-repeat", mask: "url(/navigasi/project.svg) center/contain no-repeat" }} />
                            {tFeed("project") || "Project"}
                          </button>
                          <button onClick={() => { setStartWithGalleryModal(false); setIsCreatePostModalOpen(true); }} className="flex items-center gap-2 text-[15px] font-semibold text-[#65676B] dark:text-[#B0B3B8] hover:bg-gray-200 dark:hover:bg-[#3A3B3C] p-2 rounded-lg flex-1 justify-center transition-colors">
                            <img src="/visit.png" alt="Page" className="w-[24px] h-[24px] object-contain" />
                            {tFeed("page") || "Halaman"}
                          </button>
                        </div>
                      </div>
                    )}
                    <PostFeed currentUser={currentUser} targetProfileId={id} />
                  </div>

                  <div className={activeTab === 'gallery' ? 'block' : 'hidden'}>
                    <>
                      <div>

                        <div className="relative group/album">
                          {/* Left Arrow — hanya tampil jika scroll container overflow di sebelah kiri */}
                          {showAlbumLeftArrow && (
                            <button
                              onClick={() => scrollAlbumCarousel('left')}
                              className="absolute -left-3 top-1/2 -translate-y-[80%] z-10 w-8 h-8 flex items-center justify-center bg-white dark:bg-[#3A3B3C] rounded-full shadow-md border border-gray-200 dark:border-[#4E4F50] text-gray-600 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                          )}

                          {/* Carousel Container */}
                          <div ref={albumCarouselRef} onScroll={checkAlbumCarouselOverflow} className="flex overflow-x-auto gap-4 snap-x snap-mandatory py-2 px-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {isLoadingGalleries ? (
                              [1, 2, 3].map((n) => (
                                <div key={n} className="shrink-0 w-[140px] snap-start flex flex-col gap-1.5 animate-pulse">
                                  <div className="p-1 rounded-xl">
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                  </div>
                                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-1 mt-1"></div>
                                </div>
                              ))
                            ) : (
                              <>
                                {galleries.length === 0 ? (
                                  !isOwnProfile ? <div className="text-gray-500 dark:text-[#B0B3B8] text-[14px] flex items-center justify-center w-full py-4">{t("noGallery")}</div> : null
                                ) : (
                              galleries.map((gallery, i) => (
                                <div key={gallery.id} onClick={() => { setActiveAlbumIdx(activeAlbumIdx === i ? null : i); setInlineCarouselIdx(0); }} className="shrink-0 w-[140px] snap-start flex flex-col gap-1.5 group cursor-pointer">
                                  {/* Thumbnail card */}
                                  <div className={`p-1 rounded-xl transition-colors ${activeAlbumIdx === i ? 'bg-gray-100 dark:bg-[#3A3B3C]' : 'hover:bg-gray-200 dark:hover:bg-[#3A3B3C]/50'}`}>
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative border border-gray-100 dark:border-[#3E4042] flex items-center justify-center">
                                      {/* Default media preview (placeholder for now, wait until posts API logic is there) */}
                                      {gallery.coverUrl ? (
                                        gallery.coverUrl.endsWith('.mp4') || gallery.coverUrl.endsWith('.webm') ? (
                                          <video src={gallery.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" muted playsInline />
                                        ) : (
                                          <img src={getMediaThumbnail(gallery.coverUrl)} alt={gallery.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        )
                                      ) : gallery.posts && gallery.posts.length > 0 && gallery.posts[gallery.posts.length - 1].postMedia && gallery.posts[gallery.posts.length - 1].postMedia.length > 0 ? (
                                        (() => {
                                          const coverMedia = gallery.posts[gallery.posts.length - 1].postMedia[0].media;
                                          const coverUrl = coverMedia.thumbUrl || coverMedia.feedUrl || coverMedia.originalUrl;
                                          if (coverMedia.type === 'VIDEO') {
                                            return <video src={coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" muted playsInline />;
                                          }
                                          return <img src={getMediaThumbnail(coverUrl)} alt={gallery.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />;
                                        })()
                                      ) : (
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                    </div>
                                  </div>
                                  {/* Nama gallery dan Opsi — di luar card, tepat di bawah thumbnail */}
                                  <div className="flex items-center justify-between px-1 relative">
                                    <p className="text-[13px] font-semibold text-gray-700 dark:text-[#E4E6EB] truncate pr-1">
                                      {gallery.name}
                                    </p>
                                    {isOwnProfile && (
                                      <div className="relative">
                                        <button 
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (activeGalleryMenuId === gallery.id) {
                                              setActiveGalleryMenuId(null);
                                              setGalleryMenuCoords(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setGalleryMenuCoords({ x: rect.right, y: rect.bottom });
                                              setActiveGalleryMenuId(gallery.id); 
                                            }
                                          }}
                                          className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                                )}

                                {isOwnProfile && (
                                  <div onClick={() => { setStartWithGalleryModal(true); setIsCreatePostModalOpen(true); }} className="shrink-0 w-[140px] snap-start flex flex-col gap-1.5 group cursor-pointer justify-start">
                                    <div className="p-1 rounded-xl">
                                      <div className="aspect-square rounded-lg border-2 border-dashed border-[#10B981] dark:border-[#10B981] flex flex-col items-center justify-center hover:bg-[#10B981]/10 transition-colors">
                                        <svg className="w-8 h-8 text-[#10B981] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                        <span className="text-[13px] font-bold text-[#10B981]">{t("addGallery")}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Right Arrow — hanya tampil jika scroll container overflow di sebelah kanan */}
                          {showAlbumRightArrow && (
                            <button
                              onClick={() => scrollAlbumCarousel('right')}
                              className="absolute -right-3 top-1/2 -translate-y-[80%] z-10 w-8 h-8 flex items-center justify-center bg-white dark:bg-[#3A3B3C] rounded-full shadow-md border border-gray-200 dark:border-[#4E4F50] text-gray-600 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {(activeAlbumIdx !== null || (isLoadingGalleries && urlGalleryId)) && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-300 w-full mt-2">
                          <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="font-bold text-[17px] text-black dark:text-[#E4E6EB]">
                              {t("albumContents")} {isLoadingGalleries ? <span className="inline-block w-32 h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded align-middle ml-1"></span> : (activeAlbumIdx !== null ? galleries[activeAlbumIdx]?.name : "")}
                            </h3>

                            <div className="flex items-center gap-4">
                              {/* Grid toggles */}
                              <div className="flex items-center bg-gray-200/60 dark:bg-[#242526] rounded-lg p-1 border border-gray-300/50 dark:border-[#3E4042]">
                                {(isGridLayoutExpanded ? [1, 3, 5] : [albumGridCols]).map((cols) => (
                                  <button
                                    key={cols}
                                    onClick={() => {
                                      if (isGridLayoutExpanded) {
                                        setAlbumGridCols(cols);
                                        setIsGridLayoutExpanded(false);
                                      } else {
                                        setIsGridLayoutExpanded(true);
                                      }
                                    }}
                                    className={`w-8 h-7 flex items-center justify-center rounded-md text-[13px] font-bold transition-all ${albumGridCols === cols ? 'bg-white dark:bg-[#4E4F50] text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#B0B3B8] hover:text-black dark:hover:text-white'}`}
                                  >
                                    {cols === 1 ? (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
                                    ) : cols === 3 ? (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 500 500"><g transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)"
                                        stroke="none">
                                        <path d="M270 4921 c-74 -23 -127 -69 -159 -141 -20 -44 -21 -62 -21 -772 l0
-728 745 0 745 0 0 825 0 825 -642 -1 c-354 0 -654 -4 -668 -8z"/>
                                        <path d="M1680 4105 l0 -825 815 0 815 0 0 825 0 825 -815 0 -815 0 0 -825z" />
                                        <path d="M3420 4105 l0 -825 745 0 745 0 0 728 c0 710 -1 728 -21 772 -25 55
-62 95 -114 123 -40 22 -46 22 -697 25 l-658 3 0 -826z"/>
                                        <path d="M90 2455 l0 -725 745 0 745 0 -2 723 -3 722 -742 3 -743 2 0 -725z" />
                                        <path d="M1680 2455 l0 -725 815 0 815 0 0 725 0 725 -815 0 -815 0 0 -725z" />
                                        <path d="M3420 2455 l0 -725 745 0 745 0 0 725 0 725 -745 0 -745 0 0 -725z" />
                                        <path d="M90 943 c0 -660 1 -679 21 -723 25 -55 62 -95 114 -123 40 -22 46
-22 698 -25 l657 -3 0 776 0 775 -745 0 -745 0 0 -677z"/>
                                        <path d="M1680 845 l0 -775 815 0 815 0 0 775 0 775 -815 0 -815 0 0 -775z" />
                                        <path d="M3420 845 l0 -776 658 3 c651 3 657 3 697 25 52 28 89 68 114 123 20
44 21 63 21 723 l0 677 -745 0 -745 0 0 -775z"/>
                                      </g></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 500 500"><g transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)"
                                        stroke="none">
                                        <path d="M270 4921 c-77 -24 -148 -90 -168 -160 -9 -27 -12 -241 -12 -760 l0
-721 410 0 410 0 0 825 0 825 -307 -1 c-170 0 -319 -4 -333 -8z"/>
                                        <path d="M1020 4105 l0 -825 475 0 475 0 0 825 0 825 -475 0 -475 0 0 -825z" />
                                        <path d="M2070 4105 l0 -825 475 0 475 0 0 825 0 825 -475 0 -475 0 0 -825z" />
                                        <path d="M3120 4105 l0 -825 455 0 455 0 0 825 0 825 -455 0 -455 0 0 -825z" />
                                        <path d="M4140 4106 l0 -826 385 0 385 0 0 721 c0 519 -3 733 -12 760 -15 51
-69 114 -122 142 -39 21 -54 22 -338 25 l-298 3 0 -825z"/>
                                        <path d="M90 2455 l0 -725 410 0 410 0 0 725 0 725 -410 0 -410 0 0 -725z" />
                                        <path d="M1020 2455 l0 -725 475 0 475 0 -2 723 -3 722 -472 3 -473 2 0 -725z" />
                                        <path d="M2077 3173 c-4 -3 -7 -330 -7 -725 l0 -718 475 0 475 0 -2 723 -3
722 -466 3 c-256 1 -469 -1 -472 -5z"/>
                                        <path d="M3127 3173 c-4 -3 -7 -330 -7 -725 l0 -718 455 0 455 0 0 725 0 725
-448 0 c-247 0 -452 -3 -455 -7z"/>
                                        <path d="M4140 2455 l0 -725 385 0 385 0 0 725 0 725 -385 0 -385 0 0 -725z" />
                                        <path d="M90 943 c0 -660 1 -679 21 -723 25 -55 62 -95 114 -123 38 -21 54
-22 363 -25 l322 -3 0 775 0 776 -410 0 -410 0 0 -677z"/>
                                        <path d="M1020 845 l0 -775 475 0 475 0 0 775 0 775 -475 0 -475 0 0 -775z" />
                                        <path d="M2070 845 l0 -775 475 0 475 0 0 775 0 775 -475 0 -475 0 0 -775z" />
                                        <path d="M3120 845 l0 -775 455 0 455 0 0 775 0 775 -455 0 -455 0 0 -775z" />
                                        <path d="M4140 844 l0 -775 298 3 c282 3 299 4 337 25 52 28 89 68 114 123 20
44 21 63 21 723 l0 677 -385 0 -385 0 0 -776z"/>
                                      </g></svg>
                                    )}
                                  </button>
                                ))}
                              </div>

                              {/* Close button */}
                              <button onClick={() => setActiveAlbumIdx(null)} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                          {(() => {
                            if (isLoadingGalleries) {
                              return (
                                <div className={`grid gap-2 transition-all duration-300 ${albumGridCols === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                                  {Array.from({ length: 15 }).map((_, i) => (
                                    <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
                                  ))}
                                </div>
                              );
                            }

                            const activeGallery = activeAlbumIdx !== null ? galleries[activeAlbumIdx] : null;
                            const albumMediaItems = activeGallery ? (activeGallery.posts ?? []).flatMap((post: any) => (post.postMedia ?? []).map((pm: any) => ({ ...pm.media, postId: post.id, galleryId: activeGallery.id }))) : [];

                            const renderAddMediaBox = () => {
                              if (!isOwnProfile || !activeGallery) return null;
                              return (
                                <div
                                  onClick={() => {
                                    setCreatedGalleryId(activeGallery.id);
                                    setCreatedGallery(activeGallery);
                                    setIsCreatePostModalOpen(true);
                                    setStartWithGalleryModal(false);
                                  }}
                                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-[#4E4F50] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex flex-col items-center justify-center cursor-pointer transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                  </div>
                                </div>
                              );
                            };

                            if (albumMediaItems.length === 0) {
                              return (
                                <div className={`grid gap-2 transition-all duration-300 ${albumGridCols === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                                  {renderAddMediaBox()}
                                  {!isOwnProfile && <div className="col-span-full text-gray-500 text-center py-8">{t("emptyAlbum")}</div>}
                                </div>
                              );
                            }

                            const safeInlineIdx = Math.max(0, Math.min(inlineCarouselIdx, albumMediaItems.length - 1));

                            if (albumGridCols === 1) {
                              return (
                                <div className="relative w-full">
                                  <div className="flex w-full aspect-[4/3] sm:aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group relative items-center justify-center">
                                    {albumMediaItems[safeInlineIdx]?.type === 'VIDEO' ? (
                                      <video
                                        key={`video-${albumMediaItems[safeInlineIdx]?.id || safeInlineIdx}`}
                                        src={albumMediaItems[safeInlineIdx]?.detailUrl || albumMediaItems[safeInlineIdx]?.originalUrl}
                                        className="w-full h-full object-contain bg-black cursor-pointer"
                                        controls
                                      />
                                    ) : (
                                      <img
                                        key={`img-${albumMediaItems[safeInlineIdx]?.id || safeInlineIdx}`}
                                        src={getMediaThumbnail(albumMediaItems[safeInlineIdx]?.detailUrl || albumMediaItems[safeInlineIdx]?.originalUrl, 'feed')}
                                        alt={`Album item ${safeInlineIdx}`}
                                        className="w-full h-full object-contain bg-black cursor-pointer"
                                        onClick={() => { setGalleryPreviewIdx(safeInlineIdx); setGalleryPreviewModalOpen(true); }}
                                      />
                                    )}
                                    {isOwnProfile && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const media = albumMediaItems[safeInlineIdx];
                                          const mId = media?.id || safeInlineIdx.toString();
                                          if (activeMediaMenuId === mId) {
                                            setActiveMediaMenuId(null);
                                            setMediaMenuCoords(null);
                                            setMediaToMove(null);
                                          } else {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMediaMenuCoords({ x: rect.right, y: rect.bottom });
                                            setActiveMediaMenuId(mId);
                                            if (media) {
                                              setMediaToMove({ postId: media.postId, mediaId: media.id, currentGalleryId: media.galleryId, mediaUrl: media.thumbUrl || media.feedUrl || media.originalUrl, originalUrl: media.originalUrl });
                                            }
                                          }
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-100 transition-opacity z-10 cursor-pointer"
                                      >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                                      </button>
                                    )}
                                    {safeInlineIdx > 0 && (
                                      <button
                                        onClick={() => setInlineCarouselIdx(prev => prev - 1)}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                      </button>
                                    )}
                                    {safeInlineIdx < albumMediaItems.length - 1 && (
                                      <button
                                        onClick={() => setInlineCarouselIdx(prev => prev + 1)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                      </button>
                                    )}
                                  </div>
                                  {isOwnProfile && activeGallery && (
                                    <div
                                      onClick={() => {
                                        setCreatedGalleryId(activeGallery.id);
                                        setCreatedGallery(activeGallery);
                                        setIsCreatePostModalOpen(true);
                                        setStartWithGalleryModal(false);
                                      }}
                                      className="mt-2 w-full py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#4E4F50] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center cursor-pointer transition-colors"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                className={`grid gap-2 transition-all duration-300 ${albumGridCols === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
                              >
                                {albumMediaItems.map((media: any, idx: number) => (
                                  <div
                                    key={media?.id || idx}
                                    className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group relative cursor-pointer"
                                    onClick={() => { setGalleryPreviewIdx(idx); setGalleryPreviewModalOpen(true); }}
                                  >
                                    {media?.type === 'VIDEO' ? (
                                      <video src={media?.thumbUrl || media?.feedUrl || media?.originalUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none" muted playsInline />
                                    ) : (
                                      <img src={getMediaThumbnail(media?.thumbUrl || media?.feedUrl || media?.originalUrl)} alt={`Album item ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    )}
                                    {isOwnProfile && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const mId = media.id || idx.toString();
                                          if (activeMediaMenuId === mId) {
                                            setActiveMediaMenuId(null);
                                            setMediaMenuCoords(null);
                                            setMediaToMove(null);
                                          } else {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMediaMenuCoords({ x: rect.right, y: rect.bottom });
                                            setActiveMediaMenuId(mId);
                                            setMediaToMove({ postId: media.postId, mediaId: media.id, currentGalleryId: media.galleryId, mediaUrl: media.thumbUrl || media.feedUrl || media.originalUrl, originalUrl: media.originalUrl });
                                          }
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-100 transition-opacity z-10 cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {renderAddMediaBox()}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  </div>

                  <div className={activeTab === 'project' ? 'block' : 'hidden'}>
                    {isOwnProfile && (
                      <div className="flex justify-center mb-6 mt-4">
                        <button
                          onClick={() => setIsCreateProjectModalOpen(true)}
                          className="px-6 py-2.5 bg-transparent border-2 border-purple-500 text-purple-500 dark:border-purple-400 dark:text-purple-400 font-bold rounded-full hover:bg-purple-50 dark:hover:bg-purple-400/10 transition-all flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          {tProject("addProject")}
                        </button>
                      </div>
                    )}
                    {isLoadingProjects ? (
                      <div className="flex flex-col gap-4">
                        {[1, 2].map((i) => (
                          <div key={i} className="bg-white dark:bg-[#242526] rounded-[20px] shadow-sm border border-gray-100 dark:border-[#3A3B3C] overflow-hidden animate-pulse flex flex-col md:flex-row min-h-[180px]">
                            <div className="w-full md:w-[200px] md:shrink-0 aspect-video md:aspect-auto bg-gray-200 dark:bg-[#3A3B3C]" />
                            <div className="p-5 flex flex-col flex-grow w-full min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex-1 space-y-2">
                                  <div className="h-6 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4" />
                                  <div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/4" />
                                </div>
                                <div className="h-5 bg-gray-200 dark:bg-[#3A3B3C] rounded-full w-20 shrink-0 mt-0.5" />
                              </div>
                              <div className="space-y-2 mb-5">
                                <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-full" />
                                <div className="h-3 bg-gray-200 dark:bg-[#3A3B3C] rounded w-5/6" />
                              </div>
                              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-[#3A3B3C]">
                                <div className="h-6 w-14 bg-gray-200 dark:bg-[#3A3B3C] rounded-full" />
                                <div className="h-6 w-12 bg-gray-200 dark:bg-[#3A3B3C] rounded-full" />
                                <div className="h-6 w-12 bg-gray-200 dark:bg-[#3A3B3C] rounded-full ml-auto" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : projects.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {projects.slice(0, 3).map((p) => {
                          return (
                            <div key={p.id} className="block relative z-0">
                              <HorizontalProjectCard
                                project={p}
                                locale={locale}
                                username={username}
                                isOwnProfile={isOwnProfile}
                                onEdit={(project) => {
                                  setProjectToEdit(project);
                                  setIsCreateProjectModalOpen(true);
                                }}
                                onDelete={(project) => {
                                  setProjectToDelete(project);
                                  setIsDeleteProjectModalOpen(true);
                                }}
                              />
                            </div>
                          );
                        })}
                        {hasMoreProjects && (
                          <div className="py-4 flex justify-center">
                            <button
                              onClick={() => router.push(`/${locale}/project/${username}`)}
                              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-800 dark:text-[#E4E6EB] rounded-full font-semibold transition-colors"
                            >
                              {tProject("viewOtherProjects") || "Lihat Project lain"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                    <div className="bg-white dark:bg-[#242526] rounded-[20px] shadow-sm border border-gray-100 dark:border-[#3A3B3C] p-8 text-center flex flex-col items-center justify-center min-h-[250px]">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-[#3A3B3C] rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <p className="text-gray-800 dark:text-[#E4E6EB] font-bold text-[16px] mb-1">
                        {tProject("noProjectYet") || "Belum ada project"}
                      </p>
                      <p className="text-gray-500 dark:text-[#B0B3B8] text-[14px] max-w-[250px]">
                        {tProject("userHasNoProject", { username }) || `Saat ini ${username} belum mempublikasikan project apapun.`}
                      </p>
                    </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center w-full max-w-[590px] mx-auto mt-4">
                <div className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.12.83-4.06 2.19-5.52l11.33 11.33C16.06 19.17 14.12 20 12 20zm5.81-2.48L6.48 6.19C7.94 4.83 9.88 4 12 4c4.41 0 8 3.59 8 8 0 1.9-.7 3.65-1.81 5.06z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {isBlockedByMe ? t("youBlockedThisAccount", { fallback: "Anda telah memblokir akun ini" }) : t("accountNotAvailable", { fallback: "Akun ini tidak tersedia" })}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  {isBlockedByMe ? t("unblockToSeeContent", { fallback: "Buka blokir untuk melihat postingan, teman, dan berinteraksi kembali dengan akun ini." }) : t("linkMightBeBroken", { fallback: "Tautan yang Anda ikuti mungkin rusak, atau halaman mungkin telah dihapus." })}
                </p>
              </div>
            )}



          </div>
        </div>
      </div>


      {/* Detail Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200" onClick={() => setIsDetailModalOpen(false)}>
          <div
            className="w-full max-w-xl bg-white dark:bg-[#242526] rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 shrink-0">
              <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">{t("profileDetails")}</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3A3B3C] text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className={`p-6 overflow-y-auto custom-scrollbar flex flex-col ${(!profileData?.hardSkills?.length && !profileData?.softSkills?.length && !profileData?.softwareSkills?.length && !profileData?.hobbies?.length && !profileData?.music?.length && !profileData?.tvShows?.length && !profileData?.movies?.length && !profileData?.games?.length && !profileData?.sports?.length) ? 'min-h-[200px] items-center justify-center' : 'gap-8'}`}>

              {(!profileData?.hardSkills?.length && !profileData?.softSkills?.length && !profileData?.softwareSkills?.length && !profileData?.hobbies?.length && !profileData?.music?.length && !profileData?.tvShows?.length && !profileData?.movies?.length && !profileData?.games?.length && !profileData?.sports?.length) && (
                <span className="text-[15px] font-bold text-gray-400 dark:text-gray-500 italic text-center">
                  {t("noInfoPlaceholder") || "Tidak ada informasi"}
                </span>
              )}
              {/* Skills */}
              {(profileData?.hardSkills?.length > 0 || profileData?.softSkills?.length > 0 || profileData?.softwareSkills?.length > 0) && (
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 mb-4">{t("skills")}</h3>
                  <div className="flex flex-col gap-5">

                    {profileData?.hardSkills && profileData.hardSkills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <svg className="w-4.5 h-4.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          <span className="text-[14px] font-bold text-gray-700 dark:text-gray-300">Hard Skill</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileData.hardSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-[#3A3B3C]/40 text-gray-700 dark:text-gray-300 rounded-lg text-[13px] font-semibold border border-gray-200 dark:border-white/5 cursor-default">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profileData?.softSkills && profileData.softSkills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <svg className="w-4.5 h-4.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                          <span className="text-[14px] font-bold text-gray-700 dark:text-gray-300">Soft Skill</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileData.softSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-[#3A3B3C]/40 text-gray-700 dark:text-gray-300 rounded-lg text-[13px] font-semibold border border-gray-200 dark:border-white/5 cursor-default">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profileData?.softwareSkills && profileData.softwareSkills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <svg className="w-4.5 h-4.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                          <span className="text-[14px] font-bold text-gray-700 dark:text-gray-300">Software Skill</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileData.softwareSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-[#3A3B3C]/40 text-gray-700 dark:text-gray-300 rounded-lg text-[13px] font-semibold border border-gray-200 dark:border-white/5 cursor-default">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Hobbies */}
              {profileData?.hobbies && profileData.hobbies.length > 0 && (
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 mb-4">{t("hobbies")}</h3>
                  <div className="flex flex-col gap-2.5">
                    {profileData.hobbies.map((hobby: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50/50 dark:bg-[#3A3B3C]/20 border border-gray-100 dark:border-white/5 rounded-2xl cursor-default">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{hobby}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ketertarikan */}
              {(profileData?.music?.length > 0 || profileData?.tvShows?.length > 0 || profileData?.movies?.length > 0 || profileData?.games?.length > 0 || profileData?.sports?.length > 0) && (
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 mb-4">{t("interests")}</h3>
                  <div className="flex flex-col gap-2.5">
                    {[
                      ...(profileData?.music?.length > 0 ? [{ type: 'Music', value: profileData.music.join(', '), icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', color: 'text-pink-500' }] : []),
                      ...(profileData?.tvShows?.length > 0 ? [{ type: 'TV Shows', value: profileData.tvShows.join(', '), icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'text-indigo-500' }] : []),
                      ...(profileData?.movies?.length > 0 ? [{ type: 'Films', value: profileData.movies.join(', '), icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z', color: 'text-red-500' }] : []),
                      ...(profileData?.games?.length > 0 ? [{ type: 'Games', value: profileData.games.join(', '), icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z', color: 'text-amber-500' }] : []),
                      ...(profileData?.sports?.length > 0 ? [{ type: 'Sports', value: profileData.sports.join(', '), icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-teal-500' }] : [])
                    ].map((interest, i) => (
                      <div key={i} className="flex items-start gap-3.5 p-3.5 bg-gray-50/50 dark:bg-[#3A3B3C]/20 border border-gray-100 dark:border-white/5 rounded-2xl cursor-default">
                        <svg className={`w-5 h-5 mt-0.5 shrink-0 ${interest.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={interest.icon} /></svg>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{interest.type}</span>
                          <span className="text-[14px] font-medium text-gray-800 dark:text-gray-200 mt-0.5 leading-snug">{interest.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}



      <EditProfileModal
        isOpen={isEditModalOpen}
        initialTab={searchParams.get("editTab") || undefined}
        onClose={async () => {
          setIsEditModalOpen(false);
          // Clean up URL if edit params are present
          if (searchParams.has("edit") || searchParams.has("editTab")) {
            router.replace(`/${locale}/p/${username}/${id}`);
          }
          // Re-fetch profile so privacy changes take effect immediately
          const res = await getProfile(id);
          if (res.success && res.profile) {
            setProfileData(res.profile);
            if (res.profile.avatarUrl) setAvatarPreview(res.profile.avatarUrl);
            if (res.profile.coverUrl) setCoverPreview(res.profile.coverUrl);
            if (res.profile.displayName) setDisplayName(res.profile.displayName);
          }
        }}
        currentUser={currentUser}
      />

      <CropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        aspect={cropType === "avatar" ? 1 : 3 / 1}
        cropShape={cropType === "avatar" ? "round" : "rect"}
      />

      <ImagePreviewModal
        isOpen={previewModalOpen}
        imageSrc={getOptimizedUrl(previewImageSrc, "preview")}
        onClose={() => setPreviewModalOpen(false)}
      />

      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
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
                  {tEdit("cancel")}
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
                  {tEdit("reupload")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Media Action Popup Dropdown */}
      {mediaActionMenu && typeof document !== "undefined" && createPortal(
        <>
          {/* Transparent backdrop to dismiss dropdown on outside click */}
          <div
            className="fixed inset-0 z-[99998] bg-transparent"
            onClick={() => setMediaActionMenu(null)}
          />

          {/* Popup Dropdown at Click Coordinates with opacity 30 and blur */}
          <div
            className="fixed z-[99999] w-52 sm:w-56 bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 dark:border-white/15 p-1.5 animate-in fade-in zoom-in-95 duration-150"
            style={(() => {
              const menuWidth = 224;
              const menuHeight = 140;
              const padding = 12;
              let left = mediaActionMenu.coords.x;
              let top = mediaActionMenu.coords.y + 6;

              if (typeof window !== "undefined") {
                if (left + menuWidth > window.innerWidth - padding) {
                  left = Math.max(padding, window.innerWidth - menuWidth - padding);
                }
                if (left < padding) {
                  left = padding;
                }
                if (top + menuHeight > window.innerHeight - padding) {
                  top = Math.max(padding, mediaActionMenu.coords.y - menuHeight - 6);
                }
              }

              return { top, left };
            })()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Option 1: Lihat Gambar */}
            <button
              onClick={() => {
                if (mediaActionMenu.type === "avatar") {
                  setPreviewImageSrc(avatarPreview || "/default-avatar.svg");
                } else {
                  setPreviewImageSrc(coverPreview || "/sampul-placeholder.png");
                }
                setPreviewModalOpen(true);
                setMediaActionMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-white/40 dark:hover:bg-white/15 rounded-xl transition-colors font-medium text-left cursor-pointer"
            >
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{mediaActionMenu.type === "avatar" ? tMedia("viewAvatar") : tMedia("viewCover")}</span>
            </button>

            {/* Option 2: Ubah Gambar */}
            <button
              onClick={() => {
                const type = mediaActionMenu.type;
                setMediaActionMenu(null);
                setMediaModalType(type);
                setMediaModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-white/40 dark:hover:bg-white/15 rounded-xl transition-colors font-medium text-left cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{mediaActionMenu.type === "avatar" ? tMedia("changeAvatar") : tMedia("changeCover")}</span>
            </button>

            {/* Option 3: Hapus Gambar (jika gambar kustom ada) */}
            {(mediaActionMenu.type === "avatar" 
              ? Boolean(avatarPreview && !avatarPreview.includes("default-avatar.svg"))
              : Boolean(coverPreview && !coverPreview.includes("sampul-placeholder.png"))
            ) && (
              <>
                <div className="my-1 border-t border-black/10 dark:border-white/10" />
                <button
                  onClick={handleDeleteProfileMedia}
                  disabled={isDeletingMedia}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/15 dark:hover:bg-red-500/20 rounded-xl transition-colors font-semibold text-left cursor-pointer disabled:opacity-50"
                >
                  {isDeletingMedia ? (
                    <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin shrink-0" />
                  ) : (
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  <span>
                    {isDeletingMedia 
                      ? "..." 
                      : (mediaActionMenu.type === "avatar" ? tMedia("deleteAvatar") : tMedia("deleteCover"))
                    }
                  </span>
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}

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
      {/* Create Gallery Popup Modal */}


      {/* Floating Gallery Menu */}
      {activeGalleryMenuId && galleryMenuCoords && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[99999] w-48 bg-white dark:bg-[#242526] rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1"
          style={{ top: galleryMenuCoords.y + 4, left: galleryMenuCoords.x - 160 }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation(); 
              const g = galleries.find((g: any) => g.id === activeGalleryMenuId);
              if (g) {
                setEditingGalleryId(g.id); 
                setEditingGalleryName(g.name); 
              }
              setActiveGalleryMenuId(null); 
              setGalleryMenuCoords(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            {t("editGalleryName")}
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDeletingGalleryId(activeGalleryMenuId); 
              setActiveGalleryMenuId(null); 
              setGalleryMenuCoords(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {t("deleteGallery")}
          </button>
        </div>,
        document.body
      )}

      {/* Move Gallery Modal */}
      {isMoveGalleryModalOpen && mediaToMove && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col p-4 border border-gray-200 dark:border-[#3E4042]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB]">{tFeed("moveGallery")}</h3>
              <button onClick={() => { setIsMoveGalleryModalOpen(false); setMediaToMove(null); }} className="text-gray-500 hover:text-black dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {galleries.filter(g => g.id !== mediaToMove.currentGalleryId).map(gallery => (
                <button
                  key={gallery.id}
                  disabled={isMovingMediaId !== null}
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (token) {
                      setIsMovingMediaId(gallery.id);
                      try {
                        // Optimistic post update
                        window.dispatchEvent(new CustomEvent("post_media_removed", {
                          detail: { postId: mediaToMove.postId, mediaId: mediaToMove.mediaId, originalUrl: mediaToMove.originalUrl }
                        }));
                        // Background refresh for new post
                        window.dispatchEvent(new CustomEvent("silent_refresh_feed"));
                        
                        await moveMediaToAnotherGallery(currentUser.id, mediaToMove.postId, mediaToMove.mediaId, gallery.id);
                        const res = await getUserGalleries(id, currentUser?.id);
                        if (res.success && res.galleries) {
                          setGalleries(res.galleries);
                        }
                      } finally {
                        setIsMovingMediaId(null);
                        setIsMoveGalleryModalOpen(false);
                        setMediaToMove(null);
                      }
                    }
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#3A3B3C] border border-gray-200 dark:border-[#3E4042] transition-colors disabled:opacity-50"
                >
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-[#E4E6EB]">{gallery.name}</div>
                    <div className="text-xs text-gray-500">
                      {gallery.posts?.reduce((acc: number, post: any) => acc + (post.postMedia?.length || 0), 0) || 0} media
                    </div>
                  </div>
                  {isMovingMediaId === gallery.id && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </button>
              ))}
              {galleries.filter(g => g.id !== mediaToMove.currentGalleryId).length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Tidak ada gallery lain.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Media Menu */}
      {activeMediaMenuId && mediaMenuCoords && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[99999] w-48 bg-white dark:bg-[#242526] rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1"
          style={{ top: mediaMenuCoords.y + 4, left: mediaMenuCoords.x - 160 }}
        >
          {mediaToMove?.currentGalleryId && mediaToMove?.mediaUrl && (
            <>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const token = localStorage.getItem("token");
                  if (token && mediaToMove.currentGalleryId && mediaToMove.mediaUrl) {
                    const targetGalleryId = mediaToMove.currentGalleryId;
                    const targetMediaUrl = mediaToMove.mediaUrl;
                    
                    // Optimistic update
                    setGalleries(prev => prev.map(g => g.id === targetGalleryId ? { ...g, coverUrl: targetMediaUrl } : g));
                    
                    await setGalleryCover(targetGalleryId, targetMediaUrl);
                  }
                  setActiveMediaMenuId(null); 
                  setMediaMenuCoords(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {tFeed("setAsCover")}
              </button>
              
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
            </>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMoveGalleryModalOpen(true);
              setActiveMediaMenuId(null); 
              setMediaMenuCoords(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            {tFeed("moveGallery")}
          </button>
          
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>

          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (mediaToMove) {
                setIsDeleteMediaModalOpen(true);
              }
              setActiveMediaMenuId(null); 
              setMediaMenuCoords(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {tFeed("deleteMedia")}
          </button>
        </div>,
        document.body
      )}



      {/* Edit Gallery Popup Modal */}
      {editingGalleryId && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col p-4 border border-gray-200 dark:border-[#3E4042]">
            <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB] mb-4">{t("editGalleryName")}</h3>
            <input
              type="text"
              placeholder={t("editGalleryName")}
              value={editingGalleryName}
              onChange={(e) => setEditingGalleryName(e.target.value)}
              className="w-full bg-gray-100 dark:bg-[#3A3B3C] text-black dark:text-[#E4E6EB] border border-gray-300 dark:border-[#4E4F50] rounded-lg px-3 py-2 outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingGalleryId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors cursor-pointer">
                {t("cancel")}
              </button>
              <button
                onClick={handleEditGallery}
                disabled={!editingGalleryName.trim() || isEditingGalleryLoading}
                className="px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isEditingGalleryLoading ? "..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Gallery Popup Modal */}
      {deletingGalleryId && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col p-4 border border-gray-200 dark:border-[#3E4042]">
            <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB] mb-4">{t("deleteGallery")}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t("deleteGalleryConfirmText")}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingGalleryId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors cursor-pointer">
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteGallery}
                disabled={isDeletingGalleryLoading}
                className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletingGalleryLoading ? "..." : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Media Popup Modal */}
      {isDeleteMediaModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#242526] rounded-xl shadow-xl flex flex-col p-4 border border-gray-200 dark:border-[#3E4042]">
            <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB] mb-4">{tFeed("deleteMedia")}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {tFeed("deleteMediaConfirmText")}
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setIsDeleteMediaModalOpen(false);
                  setMediaToMove(null);
                }} 
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors cursor-pointer"
              >
                {tFeed("cancel")}
              </button>
              <button
                onClick={handleDeleteMedia}
                disabled={isDeletingMediaLoading}
                className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletingMediaLoading ? "..." : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {isDeleteProjectModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isDeletingProjectLoading && setIsDeleteProjectModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#242526] w-full max-w-[400px] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 dark:border-[#3E4042]">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB] mb-2">{tProject("deleteProjectConfirmTitle")}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed mb-6">
                {tProject("deleteProjectConfirmText")} <span className="font-semibold text-gray-900 dark:text-white">"{projectToDelete?.title}"</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteProjectModalOpen(false)}
                  disabled={isDeletingProjectLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-gray-700 dark:text-[#E4E6EB] bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50"
                >
                  {tFeed("cancel")}
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeletingProjectLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingProjectLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{tFeed("delete")}...</span>
                    </>
                  ) : (
                    <span>{tFeed("delete")}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Media Preview Modal */}
      {galleryPreviewModalOpen && activeAlbumIdx !== null && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/95">
          <button 
            onClick={() => setGalleryPreviewModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 w-10 h-10 flex items-center justify-center bg-black/50 rounded-full transition-colors z-[100001] cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {(() => {
            const activeGallery = activeAlbumIdx !== null ? galleries[activeAlbumIdx] : null;
            const items = activeGallery ? (activeGallery.posts ?? []).flatMap((post: any) => (post.postMedia ?? []).map((pm: any) => pm.media)) : [];
            const currentItem = items[galleryPreviewIdx];

            if (!currentItem) return null;

            return (
              <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12" onClick={() => setGalleryPreviewModalOpen(false)}>
                <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <MediaRenderer 
                    url={currentItem.detailUrl || currentItem.originalUrl} 
                    className="w-full h-full object-contain"
                  />
                </div>

                {galleryPreviewIdx > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setGalleryPreviewIdx(galleryPreviewIdx - 1); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}

                {galleryPreviewIdx < items.length - 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setGalleryPreviewIdx(galleryPreviewIdx + 1); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Post Modal */}
      {isCreatePostModalOpen && (
        <CreatePostModal
          isOpen={isCreatePostModalOpen}
          onClose={() => { setIsCreatePostModalOpen(false); setCreatedGalleryId(undefined); setCreatedGallery(undefined); setStartWithGalleryModal(false); }}
          currentUser={currentUser?.id === id ? { ...currentUser, profile: profileData } : currentUser}
          initialGalleryId={createdGalleryId}
          initialGallery={createdGallery}
          startWithGalleryModal={startWithGalleryModal}
        />
      )}

      <ProjectFormModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => {
          setIsCreateProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        isSubmitting={isSubmittingProject}
        initial={projectToEdit || undefined}
        onSave={async (projectDraft) => {
          setIsSubmittingProject(true);
          try {
            let finalCoverUrls = projectDraft.coverUrls || [];
            
            // Upload new cover files if any
            if (projectDraft.coverFiles && projectDraft.coverFiles.length > 0) {
              const uploadPromises = projectDraft.coverFiles.map(file => uploadToCloudinary(file, "project-cover"));
              const uploadedUrls = await Promise.all(uploadPromises);
              finalCoverUrls = [...finalCoverUrls, ...uploadedUrls];
            }

            let res;
            if (projectDraft.id) {
              res = await updateProject(projectDraft.id, currentUser.id, {
                title: projectDraft.title,
                description: projectDraft.description,
                status: projectDraft.status,
                techStack: projectDraft.techStack,
                repoUrl: projectDraft.repoUrl,
                demoUrl: projectDraft.demoUrl,
                coverUrls: finalCoverUrls,
                mediaUrls: projectDraft.mediaUrls,
                roleNeeded: projectDraft.roleNeeded,
                category: projectDraft.category as any,
                customCategory: projectDraft.customCategory,
                collabTypes: projectDraft.collabTypes as any,
                linkedProductUrl: projectDraft.linkedProductUrl,
                isForSale: projectDraft.isForSale,
              });
            } else {
              res = await createProject({
                userId: currentUser.id,
                title: projectDraft.title,
                description: projectDraft.description,
                status: projectDraft.status,
                techStack: projectDraft.techStack,
                repoUrl: projectDraft.repoUrl,
                demoUrl: projectDraft.demoUrl,
                coverUrls: finalCoverUrls,
                mediaUrls: projectDraft.mediaUrls,
                roleNeeded: projectDraft.roleNeeded,
                category: projectDraft.category as any,
                customCategory: projectDraft.customCategory,
                collabTypes: projectDraft.collabTypes as any,
                linkedProductUrl: projectDraft.linkedProductUrl,
                isForSale: projectDraft.isForSale,
              });
            }

            if (res.success) {
              setIsCreateProjectModalOpen(false);
              setProjectToEdit(null);
              // Optimistically add to UI or trigger a refetch if needed
              window.dispatchEvent(new Event("refresh_projects"));
            } else {
              return "Gagal membuat proyek: " + res.error;
            }
          } catch (error: any) {
            return "Terjadi kesalahan: " + error.message;
          } finally {
            setIsSubmittingProject(false);
          }
        }}
      />

    </main>
  );
}

export default function ProfilePage(props: { params: Promise<{ locale: string; username: string; id: string }> }) {
  return (
    <React.Suspense fallback={null}>
      <ProfilePageContent {...props} />
    </React.Suspense>
  );
}
