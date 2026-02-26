// backend/services/s3Service.js - AWS S3 Cloud Storage

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

class S3Service {
  constructor() {
    this.client = null;
    this.bucket = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION || 'eu-west-1';
    this.enabled = false;

    this.initialize();
  }

  initialize() {
    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !this.bucket) {
      console.log('⚠️  AWS S3 not configured, using local storage');
      return;
    }

    try {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      this.enabled = true;
      console.log('✓ AWS S3 storage initialized');
    } catch (error) {
      console.error('S3 initialization error:', error);
      this.enabled = false;
    }
  }

  /**
   * Upload file to S3
   * @param {String} localPath - Local file path
   * @param {String} s3Key - S3 object key (path in bucket)
   * @param {Object} options - Upload options
   * @returns {Object} - Upload result
   */
  async uploadFile(localPath, s3Key, options = {}) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const fileStream = createReadStream(localPath);
      const stats = fs.statSync(localPath);
      
      const {
        contentType = 'application/octet-stream',
        metadata = {},
        acl = 'private',
        cacheControl = 'max-age=31536000'
      } = options;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
        Metadata: metadata,
        ACL: acl,
        CacheControl: cacheControl
      });

      await this.client.send(command);

      return {
        success: true,
        bucket: this.bucket,
        key: s3Key,
        size: stats.size,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Upload buffer to S3
   * @param {Buffer} buffer - File buffer
   * @param {String} s3Key - S3 object key
   * @param {Object} options - Upload options
   * @returns {Object} - Upload result
   */
  async uploadBuffer(buffer, s3Key, options = {}) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const {
        contentType = 'application/octet-stream',
        metadata = {},
        acl = 'private'
      } = options;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        ACL: acl
      });

      await this.client.send(command);

      return {
        success: true,
        bucket: this.bucket,
        key: s3Key,
        size: buffer.length,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`
      };
    } catch (error) {
      console.error('S3 buffer upload error:', error);
      throw new Error(`Failed to upload buffer to S3: ${error.message}`);
    }
  }

  /**
   * Download file from S3
   * @param {String} s3Key - S3 object key
   * @param {String} localPath - Local destination path
   * @returns {Object} - Download result
   */
  async downloadFile(s3Key, localPath) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      const response = await this.client.send(command);
      
      // Write stream to file
      const writeStream = fs.createWriteStream(localPath);
      response.Body.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return {
        success: true,
        localPath,
        size: response.ContentLength
      };
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download from S3: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   * @param {String} s3Key - S3 object key
   * @returns {Object} - Delete result
   */
  async deleteFile(s3Key) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      await this.client.send(command);

      return {
        success: true,
        key: s3Key
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete from S3: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for temporary access
   * @param {String} s3Key - S3 object key
   * @param {Number} expiresIn - URL expiration in seconds (default: 3600)
   * @returns {String} - Presigned URL
   */
  async getPresignedUrl(s3Key, expiresIn = 3600) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      
      return url;
    } catch (error) {
      console.error('S3 presigned URL error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * List files in S3 bucket
   * @param {String} prefix - Key prefix to filter
   * @param {Number} maxKeys - Maximum number of keys to return
   * @returns {Array} - List of objects
   */
  async listFiles(prefix = '', maxKeys = 1000) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await this.client.send(command);

      return response.Contents || [];
    } catch (error) {
      console.error('S3 list error:', error);
      throw new Error(`Failed to list S3 objects: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   * @param {String} s3Key - S3 object key
   * @returns {Boolean} - True if exists
   */
  async fileExists(s3Key) {
    if (!this.enabled) {
      return false;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Copy file within S3
   * @param {String} sourceKey - Source S3 key
   * @param {String} destKey - Destination S3 key
   * @returns {Object} - Copy result
   */
  async copyFile(sourceKey, destKey) {
    if (!this.enabled) {
      throw new Error('S3 is not configured');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: destKey,
        CopySource: `${this.bucket}/${sourceKey}`
      });

      await this.client.send(command);

      return {
        success: true,
        source: sourceKey,
        destination: destKey
      };
    } catch (error) {
      console.error('S3 copy error:', error);
      throw new Error(`Failed to copy in S3: ${error.message}`);
    }
  }

  /**
   * Generate S3 key from file info
   * @param {String} userId - User ID
   * @param {String} type - File type (photos, reports, etc.)
   * @param {String} filename - Original filename
   * @returns {String} - S3 key
   */
  generateKey(userId, type, filename) {
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    const sanitized = basename.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    return `${type}/${userId}/${timestamp}-${sanitized}${ext}`;
  }
}

// Export singleton instance
export default new S3Service();

// Export helper functions
export const uploadToS3 = (localPath, s3Key, options) => {
  return new S3Service().uploadFile(localPath, s3Key, options);
};

export const downloadFromS3 = (s3Key, localPath) => {
  return new S3Service().downloadFile(s3Key, localPath);
};

export const deleteFromS3 = (s3Key) => {
  return new S3Service().deleteFile(s3Key);
};
