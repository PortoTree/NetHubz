"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useTranslations } from "next-intl";
import { getProjectsByUsername } from "@/app/actions/projects";
import { getOptimizedUrl } from "@/utils/cloudinary";
import { uploadToCloudinary } from "@/utils/uploadImage";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import ProjectCard from "@/components/ProjectCard";
import ProjectBackgroundGridDesktop from "@/components/ProjectBackgroundGridDesktop";
import ProjectBackgroundGridMobile from "@/components/ProjectBackgroundGridMobile";
import ProjectStatsSummaryDesktop from "@/components/ProjectStatsSummaryDesktop";
import ProjectStatsSummaryMobile from "@/components/ProjectStatsSummaryMobile";

import FloatingUserMenu from "@/components/FloatingUserMenu";
import FloatingProjectHubBtn from "@/components/FloatingProjectHubBtn";
import { deleteProject, createProject, updateProject } from "@/app/actions/projects";
import { checkBatchProjectInteractionState } from "@/app/actions/interactions";
import { projectsCache, interactionsCache } from "@/utils/cache";
import ProjectFormModal from "@/components/ProjectFormModal";
import {
  calculateTotalProjectStats,
  getClientTokenUser,
  resolveInteractionUserKey,
} from "@/utils/projectStar";



const activeRequests = new Map<string, Promise<any>>();

export default function ClientUserProjectPage({ username, initialProjects, initialProfileUser, locale }: { username: string, initialProjects: any[], initialProfileUser: any, locale: string }) {
    const decodedUsername = username;
  const t = useTranslations("project");
  const router = useRouter();
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return getClientTokenUser();
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cu = getClientTokenUser();
      if (cu && (!user || user.id !== cu.id)) {
        setUser(cu);
      }
    }
  }, [user]);
  
  const [profileUser, setProfileUser] = useState<any>(initialProfileUser);
  const [projects, setProjects] = useState<any[]>(initialProjects || []);
  const [isLoading, setIsLoading] = useState(!initialProfileUser);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeletingProjectLoading, setIsDeletingProjectLoading] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    setThemeLoaded(true);
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

  const handleDeleteProject = async () => {
    if (!projectToDelete || !user) return;
    try {
      setIsDeletingProjectLoading(true);
      await deleteProject(projectToDelete.id, user.id);
      window.dispatchEvent(new Event("refresh_projects"));
      setIsDeleteProjectModalOpen(false);
      setProjectToDelete(null);
    } catch (e) {
      console.error(e);
      alert(t("errorDefault") || "Terjadi kesalahan");
    } finally {
      setIsDeletingProjectLoading(false);
    }
  };

  const loadProjects = useCallback(async () => {
    const cacheKey = `user_projects_${decodedUsername}`;
    
    // SWR: Initial cache or props
    if (projectsCache.has(cacheKey)) {
      const cached = projectsCache.get(cacheKey);
      setProfileUser(cached.user);
      setProjects(cached.projects);
      setIsLoading(false);
    } else if (initialProfileUser) {
      // Use initial props if available and not cached yet
      projectsCache.set(cacheKey, { user: initialProfileUser, projects: initialProjects });
      projectsCache.set(initialProfileUser.id, { projects: initialProjects, hasMore: initialProjects.length > 3 });
      setIsLoading(false);
      return; // Skip re-fetching on mount if we already have initial data
    } else {
      setIsLoading(true);
    }

    let fetchPromise = activeRequests.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = getProjectsByUsername(decodedUsername);
      activeRequests.set(cacheKey, fetchPromise);
      fetchPromise.finally(() => activeRequests.delete(cacheKey));
    }

    try {
      const res = await fetchPromise;
      if (res.success && res.user) {
        const fetchedProjects = res.projects || [];
        const hasClientToken = typeof window !== "undefined" && !!localStorage.getItem("token");
        const currentActiveUserId = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
        const currentUserKey = resolveInteractionUserKey(currentActiveUserId, hasClientToken);

        const mergedProjects = currentUserKey
          ? fetchedProjects.map((p: any) => {
              const pCacheKey = `interaction_project_${p.id}_${currentUserKey}`;
              if (interactionsCache.has(pCacheKey)) {
                const cached = interactionsCache.get(pCacheKey);
                return {
                  ...p,
                  _count: {
                    ...p._count,
                    likes: cached.likeCount !== undefined ? cached.likeCount : p._count?.likes,
                  }
                };
              }
              return p;
            })
          : fetchedProjects;

        setProfileUser(res.user);
        setProjects(mergedProjects);
        
        projectsCache.set(cacheKey, { user: res.user, projects: mergedProjects });
        projectsCache.set(res.user.id, { projects: mergedProjects, hasMore: mergedProjects.length > 3 });
      } else if (!projectsCache.has(cacheKey)) {
        router.push(`/${locale}/404`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [decodedUsername, router, locale, initialProfileUser, initialProjects, user?.id]);

  useEffect(() => {
    loadProjects();
    const handleRefresh = () => {
      loadProjects();
    };
    const handleProjectSync = (e: any) => {
      const { projectId, likeCount } = e.detail || {};
      if (projectId && likeCount !== undefined) {
        setProjects(prev => prev.map(p => p.id === projectId ? {
          ...p,
          _count: { ...p._count, likes: likeCount }
        } : p));
      }
    };
    window.addEventListener("refresh_projects", handleRefresh);
    window.addEventListener("project_interaction_updated", handleProjectSync);
    return () => {
      window.removeEventListener("refresh_projects", handleRefresh);
      window.removeEventListener("project_interaction_updated", handleProjectSync);
    };
  }, [loadProjects]);

  // Batch-prefetch interaction state for all projects once user + projects are ready
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
  const activeUser = user || (typeof window !== "undefined" ? getClientTokenUser() : null);
  const activeUserId = activeUser?.id;
  const userKey = resolveInteractionUserKey(activeUserId, hasToken);

  const allCached = Boolean(userKey) && projects.length > 0 && projects.every((p: any) =>
    interactionsCache.has(`interaction_project_${p.id}_${userKey}`)
  );
  const [isCountingLoading, setIsCountingLoading] = useState(!allCached && projects.length > 0);

  useEffect(() => {
    if (!projects.length) {
      setIsCountingLoading(false);
      return;
    }

    const hasClientToken = typeof window !== "undefined" && !!localStorage.getItem("token");
    const currentActiveUserId = user?.id || (typeof window !== "undefined" ? getClientTokenUser()?.id : undefined);
    const currentUserKey = resolveInteractionUserKey(currentActiveUserId, hasClientToken);

    // CRITICAL: If client has a token in localStorage, NEVER perform a guest query!
    // Wait until user id is resolved from token.
    if (!currentUserKey) {
      return;
    }

    const uncachedIds = projects
      .map((p: any) => p.id)
      .filter((id: string) => !interactionsCache.has(`interaction_project_${id}_${currentUserKey}`));

    if (!uncachedIds.length) {
      setIsCountingLoading(false);
      return;
    }

    setIsCountingLoading(true);
    checkBatchProjectInteractionState(currentActiveUserId, uncachedIds)
      .then((batchResult: Record<string, any>) => {
        for (const id of uncachedIds) {
          const data = batchResult[id];
          if (data) {
            interactionsCache.set(`interaction_project_${id}_${currentUserKey}`, {
              myReaction: data.myReaction,
              likeCount: data.likeCount,
              commentCount: data.commentCount,
              topReactions: data.topReactions,
              hasSaved: data.hasSaved,
            });
          }
        }
        // Trigger cards to re-read cache
        window.dispatchEvent(new Event("refresh_projects"));
      })
      .catch((err) => {
        console.error("Batch interaction error:", err);
      })
      .finally(() => {
        setIsCountingLoading(false);
      });
  }, [user?.id, projects]);


  if (isLoading) {
    return (
      <div className="relative flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] pt-16 sm:pt-20 pb-6 sm:pb-10 overflow-hidden">
        <ProjectBackgroundGridDesktop />
        <ProjectBackgroundGridMobile />
        <div className="relative z-10 max-w-[1200px] mx-auto w-full px-4">
          <div className="flex flex-col items-center justify-center text-center mb-6 sm:mb-10 animate-pulse">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-300 dark:bg-[#3A3B3C] mb-3 sm:mb-4"></div>
            <div className="w-36 sm:w-48 h-6 sm:h-8 rounded-lg bg-gray-300 dark:bg-[#3A3B3C] mb-2"></div>
            <div className="w-48 sm:w-64 h-4 sm:h-5 rounded-lg bg-gray-300 dark:bg-[#3A3B3C]"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-[#242526] rounded-xl overflow-hidden shadow-sm animate-pulse border border-gray-100 dark:border-[#3A3B3C] h-[360px]">
                <div className="w-full aspect-[4/3] bg-gray-300 dark:bg-[#3A3B3C]"></div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="w-3/4 h-6 rounded-lg bg-gray-300 dark:bg-[#4E4F50]"></div>
                  <div className="w-full h-4 rounded-lg bg-gray-300 dark:bg-[#4E4F50]"></div>
                  <div className="w-5/6 h-4 rounded-lg bg-gray-300 dark:bg-[#4E4F50]"></div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-16 h-6 rounded-full bg-gray-300 dark:bg-[#4E4F50]"></div>
                    <div className="w-16 h-6 rounded-full bg-gray-300 dark:bg-[#4E4F50]"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  const displayName = profileUser.profile?.displayName || profileUser.username;
  const avatar = profileUser.profile?.avatarUrl ? getOptimizedUrl(profileUser.profile.avatarUrl, 'thumb') : null;
  const isOwnProfile = activeUserId === profileUser.id;

  const { totalStars, totalComments } = calculateTotalProjectStats(projects, interactionsCache, activeUserId);

  return (
    <div className="relative flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] pt-16 sm:pt-20 pb-6 sm:pb-10 overflow-hidden">
      <ProjectBackgroundGridDesktop />
      <ProjectBackgroundGridMobile />
      <FloatingProjectHubBtn />
      <FloatingUserMenu isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <div className="relative z-10 max-w-[1200px] mx-auto w-full px-4">
        <div className="flex flex-col items-center justify-center text-center mb-6 sm:mb-10">
          <Link href={`/${locale}/p/${profileUser.username}/${profileUser.id}`} className="block mb-3 sm:mb-4 hover:opacity-80 transition-opacity">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-sm mx-auto border-[3px] sm:border-4 border-white dark:border-[#242526]" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 dark:bg-[#3A3B3C] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-2xl sm:text-3xl mx-auto border-[3px] sm:border-4 border-white dark:border-[#242526]">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </Link>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E6EB] mb-1.5 sm:mb-2 tracking-tight sm:tracking-normal">
            <Link href={`/${locale}/p/${profileUser.username}/${profileUser.id}`} className="hover:underline">
              {t("userPortfolio", { name: displayName })}
            </Link>
          </h1>
          <ProjectStatsSummaryDesktop
            projectCount={projects.length}
            starCount={totalStars}
            commentCount={totalComments}
            isLoading={isCountingLoading}
          />
          <ProjectStatsSummaryMobile
            projectCount={projects.length}
            starCount={totalStars}
            commentCount={totalComments}
            isLoading={isCountingLoading}
          />
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4 bg-white dark:bg-[#242526] rounded-2xl border border-gray-100 dark:border-[#3A3B3C]">
            <p className="text-sm sm:text-base text-gray-500 dark:text-[#B0B3B8]">
              {t("userHasNoProject", { username: displayName }) || `Saat ini ${displayName} belum mempublikasikan project apapun.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p: any) => (
              <div key={p.id} className="block relative z-0 h-full">
                <ProjectCard
                  project={p}
                  locale={locale}
                  username={profileUser.username}
                  isOwnProfile={isOwnProfile}
                  currentUser={activeUser}
                  currentUserId={activeUserId}
                  onEdit={(project) => {
                    setProjectToEdit(project);
                    setIsCreateProjectModalOpen(true);
                  }}
                  onDelete={(project) => {
                    setProjectToDelete(project);
                    setIsDeleteProjectModalOpen(true);
                  }}
                  disableAutoFetch={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-12 sm:mt-20 flex justify-center pb-6 sm:pb-8">
        <img src="/logo-horizontal.png" alt="Mencari" className="h-10 sm:h-16 grayscale opacity-50 dark:opacity-40" />
      </div>

      {/* Modals */}
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
              res = await updateProject(projectDraft.id, user.id, {
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
                userId: user.id,
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
              window.dispatchEvent(new Event("refresh_projects"));
            } else {
              return "Gagal menyimpan proyek: " + res.error;
            }
          } catch (error: any) {
            return "Terjadi kesalahan: " + error.message;
          } finally {
            setIsSubmittingProject(false);
          }
        }}
      />

      {isDeleteProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isDeletingProjectLoading && setIsDeleteProjectModalOpen(false)} />
          <div className="bg-white dark:bg-[#242526] rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-gray-100 dark:border-[#3A3B3C]">
            <div className="mb-6">
              <h3 className="text-[18px] font-bold text-black dark:text-[#E4E6EB] mb-2">{t("deleteProjectConfirmTitle") || "Hapus Project"}</h3>
              <p className="text-gray-600 dark:text-[#B0B3B8] text-[15px]">
                {t("deleteProjectConfirmText") || "Apakah Anda yakin ingin menghapus project"} <span className="font-semibold text-gray-900 dark:text-white">"{projectToDelete?.title}"</span>?
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                disabled={isDeletingProjectLoading}
                onClick={() => setIsDeleteProjectModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-[15px] bg-gray-100 dark:bg-[#3A3B3C] text-gray-700 dark:text-[#E4E6EB] hover:bg-gray-200 dark:hover:bg-[#4E4F50] transition-colors disabled:opacity-50"
              >
                {t("cancel") || "Batal"}
              </button>
              <button
                disabled={isDeletingProjectLoading}
                onClick={handleDeleteProject}
                className="px-5 py-2.5 rounded-xl font-bold text-[15px] bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingProjectLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {t("deleteProject") || "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
