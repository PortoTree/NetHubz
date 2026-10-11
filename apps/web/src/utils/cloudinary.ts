/**
 * Helper to generate optimized Cloudinary URLs based on our media infrastructure plan.
 * Standardizes transformations to save bandwidth and storage.
 */
export function getOptimizedUrl(
  url: string | null | undefined, 
  type: "avatar" | "cover" | "preview" | "thumb" | "feed"
): string {
  if (!url) return "";
  const cleanUrl = url.trim();

  // If it's a local blob (during preview before upload completes), return as is
  if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:") || cleanUrl.startsWith("/")) return cleanUrl;

  // If it's not a Cloudinary URL, return as is
  if (!cleanUrl.includes("res.cloudinary.com") || !cleanUrl.includes("/image/upload/")) return cleanUrl;

  // If already transformed with Cloudinary parameters, don't stack transformations
  if (cleanUrl.includes("/image/upload/c_") || cleanUrl.includes("/image/upload/q_")) {
    return cleanUrl;
  }

  // Define our standard transformations based on Blueprint
  let transformation = "q_auto,f_auto"; // Default fallback
  
  if (type === "avatar") {
    // 300x300, fill, optimize quality & format
    transformation = "c_fill,w_300,h_300,q_auto,f_auto";
  } else if (type === "thumb") {
    // 400x400 (for grid cells), fill, optimize
    transformation = "c_fill,w_400,h_400,q_auto,f_auto";
  } else if (type === "feed") {
    // Max 800 width (for feed views), keep aspect ratio
    transformation = "c_limit,w_800,q_auto,f_auto";
  } else if (type === "cover") {
    // 1200x400 (3:1 aspect ratio), fill, optimize quality & format
    transformation = "c_fill,w_1200,h_400,q_auto,f_auto";
  } else if (type === "preview") {
    // Max 1600 width for fullscreen viewing, keep aspect ratio
    transformation = "c_limit,w_1600,q_auto,f_auto";
  }

  // Inject transformation right after "/upload/"
  return cleanUrl.replace("/upload/", `/upload/${transformation}/`);
}
