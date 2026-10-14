"use server";

import prisma from "@/utils/prisma";
import jwt from "jsonwebtoken";
import { revalidateTag } from "next/cache";

const verifyToken = (token: string, expectedUserId: string) => {
  if (!token) return false;
  try {
    const secret = process.env.JWT_SECRET || "mencari-online-secret-key-dev";
    const decoded = jwt.verify(token, secret) as any;
    return decoded.sub === expectedUserId;
  } catch (error) {
    return false;
  }
};

/**
 * Mengambil daftar seluruh teman yang sudah ACCEPTED
 */
export async function getFriends(userId: string) {
  try {
    if (!userId) return { success: false, data: [] };

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ userId }, { friendId: userId }],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                profession: true,
                locationName: true,
              },
            },
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                profession: true,
                locationName: true,
              },
            },
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
    });

    const data = friendships.map((f) => {
      const other = f.userId === userId ? f.friend : f.user;
      return {
        id: other.id,
        username: other.username,
        displayName: other.profile?.displayName || other.username,
        avatarUrl: other.profile?.avatarUrl || null,
        profession: other.profile?.profession || null,
        locationName: other.profile?.locationName || null,
        since: f.acceptedAt || f.createdAt,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error getFriends:", error);
    return { success: false, error: "Database error", data: [] };
  }
}

/**
 * Mengambil daftar permintaan pertemanan masuk (PENDING)
 */
export async function getFriendRequests(userId: string) {
  try {
    if (!userId) return { success: false, data: [] };

    const requests = await prisma.friendship.findMany({
      where: {
        status: "PENDING",
        requestedBy: { not: userId },
        OR: [{ userId }, { friendId: userId }],
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                profession: true,
                locationName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = requests.map((r) => ({
      id: r.id,
      userId: r.requester.id,
      username: r.requester.username,
      displayName: r.requester.profile?.displayName || r.requester.username,
      avatarUrl: r.requester.profile?.avatarUrl || null,
      profession: r.requester.profile?.profession || null,
      locationName: r.requester.profile?.locationName || null,
      createdAt: r.createdAt,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Error getFriendRequests:", error);
    return { success: false, error: "Database error", data: [] };
  }
}

/**
 * Mengambil daftar saran teman:
 * Kombinasi: User dengan kesamaan profile (lokasi/sekolah/profesi) + Fallback user lainnya
 */
export async function getFriendSuggestions(userId: string, limit = 10) {
  try {
    if (!userId) return { success: false, data: [] };

    // 1. Ambil data profil user saat ini
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            locationName: true,
            profession: true,
            education: true,
          },
        },
      },
    });

    // 2. Kumpulkan semua ID yang dikecualikan (teman, request pending, diri sendiri, blokir)
    const existingFriendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      select: {
        userId: true,
        friendId: true,
      },
    });

    const excludedIds = new Set<string>([userId]);
    existingFriendships.forEach((f) => {
      excludedIds.add(f.userId);
      excludedIds.add(f.friendId);
    });

    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ userId }, { blockedUserId: userId }],
      },
      select: {
        userId: true,
        blockedUserId: true,
      },
    });
    blocks.forEach((b) => {
      excludedIds.add(b.userId);
      excludedIds.add(b.blockedUserId);
    });

    const excludedArray = Array.from(excludedIds);

    const userLoc = currentUser?.profile?.locationName;
    const userProf = currentUser?.profile?.profession;
    const userEdu = currentUser?.profile?.education;

    let prioritizedUsers: any[] = [];

    // 3. Prioritas 1: Cari user dengan kesamaan data
    if (userLoc || userProf || userEdu) {
      const matchConditions: any[] = [];
      if (userLoc) matchConditions.push({ profile: { locationName: userLoc } });
      if (userProf) matchConditions.push({ profile: { profession: userProf } });
      if (userEdu) matchConditions.push({ profile: { education: userEdu } });

      prioritizedUsers = await prisma.user.findMany({
        where: {
          id: { notIn: excludedArray },
          OR: matchConditions,
        },
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              profession: true,
              locationName: true,
            },
          },
        },
        take: limit,
      });
    }

    const collectedIds = new Set<string>(prioritizedUsers.map((u) => u.id));
    const allExcluded = [...excludedArray, ...Array.from(collectedIds)];

    // 4. Prioritas 2 (Fallback): User aktif/terbaru lainnya
    const remainingCount = limit - prioritizedUsers.length;
    let fallbackUsers: any[] = [];
    if (remainingCount > 0) {
      fallbackUsers = await prisma.user.findMany({
        where: {
          id: { notIn: allExcluded },
        },
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              profession: true,
              locationName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: remainingCount,
      });
    }

    const merged = [...prioritizedUsers, ...fallbackUsers].map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profile?.displayName || u.username,
      avatarUrl: u.profile?.avatarUrl || null,
      profession: u.profile?.profession || null,
      locationName: u.profile?.locationName || null,
    }));

    return { success: true, data: merged };
  } catch (error) {
    console.error("Error getFriendSuggestions:", error);
    return { success: false, error: "Database error", data: [] };
  }
}

/**
 * Pencarian User dengan Status Relasi
 */
export async function searchUsers(query: string, currentUserId: string) {
  try {
    const clean = query.trim().replace(/^@/, "");
    if (!clean || clean.length < 1) return { success: true, data: [] };

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: clean, mode: "insensitive" } },
          { profile: { displayName: { contains: clean, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            profession: true,
            locationName: true,
          },
        },
      },
      take: 15,
    });

    if (users.length === 0) return { success: true, data: [] };

    const userIds = users.map((u) => u.id);

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: currentUserId, friendId: { in: userIds } },
          { friendId: currentUserId, userId: { in: userIds } },
        ],
      },
    });

    const relMap = new Map<string, { status: string; requestedBy: string }>();
    friendships.forEach((f) => {
      const otherId = f.userId === currentUserId ? f.friendId : f.userId;
      relMap.set(otherId, { status: f.status, requestedBy: f.requestedBy });
    });

    const data = users.map((u) => {
      const rel = relMap.get(u.id);
      let relationship: "ACCEPTED" | "PENDING_INCOMING" | "PENDING_OUTGOING" | "NONE" = "NONE";

      if (rel) {
        if (rel.status === "ACCEPTED") {
          relationship = "ACCEPTED";
        } else if (rel.status === "PENDING") {
          relationship = rel.requestedBy === currentUserId ? "PENDING_OUTGOING" : "PENDING_INCOMING";
        }
      }

      return {
        id: u.id,
        username: u.username,
        displayName: u.profile?.displayName || u.username,
        avatarUrl: u.profile?.avatarUrl || null,
        profession: u.profile?.profession || null,
        locationName: u.profile?.locationName || null,
        relationship,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error searchUsers:", error);
    return { success: false, error: "Database error", data: [] };
  }
}

/**
 * Konfirmasi / Menerima Permintaan Teman
 */
export async function acceptFriendRequest(token: string, currentUserId: string, requesterId: string) {
  if (!verifyToken(token, currentUserId)) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.friendship.findFirst({
      where: {
        status: "PENDING",
        requestedBy: requesterId,
        OR: [
          { userId: currentUserId, friendId: requesterId },
          { userId: requesterId, friendId: currentUserId },
        ],
      },
    });

    if (!existing) {
      return { success: false, error: "Friend request not found" };
    }

    await prisma.friendship.update({
      where: { id: existing.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    revalidateTag(`profile-${currentUserId}`, "page");
    revalidateTag(`profile-${requesterId}`, "page");

    return { success: true };
  } catch (error) {
    console.error("Error acceptFriendRequest:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Menolak / Menghapus Permintaan Teman Masuk
 */
export async function rejectFriendRequest(token: string, currentUserId: string, requesterId: string) {
  if (!verifyToken(token, currentUserId)) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: requesterId },
          { userId: requesterId, friendId: currentUserId },
        ],
      },
    });

    if (!existing) {
      return { success: false, error: "Request not found" };
    }

    await prisma.friendship.delete({
      where: { id: existing.id },
    });

    revalidateTag(`profile-${currentUserId}`, "page");
    revalidateTag(`profile-${requesterId}`, "page");

    return { success: true };
  } catch (error) {
    console.error("Error rejectFriendRequest:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Mengirim Permintaan Teman
 */
export async function sendFriendRequest(token: string, currentUserId: string, targetUserId: string) {
  if (!verifyToken(token, currentUserId)) return { success: false, error: "Unauthorized" };
  if (currentUserId === targetUserId) return { success: false, error: "Cannot add yourself" };

  try {
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    });

    if (existing) {
      return { success: false, error: "Relationship already exists", status: existing.status };
    }

    await prisma.friendship.create({
      data: {
        userId: currentUserId,
        friendId: targetUserId,
        requestedBy: currentUserId,
        status: "PENDING",
      },
    });

    revalidateTag(`profile-${currentUserId}`, "page");
    revalidateTag(`profile-${targetUserId}`, "page");

    return { success: true };
  } catch (error) {
    console.error("Error sendFriendRequest:", error);
    return { success: false, error: "Database error" };
  }
}

/**
 * Hapus Pertemanan (Unfriend)
 */
export async function unfriend(token: string, currentUserId: string, friendId: string) {
  if (!verifyToken(token, currentUserId)) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { userId: currentUserId, friendId },
          { userId: friendId, friendId: currentUserId },
        ],
      },
    });

    if (!existing) {
      return { success: false, error: "Friendship not found" };
    }

    await prisma.friendship.delete({
      where: { id: existing.id },
    });

    revalidateTag(`profile-${currentUserId}`, "page");
    revalidateTag(`profile-${friendId}`, "page");

    return { success: true };
  } catch (error) {
    console.error("Error unfriend:", error);
    return { success: false, error: "Database error" };
  }
}
