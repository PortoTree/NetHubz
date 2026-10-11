export interface FriendItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface SocialPlatform {
  id: "whatsapp" | "facebook" | "telegram" | "instagram";
  name: string;
  url: string;
}

export function formatShareMessage(
  title?: string,
  text?: string,
  fallback?: string,
  type: "POST" | "PROJECT" = "POST"
): string {
  const parts: string[] = [];

  if (title && title.trim()) {
    parts.push(title.trim());
  }

  if (text && text.trim()) {
    // Strip markdown formatting if any and truncate cleanly
    const cleaned = text
      .replace(/@\[.*?\]\([^\)]+\)/g, "")
      .replace(/[*_~]/g, "")
      .trim();
    const truncated = cleaned.length > 120 ? cleaned.slice(0, 117) + "..." : cleaned;
    if (truncated && truncated !== title) {
      parts.push(truncated);
    }
  }

  if (parts.length === 0) {
    if (fallback && fallback.trim()) return fallback.trim();
    return type === "PROJECT" ? "Lihat project ini di NetHubz" : "Lihat postingan ini di NetHubz";
  }

  return parts.join(" — ");
}

export function getWhatsAppShareUrl(url: string, text?: string): string {
  const content = text ? `${text}\n${url}` : url;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
}

export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function getTelegramShareUrl(url: string, text?: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = text ? encodeURIComponent(text) : "";
  return `https://t.me/share/url?url=${encodedUrl}${encodedText ? `&text=${encodedText}` : ""}`;
}

export function getInstagramShareUrl(url: string): string {
  return "https://www.instagram.com/";
}

export function getSocialSharePlatforms(url: string, text?: string): SocialPlatform[] {
  return [
    {
      id: "whatsapp",
      name: "WhatsApp",
      url: getWhatsAppShareUrl(url, text),
    },
    {
      id: "facebook",
      name: "Facebook",
      url: getFacebookShareUrl(url),
    },
    {
      id: "telegram",
      name: "Telegram",
      url: getTelegramShareUrl(url, text),
    },
    {
      id: "instagram",
      name: "Instagram",
      url: getInstagramShareUrl(url),
    },
  ];
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function triggerNativeShare(data: {
  title?: string;
  text?: string;
  url: string;
}): Promise<boolean> {
  if (canUseNativeShare()) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return true;
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return true; // User intentionally closed/cancelled the native sharesheet
      }
      return false;
    }
  }
  return false;
}

export function filterFriends(friends: FriendItem[], query: string): FriendItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return friends;

  return friends.filter((f) => {
    const nameMatch = f.displayName?.toLowerCase().includes(q);
    const userMatch = f.username?.toLowerCase().includes(q);
    return nameMatch || userMatch;
  });
}

export async function copyShareLink(url: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  return false;
}
