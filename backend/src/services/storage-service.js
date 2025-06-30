const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local'; // 'local' or 's3'
    this.localUploadDir = path.join(__dirname, '../../uploads');
    
    if (this.storageType === 's3') {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.bucketName = process.env.S3_BUCKET_NAME;
    }
    
    this.initializeLocalStorage();
  }

  async initializeLocalStorage() {
    try {
      await fs.mkdir(this.localUploadDir, { recursive: true });
      console.log(`✅ Local storage directory ready: ${this.localUploadDir}`);
    } catch (error) {
      console.error('❌ Failed to initialize local storage:', error);
    }
  }

  // Generate unique filename
  generateFileName(originalName) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    return `backup-${timestamp}-${randomBytes}-${baseName}${ext}`;
  }

  // Store file (local or S3)
  async storeFile(fileBuffer, originalName, metadata = {}) {
    const fileName = this.generateFileName(originalName);
    
    try {
      if (this.storageType === 's3') {
        return await this.storeToS3(fileBuffer, fileName, originalName, metadata);
      } else {
        return await this.storeLocally(fileBuffer, fileName, originalName, metadata);
      }
    } catch (error) {
      console.error('❌ Failed to store file:', error);
      throw new Error(`Storage failed: ${error.message}`);
    }
  }

  // Store file to S3
  async storeToS3(fileBuffer, fileName, originalName, metadata) {
    const params = {
      Bucket: this.bucketName,
      Key: `backups/${fileName}`,
      Body: fileBuffer,
      ContentType: this.getContentType(originalName),
      Metadata: {
        originalName,
        uploadDate: new Date().toISOString(),
        ...metadata
      },
      ServerSideEncryption: 'AES256' // Encrypt at rest
    };

    const result = await this.s3.upload(params).promise();
    
    console.log(`✅ File stored to S3: ${fileName}`);
    
    return {
      fileName,
      filePath: result.Location,
      storageType: 's3',
      bucket: this.bucketName,
      key: params.Key,
      size: fileBuffer.length,
      etag: result.ETag
    };
  }

  // Store file locally
  async storeLocally(fileBuffer, fileName, originalName, metadata) {
    const filePath = path.join(this.localUploadDir, fileName);
    
    await fs.writeFile(filePath, fileBuffer);
    
    // Store metadata in a separate file
    const metadataPath = filePath + '.meta';
    const metadataContent = {
      originalName,
      uploadDate: new Date().toISOString(),
      size: fileBuffer.length,
      ...metadata
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2));
    
    console.log(`✅ File stored locally: ${fileName}`);
    
    return {
      fileName,
      filePath,
      storageType: 'local',
      size: fileBuffer.length,
      metadata: metadataContent
    };
  }

  // Retrieve file
  async retrieveFile(fileInfo) {
    try {
      if (fileInfo.storageType === 's3') {
        return await this.retrieveFromS3(fileInfo);
      } else {
        return await this.retrieveLocally(fileInfo);
      }
    } catch (error) {
      console.error('❌ Failed to retrieve file:', error);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  // Retrieve from S3
  async retrieveFromS3(fileInfo) {
    const params = {
      Bucket: fileInfo.bucket,
      Key: fileInfo.key
    };

    const result = await this.s3.getObject(params).promise();
    return result.Body;
  }

  // Retrieve from local storage
  async retrieveLocally(fileInfo) {
    return await fs.readFile(fileInfo.filePath);
  }

  // Delete file
  async deleteFile(fileInfo) {
    try {
      if (fileInfo.storageType === 's3') {
        await this.deleteFromS3(fileInfo);
      } else {
        await this.deleteLocally(fileInfo);
      }
      console.log(`✅ File deleted: ${fileInfo.fileName}`);
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  // Delete from S3
  async deleteFromS3(fileInfo) {
    const params = {
      Bucket: fileInfo.bucket,
      Key: fileInfo.key
    };

    await this.s3.deleteObject(params).promise();
  }

  // Delete from local storage
  async deleteLocally(fileInfo) {
    await fs.unlink(fileInfo.filePath);
    
    // Also delete metadata file if it exists
    const metadataPath = fileInfo.filePath + '.meta';
    try {
      await fs.unlink(metadataPath);
    } catch (error) {
      // Metadata file might not exist, ignore error
    }
  }

  // Get file info/metadata
  async getFileInfo(fileInfo) {
    try {
      if (fileInfo.storageType === 's3') {
        return await this.getS3FileInfo(fileInfo);
      } else {
        return await this.getLocalFileInfo(fileInfo);
      }
    } catch (error) {
      console.error('❌ Failed to get file info:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  // Get S3 file info
  async getS3FileInfo(fileInfo) {
    const params = {
      Bucket: fileInfo.bucket,
      Key: fileInfo.key
    };

    const result = await this.s3.headObject(params).promise();
    
    return {
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      etag: result.ETag,
      metadata: result.Metadata
    };
  }

  // Get local file info
  async getLocalFileInfo(fileInfo) {
    const stats = await fs.stat(fileInfo.filePath);
    
    let metadata = {};
    const metadataPath = fileInfo.filePath + '.meta';
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      // Metadata file might not exist
    }
    
    return {
      size: stats.size,
      lastModified: stats.mtime,
      created: stats.birthtime,
      metadata
    };
  }

  // Check if file exists
  async fileExists(fileInfo) {
    try {
      if (fileInfo.storageType === 's3') {
        await this.getS3FileInfo(fileInfo);
        return true;
      } else {
        await fs.access(fileInfo.filePath);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  // Get content type based on file extension
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.sql': 'application/sql',
      '.dump': 'application/octet-stream',
      '.backup': 'application/octet-stream'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  // Generate signed URL for S3 (for temporary access)
  async generateSignedUrl(fileInfo, expiresIn = 3600) {
    if (fileInfo.storageType !== 's3') {
      throw new Error('Signed URLs are only available for S3 storage');
    }

    const params = {
      Bucket: fileInfo.bucket,
      Key: fileInfo.key,
      Expires: expiresIn
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  // Clean up old files (for maintenance)
  async cleanupOldFiles(maxAgeHours = 24 * 7) { // Default: 1 week
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    try {
      if (this.storageType === 's3') {
        await this.cleanupS3Files(cutoffTime);
      } else {
        await this.cleanupLocalFiles(cutoffTime);
      }
      console.log(`✅ Cleanup completed for files older than ${maxAgeHours} hours`);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  // Cleanup S3 files
  async cleanupS3Files(cutoffTime) {
    const params = {
      Bucket: this.bucketName,
      Prefix: 'backups/'
    };

    const objects = await this.s3.listObjectsV2(params).promise();
    const filesToDelete = objects.Contents.filter(obj => obj.LastModified < cutoffTime);

    if (filesToDelete.length > 0) {
      const deleteParams = {
        Bucket: this.bucketName,
        Delete: {
          Objects: filesToDelete.map(obj => ({ Key: obj.Key }))
        }
      };

      await this.s3.deleteObjects(deleteParams).promise();
      console.log(`🗑️ Deleted ${filesToDelete.length} old files from S3`);
    }
  }

  // Cleanup local files
  async cleanupLocalFiles(cutoffTime) {
    const files = await fs.readdir(this.localUploadDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.localUploadDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffTime) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🗑️ Deleted ${deletedCount} old files from local storage`);
    }
  }
}

module.exports = new StorageService();
