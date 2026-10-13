"use server";
import { updateTag } from "next/cache";

import prisma from "@/utils/prisma";

export async function toggleLike(userId: string, targetType: "post" | "comment" | "project", targetId: string, reactionType: string = "LIKE") {
  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        postId: targetType === "post" ? targetId : null,
        commentId: targetType === "comment" ? targetId : null,
        projectId: targetType === "project" ? targetId : null,
      },
    });

    const revalidateInteraction = async () => {
      try {
        if (targetType === "project") {
          updateTag(`project_${targetId}`);
          updateTag("global_projects");
          const project = await prisma.project.findUnique({
            where: { id: targetId },
            select: { user: { select: { username: true } } }
          });
          if (project?.user?.username) {
            updateTag(`projects-${project.user.username}`);
          }
        } else if (targetType === "post") {
          updateTag(`post_${targetId}`);
          updateTag("feed_posts");
        }
      } catch (err) {
        console.error("Revalidation error:", err);
      }
    };

    if (existingLike) {
      if (existingLike.type === reactionType) {
        // Same reaction, remove it
        await prisma.like.delete({
          where: { id: existingLike.id },
        });
        await revalidateInteraction();
        return { success: true, action: "unliked" };
      } else {
        // Different reaction, update it
        await prisma.like.update({
          where: { id: existingLike.id },
          data: { type: reactionType },
        });
        await revalidateInteraction();
        return { success: true, action: "updated" };
      }
    } else {
      await prisma.like.create({
        data: {
          userId,
          postId: targetType === "post" ? targetId : undefined,
          commentId: targetType === "comment" ? targetId : undefined,
          projectId: targetType === "project" ? targetId : undefined,
          type: reactionType,
        },
      });

      // TODO: Create Notification
      let targetOwnerId: string | undefined;
      let notifPostId: string | undefined;
      let notifProjectId: string | undefined;
      
      if (targetType === "post") {
        const post = await prisma.post.findUnique({ where: { id: targetId } });
        if (post) {
          targetOwnerId = post.authorId;
          notifPostId = targetId;
        }
      } else if (targetType === "project") {
        const project = await prisma.project.findUnique({ where: { id: targetId } });
        if (project) {
          targetOwnerId = project.userId;
          notifProjectId = targetId;
        }
      } else if (targetType === "comment") {
        const comment = await prisma.comment.findUnique({ where: { id: targetId } });
        if (comment) {
          targetOwnerId = comment.authorId;
          notifPostId = comment.postId || undefined;
          notifProjectId = comment.projectId || undefined;
        }
      }
      
      if (targetOwnerId && targetOwnerId !== userId) {
        await prisma.notification.create({
          data: {
            type: targetType === "post" ? "POST_LIKE" : targetType === "project" ? "PROJECT_LIKE" : "COMMENT_LIKE" as any,
            userId: targetOwnerId,
            senderId: userId,
            postId: notifPostId,
            projectId: notifProjectId,
            commentId: targetType === "comment" ? targetId : undefined,
            reactionType: reactionType,
          },
        });
      }

      await revalidateInteraction();
      return { success: true, action: "liked" };
    }
  } catch (error: any) {
    console.error("Toggle Like Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleSave(userId: string, targetType: "post" | "project", targetId: string) {
  try {
    if (targetType === "post") {
      const existingSave = await prisma.savedPost.findUnique({
        where: { userId_postId: { userId, postId: targetId } },
      });

      if (existingSave) {
        await prisma.savedPost.delete({
          where: { id: existingSave.id },
        });
        return { success: true, action: "unsaved" };
      } else {
        await prisma.savedPost.create({
          data: { userId, postId: targetId },
        });
        return { success: true, action: "saved" };
      }
    } else {
      const existingSave = await prisma.savedProject.findUnique({
        where: { userId_projectId: { userId, projectId: targetId } },
      });

      if (existingSave) {
        await prisma.savedProject.delete({
          where: { id: existingSave.id },
        });
        return { success: true, action: "unsaved" };
      } else {
        await prisma.savedProject.create({
          data: { userId, projectId: targetId },
        });
        return { success: true, action: "saved" };
      }
    }
  } catch (error: any) {
    console.error("Toggle Save Error:", error);
    return { success: false, error: error.message };
  }
}

export async function incrementShareCount(targetType: "post" | "project", targetId: string) {
  try {
    if (targetType === "post") {
      await prisma.post.update({
        where: { id: targetId },
        data: { shareCount: { increment: 1 } },
      });
    } else {
      await prisma.project.update({
        where: { id: targetId },
        data: { shareCount: { increment: 1 } },
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error("Increment Share Error:", error);
    return { success: false, error: error.message };
  }
}

export async function addComment(userId: string, targetType: "post" | "project", targetId: string, content: string, parentId?: string) {
  try {
    const comment = await prisma.comment.create({
      data: {
        authorId: userId,
        content,
        postId: targetType === "post" ? targetId : undefined,
        projectId: targetType === "project" ? targetId : undefined,
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: { replies: true, likes: true }
        }
      }
    });

    // TODO: Create Notification
    let targetOwnerId: string | undefined;
    let repliedAuthorId: string | undefined;
    
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (parentComment && parentComment.authorId !== userId) {
        await prisma.notification.create({
          data: {
            type: "COMMENT_REPLY",
            userId: parentComment.authorId,
            senderId: userId,
            postId: targetType === "post" ? targetId : undefined,
            projectId: targetType === "project" ? targetId : undefined,
            commentId: comment.id,
          }
        });
        repliedAuthorId = parentComment.authorId;
      }
    } else {
      if (targetType === "post") {
        const post = await prisma.post.findUnique({ where: { id: targetId } });
        if (post) targetOwnerId = post.authorId;
      } else if (targetType === "project") {
        const project = await prisma.project.findUnique({ where: { id: targetId } });
        if (project) targetOwnerId = project.userId;
      }
      
      if (targetOwnerId && targetOwnerId !== userId) {
        await prisma.notification.create({
          data: {
            type: targetType === "post" ? "POST_COMMENT" : "PROJECT_COMMENT",
            userId: targetOwnerId,
            senderId: userId,
            postId: targetType === "post" ? targetId : undefined,
            projectId: targetType === "project" ? targetId : undefined,
            commentId: comment.id,
          }
        });
      }
    }

    const mentionRegex = /@\[.*?\]\(([^\)]+)\)/g;
    let match;
    const mentionedUserIds = new Set<string>();
    while ((match = mentionRegex.exec(content)) !== null) {
      const parts = match[1].split('/');
      const id = parts[1] || parts[0];
      if (id !== userId) {
        mentionedUserIds.add(id);
      }
    }

    if (mentionedUserIds.size > 0) {
      try {
        await Promise.all(
          Array.from(mentionedUserIds).map(mentionedId =>
            prisma.notification.create({
              data: {
                type: "COMMENT_MENTION" as any,
                userId: mentionedId,
                senderId: userId,
                postId: targetType === "post" ? targetId : undefined,
                projectId: targetType === "project" ? targetId : undefined,
                commentId: comment.id,
              }
            })
          )
        );
      } catch (e) {
        console.error("Failed to create mention notifications:", e);
      }
    }

    if (targetType === "post") {
      try {
        updateTag(`post_${targetId}`);
        updateTag("global_posts");
      } catch (e) {}
    } else if (targetType === "project") {
      try {
        updateTag(`project_${targetId}`);
        updateTag("global_projects");
      } catch (e) {}
    }

    return { success: true, comment };

  } catch (error: any) {
    console.error("Add Comment Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getComments(targetType: "post" | "project", targetId: string, userId?: string, cursor?: string, limit: number = 10) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: targetType === "post" ? targetId : undefined,
        projectId: targetType === "project" ? targetId : undefined,
        parentId: null, // Only fetch top-level comments first
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: { replies: true, likes: true }
        },
        ...(userId ? { likes: { where: { userId } } } : {})
      }
    });

    let nextCursor: string | undefined = undefined;
    if (comments.length > limit) {
      comments.pop(); // remove extra item
      nextCursor = comments[comments.length - 1].id;
    }

    const mappedComments = []; for (const c of comments) {
      const mapped: any = { ...c };
      if ((c as any).likes) {
        mapped.myReaction = (c as any).likes.length > 0 ? (c as any).likes[0].type : null;
        delete mapped.likes;
      }
      try {
        const reactionGroups = await prisma.like.groupBy({
          by: ['type'],
          where: { commentId: c.id },
          _count: true,
          orderBy: { _count: { type: 'desc' } }
        });
        mapped.topReactions = reactionGroups.map((g: any) => g.type);
      } catch (e) {
        mapped.topReactions = [];
      }
      mappedComments.push(mapped);
    }

    return { success: true, comments: mappedComments, nextCursor };
  } catch (error: any) {
    console.error("Get Comments Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCommentReplies(commentId: string, userId?: string, cursor?: string, limit: number = 10) {
  try {
    const replies = await prisma.comment.findMany({
      where: {
        parentId: commentId,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "asc" }, // Replies are usually oldest first
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: { replies: true, likes: true }
        },
        ...(userId ? { likes: { where: { userId } } } : {}),
      }
    });

    let nextCursor: string | undefined = undefined;
    if (replies.length > limit) {
      replies.pop(); // remove extra item
      nextCursor = replies[replies.length - 1].id;
    }

    const mappedReplies = [];
    for (const r of replies) {
      const mapped: any = { ...r };
      if ((r as any).likes) {
        mapped.myReaction = (r as any).likes.length > 0 ? (r as any).likes[0].type : null;
        delete mapped.likes;
      } else {
        mapped.myReaction = null;
      }
      try {
        const reactionGroups = await prisma.like.groupBy({
          by: ['type'],
          where: { commentId: r.id },
          _count: true,
          orderBy: { _count: { type: 'desc' } }
        });
        mapped.topReactions = reactionGroups.map((g: any) => g.type);
      } catch (e) {
        mapped.topReactions = [];
      }
      mappedReplies.push(mapped);
    }

    return { success: true, replies: mappedReplies, nextCursor };
  } catch (error: any) {
    console.error("Get Comment Replies Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteComment(userId: string, commentId: string) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) return { success: false, error: "Comment not found" };
    if (comment.authorId !== userId) return { success: false, error: "Unauthorized" };

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Delete Comment Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getTargetCommentInfo(commentId: string) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, parentId: true }
    });
    if (!comment) return { success: false, error: "Not found" };
    
    return { 
      success: true, 
      parentId: comment.parentId 
    };
  } catch (error: any) {
    console.error("Get Target Comment Info Error:", error);
    return { success: false, error: error.message };
  }
}


export async function getLikers(targetId: string, targetType: "POST" | "COMMENT" | "PROJECT", limit: number = 10, reactionType?: string) {
  try {
    const where: any = {};
    if (targetType === "POST") where.postId = targetId;
    if (targetType === "COMMENT") where.commentId = targetId;
    if (targetType === "PROJECT") where.projectId = targetId;
    if (reactionType) where.type = reactionType;

    const [likers, totalCount] = await Promise.all([
      prisma.like.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                }
              }
            }
          }
        }
      }),
      prisma.like.count({ where })
    ]);

    return { success: true, likers, totalCount };
  } catch (error: any) {
    console.error("Error fetching likers:", error);
    return { success: false, error: error.message };
  }
}

export async function checkInteractionState(userId: string | undefined, targetType: "post" | "project", targetId: string) {
  try {
    let like = null;
    let save = null;
    
    if (userId) {
      like = await prisma.like.findFirst({
        where: {
          userId,
          postId: targetType === "post" ? targetId : null,
          projectId: targetType === "project" ? targetId : null,
        }
      });
      save = targetType === "post" 
        ? await prisma.savedPost.findUnique({ where: { userId_postId: { userId, postId: targetId } } })
        : await prisma.savedProject.findUnique({ where: { userId_projectId: { userId, projectId: targetId } } });
    }

    let likeCount = 0;
    let commentCount = 0;

    if (targetType === "post") {
      const p = await prisma.post.findUnique({ where: { id: targetId }, select: { _count: { select: { likes: true } } } });
      likeCount = p?._count?.likes || 0;
      commentCount = await prisma.comment.count({ where: { postId: targetId, parentId: null } });
    } else {
      const p = await prisma.project.findUnique({ where: { id: targetId }, select: { _count: { select: { likes: true } } } });
      likeCount = p?._count?.likes || 0;
      commentCount = await prisma.comment.count({ where: { projectId: targetId, parentId: null } });
    }
    let topReactions: string[] = [];
    try {
      const reactionGroups = await prisma.like.groupBy({
        by: ['type'],
        where: { 
          postId: targetType === "post" ? targetId : undefined,
          projectId: targetType === "project" ? targetId : undefined,
        },
        _count: true
      });
      topReactions = reactionGroups
        .sort((a: any, b: any) => b._count - a._count)
        .map((g: any) => g.type);
    } catch (e) {}

    return { success: true, hasLiked: !!like, myReaction: like ? like.type : null, hasSaved: !!save, likeCount, commentCount, topReactions };
  } catch (e) {
    return { success: false, hasLiked: false, myReaction: null, hasSaved: false, likeCount: 0, commentCount: 0 };
  }
}

// Batch version: fetch interaction state for multiple projects in one go
export async function checkBatchProjectInteractionState(userId: string | undefined, projectIds: string[]) {
  if (!projectIds.length) return {};

  try {
    // 1. Fetch all likes for these projects by this user (one query)
    const likes = userId
      ? await prisma.like.findMany({
          where: { userId, projectId: { in: projectIds } },
          select: { projectId: true, type: true },
        })
      : [];

    // 2. Fetch all saves for these projects by this user (one query)
    const saves = userId
      ? await prisma.savedProject.findMany({
          where: { userId, projectId: { in: projectIds } },
          select: { projectId: true },
        })
      : [];

    // 3. Fetch like counts for all projects (one query)
    const likeCounts = await prisma.like.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds } },
      _count: true,
    });

    // 4. Fetch comment counts (one query)
    const commentCounts = await prisma.comment.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, parentId: null },
      _count: true,
    });

    // 5. Top reactions per project (one query)
    const reactionGroups = await prisma.like.groupBy({
      by: ["projectId", "type"],
      where: { projectId: { in: projectIds } },
      _count: true,
      orderBy: { _count: { type: "desc" } },
    });

    // Build maps
    const likeMap = new Map(likes.map((l) => [l.projectId!, l.type]));
    const saveSet = new Set(saves.map((s) => s.projectId));
    const likeCountMap = new Map(likeCounts.map((l) => [l.projectId!, l._count]));
    const commentCountMap = new Map(commentCounts.map((c) => [c.projectId!, c._count]));

    const topReactionsMap: Map<string, string[]> = new Map();
    for (const rg of reactionGroups) {
      if (!rg.projectId) continue;
      if (!topReactionsMap.has(rg.projectId)) topReactionsMap.set(rg.projectId, []);
      topReactionsMap.get(rg.projectId)!.push(rg.type);
    }

    // Assemble result per project
    const result: Record<string, any> = {};
    for (const id of projectIds) {
      result[id] = {
        success: true,
        myReaction: (likeMap.get(id) as string | null) ?? null,
        hasLiked: likeMap.has(id),
        hasSaved: saveSet.has(id),
        likeCount: likeCountMap.get(id) ?? 0,
        commentCount: commentCountMap.get(id) ?? 0,
        topReactions: topReactionsMap.get(id) ?? [],
      };
    }
    return result;
  } catch (e) {
    console.error("checkBatchProjectInteractionState error:", e);
    return {};
  }
}



