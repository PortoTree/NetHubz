"use server";

import { revalidateTag, revalidatePath } from "next/cache";

import prisma from "@/utils/prisma";
import { getPostRevalidationPaths } from "@/utils/postCache";

// KASTA 2: Aggressive Revalidation based on Cache_system.md
async function invalidatePostCache(authorId: string, postId?: string) {
  try {
    const owner = await prisma.user.findUnique({
      where: { id: authorId },
      select: { username: true }
    });

    const paths = getPostRevalidationPaths({
      postId,
      username: owner?.username,
      userId: authorId,
    });

    for (const p of paths) {
      try {
        revalidatePath(p, "page");
      } catch {}
    }
  } catch (err) {
    console.error("Error computing post revalidation paths:", err);
  }

  try {
    revalidateTag("feed_posts", "page");
    revalidateTag("global_posts", "page");
    revalidateTag(`profile_posts_${authorId}`, "page");
    if (postId) {
      revalidateTag(`post_${postId}`, "page");
    }
  } catch {}
}

// Public giveaway fields — rewardLink is intentionally excluded (secret)
const GIVEAWAY_PUBLIC_SELECT = {
  id: true,
  title: true,
  rewardType: true,
  notes: true,
  endsAt: true,
  mode: true,
  winnerCount: true,
  maxParticipants: true,
  minAccountAgeDays: true,
  status: true,
  requirements: { orderBy: { order: "asc" as const } },
  _count: { select: { entries: { where: { status: { not: "PENDING" as const } } } } },
};

export interface GiveawayInput {
  title?: string;
  rewardType: "GDRIVE_LINK" | "OTHER_LINK";
  rewardLink: string;
  notes?: string;
  endsAt: string; // ISO
  mode: "ALL_ELIGIBLE" | "RANDOM_DRAW";
  winnerCount?: number | null;
  maxParticipants?: number | null;
  minAccountAgeDays?: number;
  requirements: { type: "FOLLOW_USER" | "JOIN_GROUP" | "EXTERNAL_SOCIAL"; targetId?: string | null; url?: string | null; platform?: string | null }[];
}

function validateGiveaway(g: GiveawayInput): string | null {
  if (g.title && g.title.length > 9) return "Title max 9 characters";
  if (!/^https?:\/\/\S+$/i.test(g.rewardLink?.trim() || "")) return "Invalid reward link";
  const end = new Date(g.endsAt);
  if (isNaN(end.getTime()) || end.getTime() <= Date.now() + 5 * 60 * 1000) return "End time must be at least 5 minutes from now";
  if (g.mode === "RANDOM_DRAW" && (!g.winnerCount || g.winnerCount < 1)) return "Winner count is required";
  if (g.maxParticipants != null && g.maxParticipants < 1) return "Invalid participant limit";
  if (!g.title && !g.notes) return "Title or description required";
  for (const r of g.requirements) {
    if (r.type === "EXTERNAL_SOCIAL" && !/^https?:\/\/\S+$/i.test(r.url?.trim() || "")) return "Invalid social media link";
    if (r.type === "FOLLOW_USER" && !r.targetId) return "Invalid follow target";
    if (r.type === "JOIN_GROUP") return "Group requirement is not available yet";
  }
  return null;
}

import { unstable_cache } from "next/cache";

const getCachedUserAvatar = async (userId: string) => {
  return unstable_cache(
    async () => prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, profile: { select: { avatarUrl: true, displayName: true } } },
    }),
    [`giveaway-target-${userId}`],
    { tags: [`profile-${userId}`], revalidate: 86400 }
  )();
};

// Helper to map DB post to frontend expected post structure
export async function mapPost(post: any) {
  if (!post) return post;
  const mapped = { ...post };
  if (post.postMedia) {
    mapped.mediaUrls = post.postMedia
      .sort((a: any, b: any) => a.order - b.order)
      .map((pm: any) => pm.media.originalUrl);
    delete mapped.postMedia;
  } else {
    mapped.mediaUrls = [];
  }
  if (post.taggedUsers) {
    mapped.taggedUsers = post.taggedUsers;
  }

  if (mapped.giveaway?.requirements) {
    const followTargets = mapped.giveaway.requirements
      .filter((r: any) => r.type === "FOLLOW_USER" && r.targetId)
      .map((r: any) => r.targetId);

    if (followTargets.length > 0) {
      const targets = await Promise.all(followTargets.map((id: string) => getCachedUserAvatar(id)));
      mapped.giveaway.followTargets = targets.filter(Boolean);
    } else {
      mapped.giveaway.followTargets = [];
    }
  }
  if (post.likes) {
    mapped.hasLiked = post.likes.length > 0;
    mapped.myReaction = post.likes.length > 0 ? post.likes[0].type : null;
    delete mapped.likes;
  }
  if (post.savedBy) {
    mapped.hasSaved = post.savedBy.length > 0;
    delete mapped.savedBy;
  }

  // Fetch top 3 reactions for summary
  if (post.topReactions) { mapped.topReactions = post.topReactions; } else if (post.id) {
    try {
      const reactionGroups = await prisma.like.groupBy({
        by: ['type'],
        where: { postId: post.id },
        _count: true,
        orderBy: { _count: { type: 'desc' } },
        take: 3
      });
      mapped.topReactions = reactionGroups.map((g: any) => g.type);
    } catch (e) {
      mapped.topReactions = [];
    }
  }

  return mapped;
}

export async function createPost(data: {
  authorId: string;
  content: string;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE" | "COMMUNITY_ONLY";
  label?: "DEFAULT" | "MENCARI" | "LOKASI" | "PROFESI" | "SEKOLAH";
  mediaUrls?: string[];
  mediaLayout?: "GRID" | "CAROUSEL";
  linkMetadata?: any;
  taggedUserIds?: string[];
  galleryId?: string;
  projectId?: string;
  giveaway?: GiveawayInput | null;
}) {
  try {
    if (data.giveaway) {
      const err = validateGiveaway(data.giveaway);
      if (err) return { success: false, error: err };
    }

    const extractedTags = data.content.match(/#[\w_]+/g)?.map(t => t.slice(1).toLowerCase()) || [];
    const uniqueTags = [...new Set(extractedTags)];

    if (uniqueTags.length > 0) {
      await Promise.all(uniqueTags.map(tag =>
        prisma.hashtag.upsert({
          where: { name: tag },
          update: { count: { increment: 1 } },
          create: { name: tag, count: 1 }
        })
      ));
    }

    let finalVisibility = data.visibility;
    if (data.galleryId) {
      const gallery = await prisma.gallery.findUnique({
        where: { id: data.galleryId },
        select: { privacy: true }
      });
      if (gallery) {
        finalVisibility = gallery.privacy as any;
      }
    }

    const newPost = await prisma.post.create({
      data: {
        content: data.content,
        authorId: data.authorId,
        visibility: finalVisibility,
        label: data.label || "DEFAULT",
        mediaLayout: data.mediaLayout || "GRID",
        linkMetadata: data.linkMetadata || null,
        galleryId: data.galleryId || null,
        projectId: data.projectId || null,
        postMedia: data.mediaUrls && data.mediaUrls.length > 0 ? {
          create: data.mediaUrls.map((url, idx) => ({
            order: idx,
            media: {
              create: {
                userId: data.authorId,
                type: "IMAGE",
                provider: "cloudinary",
                publicId: url.split('/').pop()?.split('.')[0] || url,
                originalUrl: url,
              }
            }
          }))
        } : undefined,
        taggedUsers: data.taggedUserIds && data.taggedUserIds.length > 0 ? {
          connect: data.taggedUserIds.map(id => ({ id }))
        } : undefined,
        hashtags: uniqueTags.length > 0 ? {
          connect: uniqueTags.map(tag => ({ name: tag }))
        } : undefined,
        giveaway: data.giveaway ? {
          create: {
            title: data.giveaway.title?.trim() || null,
            rewardType: data.giveaway.rewardType,
            rewardLink: data.giveaway.rewardLink.trim(),
            notes: data.giveaway.notes?.trim() || null,
            endsAt: new Date(data.giveaway.endsAt),
            mode: data.giveaway.mode,
            winnerCount: data.giveaway.mode === "RANDOM_DRAW" ? data.giveaway.winnerCount : null,
            maxParticipants: data.giveaway.maxParticipants ?? null,
            minAccountAgeDays: Math.max(0, data.giveaway.minAccountAgeDays || 0),
            requirements: {
              create: data.giveaway.requirements.map((r, idx) => ({
                type: r.type,
                targetId: r.targetId || null,
                url: r.url?.trim() || null,
                platform: r.platform || null,
                order: idx,
              })),
            },
          },
        } : undefined,
      },
      include: {
        giveaway: { select: GIVEAWAY_PUBLIC_SELECT },
        postMedia: {
          include: { media: true }
        },
        taggedUsers: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                coverUrl: true
              }
            }
          }
        }
      }
    });

    if (data.taggedUserIds && data.taggedUserIds.length > 0) {
      await Promise.all(
        data.taggedUserIds.map((taggedId: string) =>
          prisma.notification.create({
            data: {
              type: "POST_TAG",
              userId: taggedId,
              senderId: data.authorId,
              postId: newPost.id,
            },
          })
        )
      );
    }

    await invalidatePostCache(data.authorId, newPost.id);

    return { success: true, post: await mapPost(newPost) };
  } catch (error: any) {
    console.error("Error creating post:", error);
    return { success: false, error: error.message };
  }
}


export async function getFeedPosts(userId: string, targetProfileId?: string, cursor?: string, limit: number = 15) {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: "ACCEPTED" },
          { friendId: userId, status: "ACCEPTED" }
        ]
      }
    });

    const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);



    const visibilityFilter = {
      OR: [
        { visibility: "PUBLIC" },
        { authorId: userId },
        {
          visibility: "FRIENDS",
          authorId: { in: friendIds }
        }
      ]
    };

    const whereClause = targetProfileId ? {
      AND: [
        {
          OR: [
            { authorId: targetProfileId },
            { taggedUsers: { some: { id: targetProfileId } } }
          ]
        },
        visibilityFilter
      ]
    } : visibilityFilter;

    const posts = await prisma.post.findMany({
      where: whereClause as any,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      include: {
        author: {
          include: { profile: true }
        },
        taggedUsers: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                coverUrl: true
              }
            }
          }
        },
        gallery: {
          select: { id: true, name: true }
        },
        giveaway: { select: GIVEAWAY_PUBLIC_SELECT },
        _count: {
          select: { likes: true, comments: true }
        },
        project: { select: { id: true, title: true, status: true, mediaUrls: true, coverUrls: true, isForSale: true, category: true, customCategory: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem?.id;
    }

    const fetchedPostIds = posts.map(p => p.id);
    const fetchedProjectIds = posts.map(p => p.projectId).filter(Boolean) as string[];

    const [allMedia, allLikes, allSaves, fetchedReactionGroups, projectLikes, projectSaves, projectCounts] = await Promise.all([
      fetchedPostIds.length ? prisma.postMedia.findMany({ where: { postId: { in: fetchedPostIds } }, include: { media: true }, orderBy: { order: 'asc' } }) : Promise.resolve([]),
      fetchedPostIds.length ? prisma.like.findMany({ where: { postId: { in: fetchedPostIds }, userId } }) : Promise.resolve([]),
      fetchedPostIds.length ? prisma.savedPost.findMany({ where: { postId: { in: fetchedPostIds }, userId } }) : Promise.resolve([]),
      fetchedPostIds.length ? prisma.like.groupBy({ by: ['postId', 'type'], where: { postId: { in: fetchedPostIds } }, _count: true }) : Promise.resolve([]),
      fetchedProjectIds.length ? prisma.like.findMany({ where: { projectId: { in: fetchedProjectIds }, userId } }) : Promise.resolve([]),
      fetchedProjectIds.length ? prisma.savedProject.findMany({ where: { projectId: { in: fetchedProjectIds }, userId } }) : Promise.resolve([]),
      fetchedProjectIds.length ? prisma.project.findMany({ where: { id: { in: fetchedProjectIds } }, select: { id: true, _count: { select: { likes: true, comments: true } } } }) : Promise.resolve([])
    ]);

    for (const post of posts as any[]) {
      post.postMedia = allMedia.filter((m: any) => m.postId === post.id);
      post.likes = allLikes.filter((l: any) => l.postId === post.id);
      post.savedBy = allSaves.filter((s: any) => s.postId === post.id);
      post.topReactions = fetchedReactionGroups.filter((g: any) => g.postId === post.id).sort((a: any, b: any) => b._count - a._count).map((g: any) => g.type);
      
      if (post.project) {
        post.project.likes = projectLikes.filter((l: any) => l.projectId === post.project.id);
        post.project.savedBy = projectSaves.filter((s: any) => s.projectId === post.project.id);
        post.project._count = projectCounts.find((c: any) => c.id === post.project.id)?._count || { likes: 0, comments: 0 };
      }
    }

    const fetchedMappedPosts = await Promise.all(posts.map((post: any) => mapPost(post)));
    return { success: true, posts: fetchedMappedPosts, nextCursor };
  } catch (error: any) {
    console.error("Error fetching feed:", error);
    return { success: false, error: error.message };
  }
}


export async function deletePost(postId: string, authorId: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { hashtags: true, postMedia: { include: { media: true } } }
    });
    if (!post || post.authorId !== authorId) {
      return { success: false, error: "Unauthorized or not found" };
    }

    const tagsToRemove = post.hashtags.map(h => h.name);
    if (tagsToRemove.length > 0) {
      await prisma.hashtag.updateMany({
        where: { name: { in: tagsToRemove } },
        data: { count: { decrement: 1 } }
      });
    }

    await prisma.post.delete({ where: { id: postId } });

    // Check orphaned media and delete from Cloudinary
    if (post.postMedia && post.postMedia.length > 0) {
      const { deleteFromCloudinary } = await import('@/lib/cloudinary');
      for (const pm of post.postMedia) {
        if (pm.media && pm.media.publicId) {
          const stillUsed = await prisma.postMedia.findFirst({ where: { mediaId: pm.media.id } });
          if (!stillUsed) {
            try {
              await deleteFromCloudinary(pm.media.publicId, pm.media.type === 'VIDEO' ? 'video' : 'image');
              await prisma.media.delete({ where: { id: pm.media.id } });
            } catch (e) {
              console.error("Failed to delete media from Cloudinary/DB:", e);
            }
          }
        }
      }
    }

    await invalidatePostCache(authorId, postId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePost(postId: string, authorId: string, content: string, visibility: "PUBLIC" | "FRIENDS" | "PRIVATE" | "COMMUNITY_ONLY", label?: "DEFAULT" | "MENCARI" | "LOKASI" | "PROFESI" | "SEKOLAH", mediaLayout?: "GRID" | "CAROUSEL", taggedUserIds?: string[]) {
  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, include: { hashtags: true } });
    if (!post || post.authorId !== authorId) {
      return { success: false, error: "Unauthorized or not found" };
    }

    const extractedTags = content.match(/#[\w_]+/g)?.map(t => t.slice(1).toLowerCase()) || [];
    const newUniqueTags = [...new Set(extractedTags)];
    const oldTags = post.hashtags.map(h => h.name);

    const tagsToAdd = newUniqueTags.filter(t => !oldTags.includes(t));
    const tagsToRemove = oldTags.filter(t => !newUniqueTags.includes(t));

    if (tagsToRemove.length > 0) {
      await prisma.hashtag.updateMany({
        where: { name: { in: tagsToRemove } },
        data: { count: { decrement: 1 } }
      });
    }

    if (tagsToAdd.length > 0) {
      await Promise.all(tagsToAdd.map(tag =>
        prisma.hashtag.upsert({
          where: { name: tag },
          update: { count: { increment: 1 } },
          create: { name: tag, count: 1 }
        })
      ));
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        visibility,
        label,
        mediaLayout: mediaLayout || undefined,
        taggedUsers: taggedUserIds ? {
          set: taggedUserIds.map(id => ({ id }))
        } : undefined,
        hashtags: {
          disconnect: tagsToRemove.map(tag => ({ name: tag })),
          connect: tagsToAdd.map(tag => ({ name: tag }))
        }
      },
      include: {
        postMedia: { include: { media: true } }
      }
    });

    await invalidatePostCache(authorId, postId);

    return { success: true, post: await mapPost(updatedPost) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export const getExplorePosts = async (tag?: string) => {
  return unstable_cache(
    async () => {
    try {
    console.log(`🔥 DB FETCH (CACHE MISS): getExplorePosts ${tag}`);
      const whereClause: any = {
        visibility: "PUBLIC",
      };
      if (tag) {
        whereClause.hashtags = {
          some: { name: tag }
        };
      } else {
        whereClause.label = "MENCARI";
      }

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: { include: { profile: true } },
          postMedia: { include: { media: true }, orderBy: { order: 'asc' } },
          taggedUsers: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, coverUrl: true } } } },
          gallery: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
          project: true
        },
        orderBy: { createdAt: "desc" },
        take: 50
      });
      return { success: true, posts: await Promise.all(posts.map(mapPost)) };
    } catch (error: any) {
      console.error("Error fetching explore posts:", error);
      return { success: false, error: error.message };
    }
  },
    ['getExplorePosts', String(tag || "all")],
    { tags: ["global_posts"] }
  )();
};

export const getPostById = async (postId: string) => {
  return unstable_cache(
    async () => {
    try {
    console.log(`🔥 DB FETCH (CACHE MISS): getPostById ${postId}`);
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: { include: { profile: true } },
          postMedia: { include: { media: true }, orderBy: { order: 'asc' } },
          taggedUsers: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, coverUrl: true } } } },
          gallery: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
          project: true
        }
      });
      if (!post) return { success: false, error: "Post not found" };
      return { success: true, post: await mapPost(post) };
    } catch (error: any) {
      console.error("Error fetching post by ID:", error);
      return { success: false, error: error.message };
    }
  },
    ['getPostById', String(postId)],
    { tags: ["global_posts"] }
  )();
};
