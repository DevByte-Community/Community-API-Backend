// tests/user/user.int.test.js
const request = require('supertest');
const { GenericContainer } = require('testcontainers');

jest.setTimeout(60000);

let postgresContainer;
let redisContainer;
let minioContainer;
let app;
let db;
let redisClientModule;
let testUser;
let authToken;

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, _otp) => {
    return { success: true, message: `Mock OTP sent to ${email}` };
  }),
}));

describe('PATCH /api/v1/users/profile/picture - Profile Picture Upload Integration Tests', () => {
  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:14')
      .withEnvironment({
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7').withExposedPorts(6379).start();

    // Start MinIO container
    minioContainer = await new GenericContainer('minio/minio:latest')
      .withCommand(['server', '/data'])
      .withEnvironment({
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin',
      })
      .withExposedPorts(9000)
      .start();

    const postgresHost = postgresContainer.getHost();
    const postgresPort = postgresContainer.getMappedPort(5432);
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);
    const minioHost = minioContainer.getHost();
    const minioPort = minioContainer.getMappedPort(9000);

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_HOST = postgresHost;
    process.env.POSTGRES_PORT = String(postgresPort);
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

    // Redis config
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = String(redisPort);
    process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

    // MinIO config
    process.env.MINIO_ENDPOINT = minioHost;
    process.env.MINIO_PORT = String(minioPort);
    process.env.MINIO_ROOT_USER = 'minioadmin';
    process.env.MINIO_ROOT_PASSWORD = 'minioadmin';
    process.env.MINIO_BUCKET_NAME = 'test-profile-pictures';
    process.env.MINIO_USE_SSL = 'false';
    process.env.MAX_FILE_SIZE = String(5 * 1024 * 1024); // 5MB

    // Initialize Redis
    redisClientModule = require('../../utils/redisClient');
    redisClientModule.initializeRedisClient(process.env.REDIS_URL);
    await redisClientModule.client.connect();

    // Initialize MinIO client and bucket
    const minioClientModule = require('../../utils/minioClient');
    minioClientModule.initializeMinioClient();
    await minioClientModule.initializeBucket();

    // Initialize database
    db = require('../../models');
    await db.sequelize.sync({ force: true });
    app = require('../../app');

    // Create test user and get auth token
    const signupResponse = await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
    });

    authToken = signupResponse.body.access_token;
    testUser = signupResponse.body.user;
  });

  afterAll(async () => {
    if (db && db.sequelize) await db.sequelize.close();
    if (redisClientModule) await redisClientModule.disconnect();
    if (postgresContainer) await postgresContainer.stop();
    if (redisContainer) await redisContainer.stop();
    if (minioContainer) await minioContainer.stop();
    jest.restoreAllMocks();
  });

  describe('Successful Profile Picture Upload', () => {
    it('should upload a JPEG profile picture successfully', async () => {
      // Create a small test JPEG buffer (1x1 pixel JPEG)
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', jpegBuffer, 'test-image.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile picture updated successfully');
      expect(response.body.user).toHaveProperty('id', testUser.id);
      expect(response.body.user).toHaveProperty('profilePicture');
      expect(response.body.user.profilePicture).toContain('profile_picture_');
      expect(response.body.user.profilePicture).toContain('.jpg');
    });

    it('should upload a PNG profile picture successfully', async () => {
      // Create a small test PNG buffer (1x1 pixel PNG)
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', pngBuffer, 'test-image.png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.profilePicture).toContain('.png');
    });

    it('should replace existing profile picture when uploading a new one', async () => {
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      // First upload
      const firstUpload = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', jpegBuffer, 'first-image.jpg');

      const firstPictureUrl = firstUpload.body.user.profilePicture;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Second upload
      const secondUpload = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', jpegBuffer, 'second-image.jpg');

      const secondPictureUrl = secondUpload.body.user.profilePicture;

      expect(secondUpload.status).toBe(200);
      expect(secondPictureUrl).not.toBe(firstPictureUrl);
      expect(secondPictureUrl).toContain('profile_picture_');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when no authentication token is provided', async () => {
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .attach('profile_picture', jpegBuffer, 'test-image.jpg');

      expect(response.status).toBe(401);
    });

    it('should return 401 when invalid authentication token is provided', async () => {
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', 'Bearer invalid-token-123')
        .attach('profile_picture', jpegBuffer, 'test-image.jpg');

      expect(response.status).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '-1h' } // Token expired 1 hour ago
      );

      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${expiredToken}`)
        .attach('profile_picture', jpegBuffer, 'test-image.jpg');

      expect(response.status).toBe(401);
    });
  });

  describe('File Validation', () => {
    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No file uploaded');
    });

    it('should return 400 when file type is invalid (TXT)', async () => {
      const txtBuffer = Buffer.from('This is a text file');

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', txtBuffer, 'document.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when file size exceeds 5MB limit', async () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', largeBuffer, 'large-image.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject file with wrong field name', async () => {
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('wrong_field_name', jpegBuffer, 'test-image.jpg');

      expect(response.status).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent uploads from same user', async () => {
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      // Send two uploads concurrently
      const [response1, response2] = await Promise.all([
        request(app)
          .patch('/api/v1/users/profile/picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('profile_picture', jpegBuffer, 'upload1.jpg'),
        request(app)
          .patch('/api/v1/users/profile/picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('profile_picture', jpegBuffer, 'upload2.jpg'),
      ]);

      // Both should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // But should have different filenames (timestamp based)
      expect(response1.body.user.profilePicture).not.toBe(response2.body.user.profilePicture);
    });

    it('should handle very small valid JPEG file', async () => {
      // Minimum valid JPEG (1x1 pixel)
      const tinyJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', tinyJpeg, 'tiny.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle filename with special characters', async () => {
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
        'base64'
      );

      const response = await request(app)
        .patch('/api/v1/users/profile/picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', jpegBuffer, 'image with spaces & special!chars.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Generated filename should use sanitized version
      expect(response.body.user.profilePicture).toContain('profile_picture_');
    });
  });
});
