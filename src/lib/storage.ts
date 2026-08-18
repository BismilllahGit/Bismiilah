import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";

// Check if Cloudflare R2 / S3 environment variables are configured
const isR2Configured = 
  !!process.env.R2_ACCOUNT_ID && 
  !!process.env.R2_ACCESS_KEY_ID && 
  !!process.env.R2_SECRET_ACCESS_KEY && 
  !!process.env.R2_BUCKET_NAME;

const s3Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "bismillah-reports";

/**
 * Uploads a file buffer (PDF) to Cloudflare R2 and returns a time-limited signed URL (1-hour expiry).
 * If R2 credentials are not set (e.g., local development), falls back to saving in public/uploads.
 */
export async function uploadPdfAndGetSignedUrl(
  fileBuffer: Buffer | Uint8Array,
  filePath: string
): Promise<string> {
  if (isR2Configured && s3Client) {
    try {
      // 1. Upload to Cloudflare R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: filePath,
          Body: fileBuffer,
          ContentType: "application/pdf",
          ContentDisposition: `inline; filename="${path.basename(filePath)}"`,
        })
      );

      // 2. Generate signed URL valid for 1 hour (3600 seconds)
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: filePath,
        }),
        { expiresIn: 3600 }
      );

      return signedUrl;
    } catch (error) {
      console.error("Failed to upload to Cloudflare R2:", error);
      throw new Error("PDF storage upload failed");
    }
  } else {
    // Graceful local development fallback when R2 credentials are not set
    const publicUploadDir = path.join(process.cwd(), "public", "uploads");
    const fullLocalPath = path.join(publicUploadDir, filePath);
    
    // Ensure directories exist
    await fs.mkdir(path.dirname(fullLocalPath), { recursive: true });
    await fs.writeFile(fullLocalPath, fileBuffer);
    
    // Return a URL served statically by Next.js with simulated 1-hour expiry tag
    const expires = Date.now() + 3600 * 1000;
    return `/uploads/${filePath}?signed=local&expires=${expires}`;
  }
}
