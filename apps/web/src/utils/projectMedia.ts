export interface ResolvedProjectMedia {
  coverUrls: string[];
  mediaUrls: string[];
}

export function extractPublicIdFromUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const clean = url.split("?")[0].split("#")[0];
  const uploadIndex = clean.indexOf("/upload/");
  if (uploadIndex === -1) {
    const filename = clean.split("/").pop() || "";
    return filename.split(".")[0] || clean;
  }
  let afterUpload = clean.substring(uploadIndex + "/upload/".length);
  const vMatch = afterUpload.match(/(?:^|\/)v\d+\/(.+)$/);
  if (vMatch && vMatch[1]) {
    afterUpload = vMatch[1];
  } else {
    const segments = afterUpload.split("/");
    if (segments.length > 1 && (segments[0].includes(",") || /^[a-z]_[a-z0-9]+/i.test(segments[0]))) {
      segments.shift();
    }
    afterUpload = segments.join("/");
  }
  const lastDot = afterUpload.lastIndexOf(".");
  if (lastDot !== -1) {
    afterUpload = afterUpload.substring(0, lastDot);
  }
  return afterUpload;
}

/**
 * Memetakan media dari relasi `projectMedia` (baru) dengan fallback otomatis
 * ke `coverUrls` dan `mediaUrls` (lama) untuk backward compatibility 100%.
 */
export function resolveProjectMediaUrls(project: {
  coverUrls?: string[] | null;
  mediaUrls?: string[] | null;
  projectMedia?: Array<{
    order: number;
    isCover?: boolean;
    media: {
      originalUrl: string;
      thumbUrl?: string | null;
      feedUrl?: string | null;
      detailUrl?: string | null;
    };
  }> | null;
}): ResolvedProjectMedia {
  if (project.projectMedia && project.projectMedia.length > 0) {
    const sorted = [...project.projectMedia].sort((a, b) => a.order - b.order);
    const coverUrls: string[] = [];
    const mediaUrls: string[] = [];

    for (const pm of sorted) {
      if (pm.isCover) {
        coverUrls.push(pm.media.originalUrl);
      } else {
        mediaUrls.push(pm.media.originalUrl);
      }
    }

    return {
      coverUrls: coverUrls.length > 0 ? coverUrls : (project.coverUrls || []),
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : (project.mediaUrls || []),
    };
  }

  return {
    coverUrls: Array.isArray(project.coverUrls) ? project.coverUrls : [],
    mediaUrls: Array.isArray(project.mediaUrls) ? project.mediaUrls : [],
  };
}

/**
 * Menyiapkan payload nested create Prisma untuk ProjectMedia dan Media.
 */
export function prepareProjectMediaCreates(
  userId: string,
  coverUrls: string[] = [],
  mediaUrls: string[] = []
) {
  const items: any[] = [];

  coverUrls.forEach((url, idx) => {
    const publicId = extractPublicIdFromUrl(url);
    items.push({
      order: idx,
      isCover: true,
      media: {
        create: {
          userId,
          type: "IMAGE",
          provider: "cloudinary",
          publicId: publicId || url,
          originalUrl: url,
        },
      },
    });
  });

  mediaUrls.forEach((url, idx) => {
    const publicId = extractPublicIdFromUrl(url);
    items.push({
      order: idx,
      isCover: false,
      media: {
        create: {
          userId,
          type: "IMAGE",
          provider: "cloudinary",
          publicId: publicId || url,
          originalUrl: url,
        },
      },
    });
  });

  return items;
}

export interface MediaItemToDelete {
  publicId: string;
  mediaId?: string;
  type: "image" | "video";
}

/**
 * Mengumpulkan daftar publicId dan mediaId yang perlu dihapus dari Cloudinary & DB saat project dihapus.
 */
export function getProjectMediaToDelete(project: {
  projectMedia?: Array<{
    mediaId: string;
    media?: {
      id: string;
      publicId: string;
      type?: string;
    };
  }> | null;
  coverUrls?: string[] | null;
  mediaUrls?: string[] | null;
}): MediaItemToDelete[] {
  const result: MediaItemToDelete[] = [];
  const seenPublicIds = new Set<string>();

  // 1. Dari projectMedia terstruktur
  if (project.projectMedia && project.projectMedia.length > 0) {
    for (const pm of project.projectMedia) {
      if (pm.media && pm.media.publicId) {
        if (!seenPublicIds.has(pm.media.publicId)) {
          seenPublicIds.add(pm.media.publicId);
          result.push({
            publicId: pm.media.publicId,
            mediaId: pm.mediaId || pm.media.id,
            type: pm.media.type === "VIDEO" ? "video" : "image",
          });
        }
      }
    }
  }

  // 2. Fallback dari legacy coverUrls & mediaUrls
  const legacyUrls = [
    ...(Array.isArray(project.coverUrls) ? project.coverUrls : []),
    ...(Array.isArray(project.mediaUrls) ? project.mediaUrls : []),
  ];

  for (const url of legacyUrls) {
    const publicId = extractPublicIdFromUrl(url);
    if (publicId && !seenPublicIds.has(publicId)) {
      seenPublicIds.add(publicId);
      result.push({
        publicId,
        type: url.match(/\.(mp4|webm|ogg)$/i) ? "video" : "image",
      });
    }
  }

  return result;
}
