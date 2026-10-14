"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import HomeNavSidebar from "@/components/HomeNavSidebar";
import FriendPageDesktop from "./FriendPageDesktop";
import FriendPageMobile from "./FriendPageMobile";
import { getFriends, getFriendRequests, getFriendSuggestions } from "@/app/actions/friends";
import { supabase } from "@/utils/supabaseClient";
import { friendsDataCache } from "@/utils/cache";

export default function FriendPageClient() {
  const params = useParams();
  const locale = (params?.locale as string) || "id";
  const { currentUser } = useUser();

  const [token, setToken] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read auth token from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token") || "";
      setToken(storedToken);
    }
  }, []);

  const currentUserId = currentUser?.id;

  const loadData = useCallback(async (silent = false) => {
    if (!currentUserId) return;
    if (!silent && !friendsDataCache.has(currentUserId)) {
      setIsLoading(true);
    }
    try {
      const [friendsRes, requestsRes, suggestionsRes] = await Promise.all([
        getFriends(currentUserId),
        getFriendRequests(currentUserId),
        getFriendSuggestions(currentUserId, 8),
      ]);

      const freshFriends = friendsRes.success && friendsRes.data ? friendsRes.data : [];
      const freshRequests = requestsRes.success && requestsRes.data ? requestsRes.data : [];
      const freshSuggestions = suggestionsRes.success && suggestionsRes.data ? suggestionsRes.data : [];

      setFriends(freshFriends);
      setRequests(freshRequests);
      setSuggestions(freshSuggestions);

      // Save to SWR Cache
      friendsDataCache.set(currentUserId, {
        friends: freshFriends,
        requests: freshRequests,
        suggestions: freshSuggestions,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to load friend data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Initial SWR Cache Mount: Render instan 0 ms jika cache ada
  useEffect(() => {
    if (!currentUserId) return;

    const cached = friendsDataCache.get(currentUserId);
    if (cached) {
      setFriends(cached.friends);
      setRequests(cached.requests);
      setSuggestions(cached.suggestions);
      setIsLoading(false);
      // Revalidate diam-diam di background (SWR pattern)
      loadData(true);
    } else {
      loadData(false);
    }
  }, [currentUserId, loadData]);

  // Supabase Realtime Subscription on Friendship table
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`realtime_friends_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Friendship",
        },
        () => {
          loadData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadData]);

  // Listen to Global Connection Changed event
  useEffect(() => {
    const handleConnectionChanged = () => {
      loadData(true);
    };
    window.addEventListener("connection-changed", handleConnectionChanged);
    return () => {
      window.removeEventListener("connection-changed", handleConnectionChanged);
    };
  }, [loadData]);

  if (isLoading && !currentUser?.id) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] text-gray-900 dark:text-[#E4E6EB]">
      {/* Global Desktop Navigation Sidebar */}
      <HomeNavSidebar activeTab="friend" setActiveTab={() => {}} />

      {/* Versi Desktop (>= 768px) */}
      <div className="hidden md:block pt-[56px]">
        <FriendPageDesktop
          currentUserId={currentUserId}
          token={token}
          locale={locale}
          friends={friends}
          requests={requests}
          suggestions={suggestions}
          isLoading={isLoading}
          onRefresh={loadData}
        />
      </div>

      {/* Versi Mobile (< 768px) */}
      <div className="block md:hidden pt-[56px]">
        <FriendPageMobile
          currentUserId={currentUserId}
          token={token}
          locale={locale}
          friends={friends}
          requests={requests}
          suggestions={suggestions}
          isLoading={isLoading}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
}
