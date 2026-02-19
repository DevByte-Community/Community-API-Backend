const Minio = require('minio');
const logger = require('../utils/logger');
const minioClientModule = require('../blobStorage/minioClient');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

const BUCKET_NAME = 'partners';

class MinioService {
  static async initializeBucket() {
    try {
      const exists = await minioClient.bucketExists(BUCKET_NAME);
      if (!exists) {
        await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
        logger.info(`MinIO bucket "${BUCKET_NAME}" created`);
      }
    } catch (error) {
      logger.error('Failed to initialize MinIO bucket:', error);
      throw error;
    }
  }

  static async uploadLogo(partnerId, fileBuffer, originalName) {
    try {
      await this.initializeBucket();
      
      const extension = originalName.split('.').pop().toLowerCase();
      const allowedExtensions = ['svg', 'png', 'jpg', 'jpeg'];
      
      if (!allowedExtensions.includes(extension)) {
        throw new Error('Invalid file type. Only SVG, PNG, JPG allowed');
      }

      const fileName = `${partnerId}_logo.${extension}`;
      await minioClient.putObject(BUCKET_NAME, fileName, fileBuffer);
      
      const logoUrl = `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`}/${BUCKET_NAME}/${fileName}`;
      
      logger.info(`Logo uploaded for partner ${partnerId}: ${logoUrl}`);
      return logoUrl;
    } catch (error) {
      logger.error('Failed to upload logo:', error);
      throw error;
    }
  }

  static async deleteLogo(logoUrl) {
    try {
      if (!logoUrl) return;
      
      const fileName = logoUrl.split('/').pop();
      await minioClient.removeObject(BUCKET_NAME, fileName);
      logger.info(`Logo deleted: ${fileName}`);
    } catch (error) {
      logger.error('Failed to delete logo:', error);
      throw error;
    }
  }
}

module.exports = MinioService;