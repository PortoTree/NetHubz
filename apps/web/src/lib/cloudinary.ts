import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Setup konfigurasi
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function logToFile(msg: string) {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'cloudinary-debug.log'), msg + '\n');
  } catch (e) {}
}

/**
 * Fungsi untuk menghapus media dari Cloudinary menggunakan publicId
 */
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video' = 'image') {
  try {
    logToFile(`Attempting to delete publicId: ${publicId} with type: ${resourceType}`);
    logToFile(`Config keys present? name: ${!!process.env.CLOUDINARY_CLOUD_NAME}, key: ${!!process.env.CLOUDINARY_API_KEY}, secret: ${!!process.env.CLOUDINARY_API_SECRET}`);
    
    if (!publicId) {
      logToFile(`Failed: No publicId provided`);
      return false;
    }

    // Panggil API destroy (tentukan resource type: image atau video, dan invalidate CDN)
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType,
      invalidate: true
    });
    
    console.log(`Cloudinary delete result for ${publicId}:`, result);
    logToFile(`Cloudinary delete result: ${JSON.stringify(result)}`);
    return result.result === 'ok';
  } catch (error: any) {
    console.error("Gagal hapus media dari Cloudinary:", error);
    logToFile(`Cloudinary Error: ${error?.message || String(error)}`);
    return false;
  }
}

/**
 * Ekstrak publicId dari URL Cloudinary
 */
export function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (!url.includes("res.cloudinary.com")) return null;

  try {
    // Hilangkan query parameter dan hash (misal ?t=12345)
    const cleanUrl = url.split("?")[0].split("#")[0];

    // Harus mengandung /upload/
    const uploadIndex = cleanUrl.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    let afterUpload = cleanUrl.substring(uploadIndex + "/upload/".length);

    // Jika memiliki tag versi seperti /v12345/
    const vMatch = afterUpload.match(/(?:^|\/)v\d+\/(.+)$/);
    if (vMatch && vMatch[1]) {
      afterUpload = vMatch[1];
    } else {
      // Jika tidak ada versi, split dan abaikan transformasi jika ada
      const segments = afterUpload.split("/");
      if (segments.length > 1 && (segments[0].includes(",") || /^[a-z]_[a-z0-9]+/i.test(segments[0]))) {
        segments.shift();
      }
      afterUpload = segments.join("/");
    }

    // Buang ekstensi file di bagian akhir
    const lastDotIndex = afterUpload.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      afterUpload = afterUpload.substring(0, lastDotIndex);
    }

    return afterUpload || null;
  } catch (err) {
    console.error("Error extracting Cloudinary publicId:", err);
    return null;
  }
}

