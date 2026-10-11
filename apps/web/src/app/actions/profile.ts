"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import jwt from "jsonwebtoken";

import prisma from "@/utils/prisma";

const verifyToken = (token: string, expectedUserId: string) => {
  if (!token) return false;
  try {
    const secret = process.env.JWT_SECRET || 'mencari-online-secret-key-dev';
    const decoded = jwt.verify(token, secret) as any;
    // Support various JWT claim formats
    const tokenUserId = decoded.sub || decoded.id || decoded._id || decoded.userId;
    return tokenUserId === expectedUserId;
  } catch (error) {
    return false;
  }
};

import { unstable_cache } from "next/cache";

// Profile data is embedded in the per-user project cache (/project/[username] + profile Project tab).
const invalidateProfile = async (userId: string) => {
  revalidateTag(`profile-${userId}`, "default");
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (owner?.username) {
    revalidateTag(`projects-${owner.username}`, "default");
    // KASTA 1: Aggressive Revalidation based on Cache_system.md
    revalidatePath(`/id/p/${owner.username}/${userId}`, "page");
    revalidatePath(`/en/p/${owner.username}/${userId}`, "page");
    // Also revalidate the legacy path if used
    revalidatePath(`/${owner.username}`, "page");
  }
};

// KASTA 1 (Global Cache): avatar, cover, biodata, privacy settings, social links.
// Invalidated per-user via updateTag(`profile-${userId}`) on every profile mutation.
export const getProfile = async (userId: string) => {
  try {
    return await unstable_cache(
      async () => {
        console.log(`🔥 DB FETCH (CACHE MISS): getProfile ${userId}`);
        const profile = await prisma.profile.findUnique({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                createdAt: true,
                profileSettings: true,
                socialLinks: { orderBy: { displayOrder: "asc" } },
              }
            }
          }
        });
        // Throw (instead of returning a failure object) so errors are never cached
        return { success: true as const, profile };
      },
      ['getProfile', String(userId)],
      { tags: [`profile-${userId}`] }
    )();
  } catch (error: any) {
    console.error("getProfile Error:", error);
    return { success: false as const, profile: null, error: "Failed to fetch profile" };
  }
};

// KASTA 2 (SWR): counts and lists change constantly and are never globally cached.
export const getProfileStats = async (userId: string) => {
  try {
    console.log(`⚡ LIVE FETCH (SWR, NO SERVER CACHE): getProfileStats ${userId}`);
    const stats = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        followers: { include: { follower: { include: { profile: true } } } },
        following: { include: { following: { include: { profile: true } } } },
        friendshipsAsUser: {
          where: { status: 'ACCEPTED' },
          include: { friend: { include: { profile: true } } }
        },
        friendshipsAsFriend: {
          where: { status: 'ACCEPTED' },
          include: { user: { include: { profile: true } } }
        },
        _count: {
          select: {
            followers: true,
            posts: true,
            friendshipsAsUser: { where: { status: 'ACCEPTED' } },
            friendshipsAsFriend: { where: { status: 'ACCEPTED' } }
          }
        }
      }
    });
    return { success: true as const, stats };
  } catch (error: any) {
    console.error("getProfileStats Error:", error);
    return { success: false as const, stats: null };
  }
};

export async function updateDisplayName(token: string, userId: string, newDisplayName: string) {
  if (!verifyToken(token, userId)) return { success: false, error: "Unauthorized" };
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) return { success: false, error: "Profile not found" };

    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Filter out dates older than 15 days
    const recentChanges = profile.displayNameChangeDates.filter((date: Date) => date > fifteenDaysAgo);

    if (recentChanges.length >= 2) {
      return { success: false, error: "Limit reached" };
    }

    // Add current date to the array
    recentChanges.push(now);

    await prisma.profile.update({
      where: { userId },
      data: {
        displayName: newDisplayName,
        displayNameChangeDates: recentChanges,
      },
    });

    await invalidateProfile(userId);

    return { success: true, displayName: newDisplayName, remainingChanges: 2 - recentChanges.length };
  } catch (error) {
    console.error("Error updating display name:", error);
    return { success: false, error: "Database error" };
  }
}

export async function updateProfileMedia(token: string, userId: string, type: "avatar" | "cover", url: string) {
  if (!verifyToken(token, userId)) return { success: false, error: "Unauthorized" };
  try {
    // 1. Ambil data profil saat ini untuk mendapatkan URL foto lama
    const currentProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { avatarUrl: true, coverUrl: true }
    });

    const oldUrl = type === "avatar" ? currentProfile?.avatarUrl : currentProfile?.coverUrl;

    // 2. Simpan URL baru ke database
    const finalUrl = url + (url.includes('?') ? '&' : '?') + `t=${Date.now()}`;
    if (type === "avatar") {
      await prisma.profile.update({
        where: { userId },
        data: { avatarUrl: finalUrl },
      });
    } else if (type === "cover") {
      await prisma.profile.update({
        where: { userId },
        data: { coverUrl: finalUrl },
      });
    }
    
    await invalidateProfile(userId);

    // 3. Hapus foto lama di Cloudinary jika ada dan berbeda dengan yang baru
    if (oldUrl) {
      const oldClean = oldUrl.split('?')[0];
      const newClean = url.split('?')[0];
      if (oldClean !== newClean) {
        try {
          const { deleteFromCloudinary, extractCloudinaryPublicId } = await import('@/lib/cloudinary');
          const oldPublicId = extractCloudinaryPublicId(oldUrl);
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, "image");
          }
        } catch (err) {
          console.error("Gagal menghapus media lama dari Cloudinary:", err);
        }
      }
    }

    return { success: true, url: finalUrl };
  } catch (error) {
    console.error("Error updating profile media:", error);
    return { success: false, error: "Database error" };
  }
}

export async function deleteProfileMedia(token: string, userId: string, type: "avatar" | "cover") {
  if (!verifyToken(token, userId)) return { success: false, error: "Unauthorized" };
  try {
    // 1. Ambil data profil saat ini untuk mendapatkan URL foto yang akan dihapus
    const currentProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { avatarUrl: true, coverUrl: true }
    });

    const oldUrl = type === "avatar" ? currentProfile?.avatarUrl : currentProfile?.coverUrl;

    // 2. Kosongkan URL di database
    if (type === "avatar") {
      await prisma.profile.update({
        where: { userId },
        data: { avatarUrl: null },
      });
    } else if (type === "cover") {
      await prisma.profile.update({
        where: { userId },
        data: { coverUrl: null },
      });
    }

    await invalidateProfile(userId);

    // 3. Hapus media dari Cloudinary jika merupakan aset Cloudinary
    if (oldUrl) {
      try {
        const { deleteFromCloudinary, extractCloudinaryPublicId } = await import('@/lib/cloudinary');
        const oldPublicId = extractCloudinaryPublicId(oldUrl);
        if (oldPublicId) {
          await deleteFromCloudinary(oldPublicId, "image");
        }
      } catch (err) {
        console.error("Gagal menghapus media profil dari Cloudinary:", err);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting profile media:", error);
    return { success: false, error: "Database error" };
  }
}

export async function updateProfileInfo(token: string, userId: string, data: any) {
  if (!verifyToken(token, userId)) return { success: false, error: "Unauthorized" };
  try {
    const { bio, locationName, websiteUrl, externalLinks, socialLinks, education, profession, gender, birthDate, softSkills, hardSkills, softwareSkills, hobbies, music, tvShows, movies, games, sports, type, profileVisibility, privacyGender, privacyBirth, privacyLoc, privacyProf, privacySosmed, privacyFriendList, privacyFollowers, privacyFollowing, privacyActivity, privacyOwnedGroups, privacyJoinedGroups, privacyExternalLink, privacyTag, privacyComment, privacyOnline, privacyDM } = data;
    
    // Validate platform and url for socialLinks
    let formattedSocialLinks: any[] = [];
    if (socialLinks && Array.isArray(socialLinks)) {
      formattedSocialLinks = socialLinks.filter(s => s.platform && s.url).map((s, index) => ({
        platform: s.platform,
        url: s.url,
        displayOrder: index
      }));
    }

    await prisma.profile.update({
      where: { userId },
      data: {
        bio,
        locationName,
        websiteUrl,
        externalLinks: externalLinks !== undefined ? externalLinks : undefined,
        education,
        profession,
        gender,
        birthDate: birthDate ? new Date(birthDate) : null,
        type: type !== undefined ? type : undefined,
        softSkills: softSkills !== undefined ? softSkills : undefined,
        hardSkills: hardSkills !== undefined ? hardSkills : undefined,
        softwareSkills: softwareSkills !== undefined ? softwareSkills : undefined,
        hobbies: hobbies !== undefined ? hobbies : undefined,
        music: music !== undefined ? music : undefined,
        tvShows: tvShows !== undefined ? tvShows : undefined,
        movies: movies !== undefined ? movies : undefined,
        games: games !== undefined ? games : undefined,
        sports: sports !== undefined ? sports : undefined,
        ...(formattedSocialLinks.length >= 0 ? {
          user: {
            update: {
              socialLinks: {
                deleteMany: {},
                create: formattedSocialLinks
              }
            }
          }
        } : {}),
      },
    });

      await prisma.profileSettings.upsert({
        where: { userId },
        create: { 
          userId, 
          profileVisibility,
          privacyGender, privacyBirth, privacyLoc, privacyProf, privacySosmed, privacyFriendList, privacyFollowers, privacyFollowing, privacyActivity, privacyOwnedGroups, privacyJoinedGroups, privacyExternalLink, privacyTag, privacyComment, privacyOnline, privacyDM
        },
        update: { 
          profileVisibility,
          privacyGender, privacyBirth, privacyLoc, privacyProf, privacySosmed, privacyFriendList, privacyFollowers, privacyFollowing, privacyActivity, privacyOwnedGroups, privacyJoinedGroups, privacyExternalLink, privacyTag, privacyComment, privacyOnline, privacyDM
        }
      });

    await invalidateProfile(userId);
    return { success: true };
  } catch (error) {
    console.error("Error updating profile info:", error);
    return { success: false, error: "Database error" };
  }
}

export async function searchUsersForMention(query: string) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { profile: { displayName: { contains: query, mode: "insensitive" } } }
      ]
    },
    take: 5,
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true } }
    }
  });
  return users.map(u => ({
    id: `${u.username}/${u.id}`,
    display: u.username,
    avatarUrl: u.profile?.avatarUrl,
    displayName: u.profile?.displayName || u.username
  }));
}
