// lib\r2-upload.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure R2 client (S3 compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  fileBuffer: Buffer, 
  fileName: string, 
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      // Make the file publicly accessible for download
      ACL: 'public-read',
    });

    await r2Client.send(command);
    
    // Return public URL for the uploaded file
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getContentType(format: string): string {
  const typeMap: { [key: string]: string } = {
    eps: 'application/postscript',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
  };
  
  return typeMap[format.toLowerCase()] || 'application/octet-stream';
}