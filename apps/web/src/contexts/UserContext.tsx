"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { profileCache } from "@/utils/cache";

interface UserContextType {
  currentUser: any;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
  isProfileLoading: boolean;
  globalUserId: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>({
    username: "User",
    displayName: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [globalUserId, setGlobalUserId] = useState<string>("");

  useEffect(() => {
    const fetchProfile = (userId: string) => {
      import("@/app/actions/profile").then(({ getProfile }) => {
        getProfile(userId).then(res => {
          if (res.success && res.profile) {
            setCurrentUser((prev: any) => ({ ...prev, profile: res.profile }));
            profileCache.set(userId, res.profile);
            localStorage.setItem("cached_user_profile_" + userId, JSON.stringify(res.profile));
          }
          setIsProfileLoading(false);
        });
      });
    };

    let currentUserId = "";
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.username || payload.name) {
          currentUserId = payload.sub || payload.id || payload._id || payload.userId || "1";
          setGlobalUserId(currentUserId);
          
          let cachedProfile = profileCache.get(currentUserId);
          if (!cachedProfile) {
            const saved = localStorage.getItem("cached_user_profile_" + currentUserId);
            if (saved) {
              try { cachedProfile = JSON.parse(saved); profileCache.set(currentUserId, cachedProfile); } catch(e){}
            }
          }
          if (cachedProfile) {
            setCurrentUser({
              id: currentUserId,
              username: payload.username || payload.name || "User",
              displayName: payload.displayName || payload.username || payload.name || "User",
              profile: cachedProfile
            });
            setIsProfileLoading(false); // Data from cache, no loading state
          } else {
            setCurrentUser({
              id: currentUserId,
              username: payload.username || payload.name || "User",
              displayName: payload.displayName || payload.username || payload.name || "User",
            });
          }
          
          // Always fetch in background to ensure we never stay on stale/broken cached image
          fetchProfile(currentUserId);
        }
      } catch (e) {
        console.error("Failed to parse token");
      }
    } else {
      setIsProfileLoading(false);
    }

    const handleProfileUpdated = (e: any) => {
      if (currentUserId) {
        if (e.detail && e.detail.type && (e.detail.url !== undefined)) {
          // Optimistically update the avatar/cover in the state
          setCurrentUser((prev: any) => {
            const currentProf = prev?.profile || {};
            const newProfile = { ...currentProf };
            if (e.detail.type === 'avatar') newProfile.avatarUrl = e.detail.url;
            if (e.detail.type === 'cover') newProfile.coverUrl = e.detail.url;
            
            // Update cache and localStorage
            profileCache.set(currentUserId, newProfile);
            try {
              localStorage.setItem("cached_user_profile_" + currentUserId, JSON.stringify(newProfile));
            } catch (err) {}
            return { ...prev, profile: newProfile };
          });
        } else {
          profileCache.delete(currentUserId);
          try {
            localStorage.removeItem("cached_user_profile_" + currentUserId);
          } catch (err) {}
          // Re-fetch explicitly since it was a data change (e.g., name/bio)
          fetchProfile(currentUserId);
        }
      }
    };
    
    window.addEventListener("profile_updated", handleProfileUpdated);
    window.addEventListener("avatar-updated", handleProfileUpdated);
    window.addEventListener("profile-media-updated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdated);
      window.removeEventListener("avatar-updated", handleProfileUpdated);
      window.removeEventListener("profile-media-updated", handleProfileUpdated);
    };
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isProfileLoading, globalUserId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
