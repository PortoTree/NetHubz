export interface FriendItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export function formatShareMessage(
  title?: string,
  text?: string,
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
    return type === "PROJECT" ? "Lihat project ini di NetHubz" : "Lihat postingan ini di NetHubz";
  }

  return parts.join(" — ");
}

export function getWhatsAppShareUrl(url: string, text?: string): string {
  const content = text ? `${text}\n${url}` : url;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
}

export function getTelegramShareUrl(url: string, text?: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = text ? encodeURIComponent(text) : "";
  return `https://t.me/share/url?url=${encodedUrl}${encodedText ? `&text=${encodedText}` : ""}`;
}

export function getTwitterShareUrl(url: string, text?: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = text ? encodeURIComponent(text) : "";
  return `https://twitter.com/intent/tweet?url=${encodedUrl}${encodedText ? `&text=${encodedText}` : ""}`;
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
