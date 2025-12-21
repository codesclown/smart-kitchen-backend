import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://your-account-id.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kitchen-manager';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://your-domain.com';

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
}

export class StorageService {
  /**
   * Upload a file to Cloudflare R2
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const fileExtension = filename.split('.').pop() || '';
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${uniqueFilename}`;

      // Optimize image if it's an image file
      let processedBuffer = buffer;
      if (contentType.startsWith('image/')) {
        processedBuffer = await this.optimizeImage(buffer);
      }

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: processedBuffer,
        ContentType: contentType,
        Metadata: {
          originalFilename: filename,
          uploadedAt: new Date().toISOString(),
        },
      });

      await r2Client.send(command);

      const url = `${PUBLIC_URL}/${key}`;

      return {
        url,
        key,
        filename: uniqueFilename,
        size: processedBuffer.length,
        contentType,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Delete a file from Cloudflare R2
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await r2Client.send(command);
    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  /**
   * Generate a presigned URL for direct upload
   */
  static async getPresignedUploadUrl(
    filename: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<{ url: string; key: string }> {
    try {
      const fileExtension = filename.split('.').pop() || '';
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${uniqueFilename}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour

      return { url, key };
    } catch (error) {
      console.error('Presigned URL generation failed:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Optimize images using Sharp
   */
  private static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(1920, 1920, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85, 
          progressive: true 
        })
        .toBuffer();
    } catch (error) {
      console.error('Image optimization failed:', error);
      // Return original buffer if optimization fails
      return buffer;
    }
  }

  /**
   * Upload receipt image for OCR processing
   */
  static async uploadReceipt(buffer: Buffer, filename: string): Promise<UploadResult> {
    return this.uploadFile(buffer, filename, 'image/jpeg', 'receipts');
  }

  /**
   * Upload inventory item image
   */
  static async uploadInventoryImage(buffer: Buffer, filename: string): Promise<UploadResult> {
    return this.uploadFile(buffer, filename, 'image/jpeg', 'inventory');
  }

  /**
   * Upload user avatar image
   */
  static async uploadAvatar(buffer: Buffer, filename: string, userId: string): Promise<UploadResult> {
    try {
      // Generate unique filename with user ID
      const fileExtension = filename.split('.').pop() || 'jpg';
      const uniqueFilename = `${userId}-${Date.now()}.${fileExtension}`;
      const key = `avatars/${uniqueFilename}`;

      // Optimize avatar image (smaller size for avatars)
      const optimizedBuffer = await sharp(buffer)
        .resize(400, 400, { 
          fit: 'cover', 
          position: 'center' 
        })
        .jpeg({ 
          quality: 90, 
          progressive: true 
        })
        .toBuffer();

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          originalFilename: filename,
          userId: userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await r2Client.send(command);

      const url = `${PUBLIC_URL}/${key}`;

      return {
        url,
        key,
        filename: uniqueFilename,
        size: optimizedBuffer.length,
        contentType: 'image/jpeg',
      };
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  /**
   * Generate presigned URL for avatar upload
   */
  static async getPresignedAvatarUploadUrl(userId: string): Promise<{ url: string; key: string }> {
    try {
      const uniqueFilename = `${userId}-${Date.now()}.jpg`;
      const key = `avatars/${uniqueFilename}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: 'image/jpeg',
        Metadata: {
          userId: userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour

      return { url, key };
    } catch (error) {
      console.error('Presigned avatar URL generation failed:', error);
      throw new Error('Failed to generate presigned avatar URL');
    }
  }

  /**
   * Delete old avatar when user uploads new one
   */
  static async deleteOldAvatar(avatarUrl: string): Promise<void> {
    try {
      if (!avatarUrl || !avatarUrl.includes(PUBLIC_URL)) {
        return; // Not our hosted image
      }

      const key = avatarUrl.replace(`${PUBLIC_URL}/`, '');
      await this.deleteFile(key);
    } catch (error) {
      console.error('Failed to delete old avatar:', error);
      // Don't throw error, just log it
    }
  }
}