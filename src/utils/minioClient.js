const { Client } = require('minio');
const createLogger = require('./logger');

const logger = createLogger('MODULE:MINIO_CLIENT');

let minioClient;
let bucketName;

/**
 * Initialize MinIO client with environment variables
 * Call this after environment variables are set (especially in tests)
 */
const initializeMinioClient = () => {
  if (minioClient) {
    logger.info('MinIO client already initialized');
    return minioClient;
  }

  const endpoint = process.env.MINIO_ENDPOINT || process.env.MINIO_HOST || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || process.env.MINIO_API_PORT || '9000');
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
  const secretKey = process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

  bucketName = process.env.MINIO_BUCKET_NAME || 'devbyte-profile-pictures';

  logger.info('Initializing MinIO client:', {
    domain: `${endpoint}:${port}`,
    SSL: useSSL,
    Bucket: bucketName,
  });

  minioClient = new Client({
    endPoint: endpoint,
    port: port,
    useSSL: useSSL,
    accessKey: accessKey,
    secretKey: secretKey,
  });

  return minioClient;
};

/**
 * Get MinIO client instance (initializes if needed)
 */
const getMinioClient = () => {
  if (!minioClient) {
    initializeMinioClient();
  }
  return minioClient;
};

/**
 * Get bucket name (initializes client if needed to get env var)
 */
const getBucketName = () => {
  if (!bucketName) {
    initializeMinioClient();
  }
  return bucketName;
};

/**
 * Initialize bucket (creates if doesn't exist)
 */
const initializeBucket = async () => {
  try {
    const client = getMinioClient();
    const bucket = getBucketName();

    const exists = await client.bucketExists(bucket);
    if (!exists) {
      await client.makeBucket(bucket, 'us-east-1');
      logger.info(`Bucket ${bucket} created successfully`);

      // Set public read policy so profile pictures are accessible
      const publicReadPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      await client.setBucketPolicy(bucket, JSON.stringify(publicReadPolicy));
      logger.info(`Public read policy set for bucket ${bucket}`);
    } else {
      logger.info(`Bucket ${bucket} already exists`);
    }
  } catch (error) {
    logger.error(`Error initializing MinIO bucket: ${error.message}`);
    throw error;
  }
};

// Auto-initialize in non-test environments
if (process.env.NODE_ENV !== 'test') {
  initializeMinioClient();
}

module.exports = {
  get minioClient() {
    return getMinioClient();
  },
  get bucketName() {
    return getBucketName();
  },
  initializeMinioClient,
  initializeBucket,
};
