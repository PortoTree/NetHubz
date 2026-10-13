"use client";
import NProgress from "nprogress";


import { useTranslations } from "next-intl";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { createFolder, getUserFolders, getRootItems } from "@/app/actions/folders";
import { renameFolder, deleteFolder, searchUsersToInvite, addFolderMember, updateFolderMemberRole, removeFolderMember } from "@/app/actions/folderOptions";
import { useUser } from "@/contexts/UserContext";
import { foldersCache, rootItemsCache } from "@/utils/cache";
import PostCard from "@/components/PostCard";
import HorizontalProjectCard from "@/components/HorizontalProjectCard";
import ProjectCard from "@/components/ProjectCard";
import SavedRootFilterDesktop, { SavedFilterType } from "@/components/SavedRootFilterDesktop";
import SavedRootFilterMobile from "@/components/SavedRootFilterMobile";
import { toast } from "react-hot-toast";

const activeFetches = new Map<string, Promise<any>>();

export default function SavedPageClient() {
  const t = useTranslations("savedPage");
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "id";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [collections, setCollections] = useState<any[]>([]);
  const [rootItems, setRootItems] = useState<any[]>([]);
  const [rootFilter, setRootFilter] = useState<SavedFilterType>("all");
  const { currentUser: user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isRootLoading, setIsRootLoading] = useState(true);

  const filteredRootItems = useMemo(() => {
    if (rootFilter === "all") return rootItems;
    return rootItems.filter((item) => item.type === rootFilter);
  }, [rootItems, rootFilter]);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [renameFolderState, setRenameFolderState] = useState<{ id: string, name: string } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [infoFolderData, setInfoFolderData] = useState<any | null>(null);
  const [allowUserFolder, setAllowUserFolder] = useState<any | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState<string | null>(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState<{top: number, right: number, width: number} | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.folder-dropdown-container')) {
        setOpenDropdownId(null);
      }
      if (!target.closest('.role-dropdown-container') && !target.closest('.role-dropdown-portal')) {
        setOpenRoleDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  useEffect(() => {
    if (user?.id) {
      if (foldersCache.has(user.id)) {
        setCollections(foldersCache.get(user.id));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      if (rootItemsCache.has(user.id)) {
        setRootItems(rootItemsCache.get(user.id));
        setIsRootLoading(false);
      } else {
        setIsRootLoading(true);
      }
      fetchFolders(user.id);
      fetchRootItems(user.id);
    }
  }, [user?.id]);

  const fetchFolders = async (userId: string) => {
    const key = `folders_${userId}`;
    let promise = activeFetches.get(key);

    if (!promise) {
      promise = getUserFolders(userId);
      activeFetches.set(key, promise);
      promise.finally(() => activeFetches.delete(key));
    }

    try {
      const res = await promise;
      if (res.success && res.folders) {
        foldersCache.set(userId, res.folders);
        setCollections(res.folders);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRootItems = async (userId: string) => {
    const key = `rootItems_${userId}`;
    let promise = activeFetches.get(key);

    if (!promise) {
      promise = getRootItems(userId);
      activeFetches.set(key, promise);
      promise.finally(() => activeFetches.delete(key));
    }

    try {
      const res = await promise;
      if (res.success && res.items) {
        rootItemsCache.set(userId, res.items);
        setRootItems(res.items);
      }
    } finally {
      setIsRootLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !formName.trim()) return;
    setIsSubmitting(true);
    const res = await createFolder(user.id, formName, formDesc);
    if (res.success) {
      foldersCache.delete(user.id);
      setIsModalOpen(false);
      setFormName("");
      setFormDesc("");
      fetchFolders(user.id); // Refresh
    }
    setIsSubmitting(false);
  };

  const handleRenameSubmit = async () => {
    if (!renameFolderState?.name.trim() || !user?.id) return;
    setIsRenaming(true);
    const res = await renameFolder(user.id, renameFolderState.id, renameFolderState.name);
    if (res.success) {
      foldersCache.delete(user.id);
      setRenameFolderState(null);
      fetchFolders(user.id);
      toast.success(t("renameSuccess") || "Nama folder berhasil diubah");
    } else {
      toast.error(res.error || t("renameError") || "Gagal mengubah nama folder");
    }
    setIsRenaming(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    setDeleteFolderId(folderId);
  };

  const confirmDeleteAction = async () => {
    if (!user?.id || !deleteFolderId) return;
    setIsDeleting(true);
    const loadingToast = toast.loading(t("deleting") || "Menghapus...");
    const res = await deleteFolder(user.id, deleteFolderId);
    if (res.success) {
      foldersCache.delete(user.id);
      fetchFolders(user.id);
      toast.success(t("deleteSuccess") || "Folder berhasil dihapus", { id: loadingToast });
      setDeleteFolderId(null);
    } else {
      toast.error(res.error || t("deleteError") || "Gagal menghapus folder", { id: loadingToast });
    }
    setIsDeleting(false);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim() && allowUserFolder && user?.id) {
        setIsSearching(true);
        const res = await searchUsersToInvite(searchQuery, allowUserFolder.id, user.id);
        if (res.success && res.users) {
          setSearchResults(res.users);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, allowUserFolder, user?.id]);

  const handleAddMember = async (targetUser: any, role: string) => {
    if (!user?.id || !allowUserFolder) return;
    setIsUpdatingMember(true);
    const loadingToast = toast.loading(t("addingMember") || "Adding member...");
    const res = await addFolderMember(allowUserFolder.id, targetUser.id, role, user.id);
    if (res.success) {
      toast.success(t("addMemberSuccess") || "Berhasil menambah member", { id: loadingToast });
      setSearchQuery("");
      setSearchResults([]);
      foldersCache.delete(user.id);
      fetchFolders(user.id);
      setAllowUserFolder((prev: any) => prev ? {
        ...prev,
        members: [...prev.members, { id: 'temp-' + Date.now(), role, userId: targetUser.id, folderId: prev.id, user: targetUser }]
      } : null);
    } else {
      toast.error(res.error || t("addMemberError") || "Gagal menambah member", { id: loadingToast });
    }
    setIsUpdatingMember(false);
  };

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    if (!user?.id || !allowUserFolder) return;
    setIsUpdatingMember(true);
    const loadingToast = toast.loading(t("updatingRole") || "Updating role...");
    const res = await updateFolderMemberRole(allowUserFolder.id, targetUserId, newRole, user.id);
    if (res.success) {
      toast.success(t("updateRoleSuccess") || "Berhasil mengubah role", { id: loadingToast });
      foldersCache.delete(user.id);
      fetchFolders(user.id);
      setAllowUserFolder((prev: any) => prev ? {
        ...prev,
        members: prev.members.map((m: any) => m.userId === targetUserId ? { ...m, role: newRole } : m)
      } : null);
    } else {
      toast.error(res.error || t("updateRoleError") || "Gagal mengubah role", { id: loadingToast });
    }
    setIsUpdatingMember(false);
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!user?.id || !allowUserFolder) return;
    setIsUpdatingMember(true);
    const loadingToast = toast.loading(t("removingMember") || "Removing member...");
    const res = await removeFolderMember(allowUserFolder.id, targetUserId, user.id);
    if (res.success) {
      toast.success(t("removeMemberSuccess") || "Berhasil menghapus member", { id: loadingToast });
      foldersCache.delete(user.id);
      fetchFolders(user.id);
      setAllowUserFolder((prev: any) => prev ? {
        ...prev,
        members: prev.members.filter((m: any) => m.userId !== targetUserId)
      } : null);
    } else {
      toast.error(res.error || t("removeMemberError") || "Gagal menghapus member", { id: loadingToast });
    }
    setIsUpdatingMember(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b border-gray-300 dark:border-[#3A3B3C] pb-4">
        {/* Toggle Layout */}
        <div className="flex bg-white dark:bg-[#242526] rounded-lg border border-gray-300 dark:border-[#3A3B3C] p-1">
          <button 
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-gray-100 dark:bg-[#3A3B3C] shadow-sm text-[#0866FF] dark:text-[#E4E6EB]" : "text-gray-500 dark:text-[#B0B3B8] opacity-60 hover:opacity-100"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button 
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-gray-100 dark:bg-[#3A3B3C] shadow-sm text-[#0866FF] dark:text-[#E4E6EB]" : "text-gray-500 dark:text-[#B0B3B8] opacity-60 hover:opacity-100"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#242526] text-gray-900 dark:text-[#E4E6EB] font-bold text-sm rounded-lg border-2 border-gray-900 dark:border-[#555] shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <img 
            src="/add-folder.svg" 
            alt="Add" 
            className="w-5 h-5 opacity-80 dark:invert" 
          />
          {t("createCollection")}
        </button>
      </div>

      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-gray-300 dark:border-[#3A3B3C] flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-[#3A3B3C] rounded-lg flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full text-left">
            <div className="grid grid-cols-12 gap-4 items-center pb-3 mb-2 px-2 border-b border-gray-300 dark:border-[#3A3B3C]">
              <div className="col-span-11 sm:col-span-4 lg:col-span-4"><div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/3"></div></div>
              <div className="hidden sm:block sm:col-span-2 lg:col-span-1"><div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/2"></div></div>
              <div className="hidden md:block md:col-span-2 lg:col-span-2"><div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-2/3"></div></div>
              <div className="hidden sm:block sm:col-span-3 lg:col-span-2"><div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-2/3"></div></div>
              <div className="hidden lg:block lg:col-span-2 flex justify-center"><div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/2 mx-auto"></div></div>
            </div>
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center py-3 px-2 border-b border-gray-200 dark:border-[#3A3B3C]/50 animate-pulse">
                  <div className="col-span-11 sm:col-span-4 lg:col-span-4 flex items-center gap-4 pr-4">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-[#3A3B3C] rounded flex-shrink-0"></div>
                    <div className="h-5 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4"></div>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 lg:col-span-1">
                    <div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/2"></div>
                  </div>
                  <div className="hidden md:flex md:col-span-2 lg:col-span-2 items-center gap-2">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-[#3A3B3C] rounded-full shrink-0"></div>
                    <div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-1/2"></div>
                  </div>
                  <div className="hidden sm:block sm:col-span-3 lg:col-span-2">
                    <div className="h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded w-3/4"></div>
                  </div>
                  <div className="hidden lg:flex lg:col-span-2 justify-center">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(j => <div key={j} className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#242526] bg-gray-200 dark:bg-[#3A3B3C]"></div>)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-[#3A3B3C] rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#242526] rounded-2xl border border-gray-200 dark:border-[#3A3B3C]">
          <div className="w-24 h-24 mb-4 opacity-50">
            <img src="/add-folder.svg" alt="Add Folder" className="w-full h-full dark:invert" />
          </div>
          <p className="text-gray-500 dark:text-[#B0B3B8] text-lg font-medium">
            {t("emptyState")}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 text-[#0866FF] font-medium hover:underline text-sm"
          >
            {t("createCollection")}
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "w-full text-left"}>
          {viewMode === "list" && (
            <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-gray-500 dark:text-[#B0B3B8] border-b border-gray-300 dark:border-[#3A3B3C] pb-3 mb-2 px-2">
              <div 
                className="col-span-11 sm:col-span-4 lg:col-span-4 flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-[#E4E6EB] transition-colors select-none"
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
              >
                {t("collectionNameLabel") || "Nama"}
                <div className={`bg-[#0866FF] text-white rounded-full p-0.5 transition-transform duration-200 ${sortOrder === "desc" ? "rotate-180" : ""}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-2 lg:col-span-1">{t("items") || "Items"}</div>
              <div className="hidden md:block md:col-span-2 lg:col-span-2">{t("owner") || "Pemilik"}</div>
              <div className="hidden sm:block sm:col-span-3 lg:col-span-2">{t("dateModified") || "Tanggal diubah"}</div>
              <div className="hidden lg:block lg:col-span-2 text-center">{t("member") || "Member"}</div>
              <div className="col-span-1"></div>
            </div>
          )}
          <div className={viewMode === "list" ? "flex flex-col" : "contents"}>
            {[...collections]
              .sort((a, b) => sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
              .map(folder => {
                const isOwner = folder.userId === user?.id;
                const currentUserMember = folder.members?.find((m: any) => m.userId === user?.id);
                const isViewer = !isOwner && currentUserMember?.role === "VIEWER";
                
              return viewMode === "grid" ? (
                <div key={folder.id} onClick={() => { NProgress.start(); router.push(`/${locale}/saved/${folder.id}`); }} className="bg-white dark:bg-[#242526] p-4 rounded-xl border-2 border-gray-900 dark:border-[#555] shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] dark:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:z-50 transition-all cursor-pointer flex items-center gap-4 relative group">
                  <div className="w-12 h-12 flex-shrink-0 opacity-80">
                    <img src={folder.members?.length > 1 ? "/folder-share.svg" : "/folder-lock.svg"} alt="Folder Icon" className="w-full h-full dark:invert" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB] truncate">{folder.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-[#B0B3B8] truncate">
                      {(folder._count?.savedPosts || 0) + (folder._count?.savedProjects || 0)} Items
                    </p>
                  </div>
                  
                  <div className="absolute right-4 flex justify-end relative group/menu folder-dropdown-container">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setOpenDropdownId(prev => prev === folder.id ? null : folder.id); 
                      }} 
                      className="p-1 text-gray-500 hover:text-gray-900 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB] rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    {/* Dropdown Menu */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className={`absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-200 dark:border-[#3A3B3C] py-1 transition-all z-[999] ${openDropdownId === folder.id ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                    >
                      <button disabled={isViewer} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setRenameFolderState({ id: folder.id, name: folder.name }); }} className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] flex items-center gap-2 transition-colors ${isViewer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#3A3B3C]'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        {t("rename") || "Ganti Nama"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setAllowUserFolder(folder); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        {t("allowUser") || "Allow user"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setInfoFolderData(folder); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        {t("folderInfo") || "Informasi Folder"}
                      </button>
                      <div className="h-px bg-gray-200 dark:bg-[#3A3B3C] my-1"></div>
                      <button disabled={!isOwner} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); handleDeleteFolder(folder.id); }} className={`w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 flex items-center gap-2 transition-colors ${!isOwner ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        {t("deleteFolder") || "Hapus Folder"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={folder.id} onClick={() => { NProgress.start(); router.push(`/${locale}/saved/${folder.id}`); }} className="grid grid-cols-12 gap-4 items-center py-3 px-2 border-b border-gray-200 dark:border-[#3A3B3C]/50 hover:bg-gray-50 dark:hover:bg-[#3A3B3C]/30 transition-colors cursor-pointer group hover:z-50 relative">
                  <div className="col-span-11 sm:col-span-4 lg:col-span-4 flex items-center gap-4 min-w-0 pr-4">
                    <img src={folder.members?.length > 1 ? "/folder-share.svg" : "/folder-lock.svg"} alt="Folder" className="w-6 h-6 dark:invert opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="font-medium text-gray-900 dark:text-[#E4E6EB] truncate">{folder.name}</span>
                  </div>
                  <div className="hidden sm:flex sm:col-span-2 lg:col-span-1 items-center gap-1.5 text-gray-500 dark:text-[#B0B3B8]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>
                    <span className="text-sm font-medium">{(folder._count?.savedPosts || 0) + (folder._count?.savedProjects || 0)}</span>
                  </div>
                  <div className="hidden md:flex md:col-span-2 lg:col-span-2 items-center gap-2 min-w-0">
                    {user?.id === folder.userId && user?.profile?.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : folder.user?.profile?.avatarUrl ? (
                      <img src={folder.user.profile.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                        {user?.id === folder.userId ? user?.username?.[0]?.toUpperCase() : (folder.user?.username?.[0]?.toUpperCase() || "?")}
                      </div>
                    )}
                    <span className="text-sm text-gray-600 dark:text-[#B0B3B8] truncate">
                      {user?.id === folder.userId ? (t("ownerMe") || "saya") : folder.user?.username}
                    </span>
                  </div>
                  <div className="hidden sm:block sm:col-span-3 lg:col-span-2 text-sm text-gray-500 dark:text-[#B0B3B8] truncate">
                    {new Date(folder.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{" "}
                    {user?.id === folder.userId ? "saya" : ""}
                  </div>
                  <div className="hidden lg:flex lg:col-span-2 items-center justify-center">
                    {!folder.members || folder.members.length <= 1 ? (
                      <span className="text-gray-400 dark:text-[#B0B3B8] font-bold">-</span>
                    ) : (
                      <div className="flex -space-x-2 overflow-hidden">
                        {folder.members?.slice(0, 5).map((member: any) => (
                          <div key={member.id} className="inline-block w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#242526] bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                            {member.user?.profile?.avatarUrl ? (
                              <img src={member.user.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                {member.user?.username?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                        ))}
                        {folder.members?.length > 5 && (
                          <div className="inline-block w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#242526] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-medium text-gray-500 shrink-0">
                            +{folder.members.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end relative group/menu folder-dropdown-container">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setOpenDropdownId(prev => prev === folder.id ? null : folder.id); 
                      }} 
                      className="p-1 text-gray-500 hover:text-gray-900 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB] rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    {/* Dropdown Menu */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className={`absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-gray-200 dark:border-[#3A3B3C] py-1 transition-all z-[999] ${openDropdownId === folder.id ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                    >
                      <button disabled={isViewer} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setRenameFolderState({ id: folder.id, name: folder.name }); }} className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] flex items-center gap-2 transition-colors ${isViewer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#3A3B3C]'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        {t("rename") || "Ganti Nama"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setAllowUserFolder(folder); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        {t("allowUser") || "Allow user"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setInfoFolderData(folder); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        {t("folderInfo") || "Informasi Folder"}
                      </button>
                      <div className="h-px bg-gray-200 dark:bg-[#3A3B3C] my-1"></div>
                      <button disabled={!isOwner} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); handleDeleteFolder(folder.id); }} className={`w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 flex items-center gap-2 transition-colors ${!isOwner ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        {t("deleteFolder") || "Hapus Folder"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Root items */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4 border-b border-gray-300 dark:border-[#3A3B3C] pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E6EB]">
            {t("rootItems") || "Item di luar folder"}
          </h2>
          {/* Filter Dropdown Desktop */}
          <div className="hidden md:block">
            <SavedRootFilterDesktop
              activeFilter={rootFilter}
              onFilterChange={setRootFilter}
            />
          </div>
          {/* Filter Dropdown Mobile */}
          <div className="block md:hidden">
            <SavedRootFilterMobile
              activeFilter={rootFilter}
              onFilterChange={setRootFilter}
            />
          </div>
        </div>

        {isRootLoading ? (
          <div className="columns-1 md:columns-2 gap-4 mt-4 w-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-[#3A3B3C] rounded-xl h-64 w-full break-inside-avoid mb-4"></div>
            ))}
          </div>
        ) : filteredRootItems.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {rootItems.length === 0
              ? (locale === "id" ? "Belum ada item di luar folder." : "No items outside folders.")
              : (t("noFilteredItems") || (locale === "id" ? "Belum ada item untuk filter ini." : "No items for this filter yet."))}
          </p>
        ) : (
          <div className="columns-1 md:columns-2 gap-4 mt-4 w-full">
            {filteredRootItems.map((item, idx) => (
              <div key={`${item.type}-${item.id}`} className={`break-inside-avoid ${item.type === 'post' ? 'mb-0 sm:mb-4' : 'mb-4'}`}>
                {item.type === 'post' ? (
                  <div className="-mx-4 sm:mx-0">
                    <PostCard post={item.post} currentUser={user} />
                  </div>
                ) : (
                  <>
                    {/* Versi Mobile: ProjectCard persis seperti di /project/[username] */}
                    <div className="block md:hidden">
                      <ProjectCard
                        project={item.project}
                        locale={locale as string}
                        username={item.project.user?.username || 'user'}
                        currentUser={user}
                        currentUserId={user?.id}
                      />
                    </div>
                    {/* Versi Desktop: Tetap HorizontalProjectCard */}
                    <div className="hidden md:block">
                      <HorizontalProjectCard project={item.project} locale={locale as string} username={item.project.user?.username || 'user'} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#242526] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("createCollection")}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#B0B3B8] mb-1">
                  {t("collectionNameLabel")}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("collectionNamePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3B3C] rounded-lg bg-white dark:bg-[#18191A] text-gray-900 dark:text-[#E4E6EB] focus:outline-none focus:ring-2 focus:ring-[#0866FF] transition-all"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-[#3A3B3C] flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-medium text-sm text-gray-600 dark:text-[#B0B3B8] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {t("btnCancel")}
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={isSubmitting || !formName.trim()}
                className="px-4 py-2 font-medium text-sm text-white bg-[#0866FF] hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Loading..." : t("btnCreate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameFolderState && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#242526] rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("rename") || "Ganti Nama"}
              </h3>
              <button onClick={() => setRenameFolderState(null)} className="text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#B0B3B8] mb-1">
                {t("collectionNameLabel") || "Nama Folder"}
              </label>
              <input
                type="text"
                value={renameFolderState.name}
                onChange={(e) => setRenameFolderState({ ...renameFolderState, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3B3C] rounded-lg bg-white dark:bg-[#18191A] text-gray-900 dark:text-[#E4E6EB] focus:outline-none focus:ring-2 focus:ring-[#0866FF] transition-all"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-[#3A3B3C] flex justify-end gap-2">
              <button onClick={() => setRenameFolderState(null)} className="px-4 py-2 font-medium text-sm text-gray-600 dark:text-[#B0B3B8] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors" disabled={isRenaming}>
                {t("btnCancel") || "Batal"}
              </button>
              <button onClick={handleRenameSubmit} disabled={isRenaming || !renameFolderState.name.trim()} className="px-4 py-2 font-medium text-sm text-white bg-[#0866FF] hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50">
                {isRenaming ? "Loading..." : t("btnSave") || "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoFolderData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#242526] rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] flex justify-between items-center bg-gray-50 dark:bg-[#18191A]">
              <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("folderInfo") || "Informasi Folder"}
              </h3>
              <button onClick={() => setInfoFolderData(null)} className="text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB] p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1">
                  {t("collectionNameLabel") || "Nama Folder"}
                </span>
                <span className="text-gray-900 dark:text-[#E4E6EB] font-medium">{infoFolderData.name}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1">
                  {t("status") || "Status"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium bg-gray-100 dark:bg-[#3A3B3C] text-gray-800 dark:text-[#E4E6EB]">
                  {infoFolderData.members?.length > 1 ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Shared</>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Private</>
                  )}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1">
                  {t("owner") || "Pemilik"}
                </span>
                <div className="flex items-center gap-2 mt-1.5">
                  {infoFolderData.user?.profile?.avatarUrl ? (
                    <img src={infoFolderData.user.profile.avatarUrl} alt="Owner" className="w-6 h-6 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
                      {infoFolderData.user?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-900 dark:text-[#E4E6EB] text-sm font-medium">
                    {infoFolderData.user?.profile?.displayName || infoFolderData.user?.username}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1">
                  {t("dateModified") || "Tanggal diubah"}
                </span>
                <span className="text-gray-900 dark:text-[#E4E6EB] text-sm">
                  {new Date(infoFolderData.updatedAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {infoFolderData.members?.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-2">
                    {t("member") || "Member"} ({infoFolderData.members.length})
                  </span>
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {infoFolderData.members.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-[#3A3B3C]/50 rounded-lg transition-colors">
                        {member.user?.profile?.avatarUrl ? (
                          <img src={member.user.profile.avatarUrl} alt="Member" className="w-7 h-7 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
                            {member.user?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-900 dark:text-[#E4E6EB] text-sm font-medium truncate">
                            {member.user?.profile?.displayName || member.user?.username}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-[#B0B3B8] capitalize">{member.role.toLowerCase()}</span>
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

      {/* Delete Confirmation Modal */}
      {deleteFolderId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#242526] rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("confirmDeleteFolder") || "Hapus Folder"}
              </h3>
              <button onClick={() => setDeleteFolderId(null)} className="text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-[#B0B3B8]">
                {t("confirmDeleteFolderDesc") || "Apakah Anda yakin ingin menghapus folder ini? Item yang tersimpan di dalamnya tidak akan ikut terhapus."}
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-[#3A3B3C] flex justify-end gap-2">
              <button onClick={() => setDeleteFolderId(null)} className="px-4 py-2 font-medium text-sm text-gray-600 dark:text-[#B0B3B8] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg transition-colors" disabled={isDeleting}>
                {t("btnCancel") || "Batal"}
              </button>
              <button onClick={confirmDeleteAction} disabled={isDeleting} className="px-4 py-2 font-medium text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                {isDeleting && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {t("btnDelete") || "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Allow User Modal */}
      {allowUserFolder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#242526] rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-200 dark:border-[#3A3B3C] flex justify-between items-center bg-gray-50 dark:bg-[#18191A]">
              <h3 className="font-bold text-gray-900 dark:text-[#E4E6EB]">
                {t("allowUser") || "Allow user"}
              </h3>
              <button onClick={() => setAllowUserFolder(null)} className="text-gray-500 hover:text-gray-700 dark:text-[#B0B3B8] dark:hover:text-[#E4E6EB] p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#3A3B3C] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              {/* Search User Input */}
              {allowUserFolder.userId === user?.id && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t("searchUserPlaceholder") || "Cari username atau nama..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-[#3A3B3C] rounded-lg bg-gray-50 dark:bg-[#18191A] text-gray-900 dark:text-[#E4E6EB] focus:outline-none focus:ring-2 focus:ring-[#0866FF] transition-all"
                  />
                </div>
              )}

              {/* Search Results */}
              {allowUserFolder.userId === user?.id && searchQuery.trim() !== "" && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-1">
                    {t("searchResults") || "Hasil Pencarian"}
                  </h4>
                  {isSearching ? (
                    <div className="text-sm text-gray-500 py-2 text-center">{t("searching") || "Mencari..."}</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#3A3B3C]/30 border border-gray-200 dark:border-[#3A3B3C]">
                        <div className="flex items-center gap-3 min-w-0">
                          {user.profile?.avatarUrl ? (
                            <img src={user.profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                              {user.username?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-[#E4E6EB] truncate">
                              {user.profile?.displayName || user.username}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-[#B0B3B8] truncate">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            disabled={isUpdatingMember || (allowUserFolder.members?.length || 0) >= 5}
                            onClick={() => handleAddMember(user, "VIEWER")} 
                            className="px-2 py-1 text-xs font-medium text-[#0866FF] bg-blue-50 dark:bg-[#0866FF]/10 rounded-md hover:bg-blue-100 dark:hover:bg-[#0866FF]/20 transition-colors disabled:opacity-50"
                          >
                            {t("add") || "Tambah"}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 py-2 text-center">{t("noUserFound") || "User tidak ditemukan atau sudah menjadi member"}</div>
                  )}
                </div>
              )}

              {/* Members List */}
              {!searchQuery.trim() && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-[#B0B3B8] uppercase tracking-wider mb-3">
                  {t("member") || "Member"} ({allowUserFolder.members?.length || 0})
                </h4>
                <div className="flex flex-col gap-2">
                  {allowUserFolder.members?.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3A3B3C]/30 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-[#3A3B3C]">
                      <div className="flex items-center gap-3 min-w-0">
                        {member.user?.profile?.avatarUrl ? (
                          <img src={member.user.profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                            {member.user?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-[#E4E6EB] truncate">
                            {member.user?.profile?.displayName || member.user?.username}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-[#B0B3B8] truncate">
                            @{member.user?.username}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Role Selector */}
                        {member.userId === allowUserFolder.userId ? (
                          <span className="text-xs font-medium text-gray-500 dark:text-[#B0B3B8] bg-gray-100 dark:bg-[#3A3B3C] px-2 py-1 rounded-md">Owner</span>
                        ) : (
                          <div className="relative role-dropdown-container">
                            <button
                              onClick={(e) => {
                                if (user?.id !== allowUserFolder.userId || isUpdatingMember) return;
                                if (openRoleDropdownId === member.userId) {
                                  setOpenRoleDropdownId(null);
                                  setRoleDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRoleDropdownPos({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                    width: Math.max(100, rect.width)
                                  });
                                  setOpenRoleDropdownId(member.userId);
                                }
                              }}
                              disabled={isUpdatingMember || user?.id !== allowUserFolder.userId}
                              className={`flex items-center justify-between gap-2 text-xs border border-gray-200 dark:border-[#3A3B3C] rounded-md text-gray-700 dark:text-[#E4E6EB] py-1 pl-2 pr-2 transition-all ${user?.id === allowUserFolder.userId ? 'hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer bg-white dark:bg-[#242526]' : 'bg-gray-50 dark:bg-[#18191A] cursor-not-allowed opacity-70'} disabled:opacity-50 min-w-[70px]`}
                            >
                              <span className="capitalize">{member.role.toLowerCase()}</span>
                              {user?.id === allowUserFolder.userId && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openRoleDropdownId === member.userId ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                              )}
                            </button>
                            
                            {openRoleDropdownId === member.userId && roleDropdownPos && user?.id === allowUserFolder.userId && typeof window !== 'undefined' && createPortal(
                              <div 
                                className="fixed bg-white dark:bg-[#242526] rounded-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-[#3A3B3C] py-1 z-[999999] animate-in fade-in slide-in-from-top-2 duration-200 role-dropdown-portal"
                                style={{ top: roleDropdownPos.top, right: roleDropdownPos.right, minWidth: roleDropdownPos.width }}
                              >
                                <button
                                  onClick={() => {
                                    handleUpdateRole(member.userId, "VIEWER");
                                    setOpenRoleDropdownId(null);
                                    setRoleDropdownPos(null);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors ${member.role === 'VIEWER' ? 'text-[#0866FF] font-medium bg-blue-50/50 dark:bg-[#0866FF]/10' : 'text-gray-700 dark:text-[#E4E6EB]'}`}
                                >
                                  Viewer
                                </button>
                                <button
                                  onClick={() => {
                                    handleUpdateRole(member.userId, "EDITOR");
                                    setOpenRoleDropdownId(null);
                                    setRoleDropdownPos(null);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-[#3A3B3C] transition-colors ${member.role === 'EDITOR' ? 'text-[#0866FF] font-medium bg-blue-50/50 dark:bg-[#0866FF]/10' : 'text-gray-700 dark:text-[#E4E6EB]'}`}
                                >
                                  Editor
                                </button>
                              </div>,
                              document.body
                            )}
                          </div>
                        )}
                        
                        {/* Remove Button (Not for owner) */}
                        {member.userId !== allowUserFolder.userId && user?.id === allowUserFolder.userId && (
                          <button 
                            disabled={isUpdatingMember}
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
            {allowUserFolder.userId === user?.id && (
              <div className="p-4 border-t border-gray-200 dark:border-[#3A3B3C] flex justify-between items-center">
                <div className="text-sm font-medium text-red-500">
                  {(allowUserFolder.members?.length || 0) >= 5 && (t("maxMemberLimit") || "Member anda sudah maximal")}
                </div>
                <button onClick={() => setAllowUserFolder(null)} className="px-4 py-2 font-medium text-sm text-white bg-[#0866FF] hover:bg-blue-600 rounded-lg transition-colors">
                  {t("done") || "Selesai"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
