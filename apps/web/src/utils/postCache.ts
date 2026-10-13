export interface PostRevalidationParams {
  postId?: string;
  username?: string;
  userId?: string;
}

/**
 * Menghasilkan daftar seluruh rute publik yang harus di-revalidasi saat postingan
 * dibuat, diedit, atau dihapus (Kategori 2: Global Revalidated).
 */
export function getPostRevalidationPaths(params: PostRevalidationParams): string[] {
  const { postId, username, userId } = params;
  const paths: string[] = [];

  // 1. Feed / Beranda dan Halaman Explore
  paths.push("/", "/id", "/en");
  paths.push("/explore", "/id/explore", "/en/explore");

  // 2. Profil Pengguna (jika username tersedia)
  if (username) {
    paths.push(`/${username}`, `/id/${username}`, `/en/${username}`);
    if (userId) {
      paths.push(
        `/p/${username}/${userId}`,
        `/id/p/${username}/${userId}`,
        `/en/p/${username}/${userId}`
      );
    }
  }

  // 3. Detail Post (jika postId tersedia)
  if (postId) {
    if (username) {
      paths.push(
        `/p/${username}/${postId}`,
        `/id/p/${username}/${postId}`,
        `/en/p/${username}/${postId}`
      );
    }
    paths.push(
      `/post/${postId}`,
      `/id/post/${postId}`,
      `/en/post/${postId}`
    );
  }

  // Hilangkan duplikasi
  return Array.from(new Set(paths));
}
