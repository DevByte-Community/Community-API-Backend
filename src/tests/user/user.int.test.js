// tests/user/user.int.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { GenericContainer } = require('testcontainers');

jest.setTimeout(60000);

let postgresContainer;
let redisContainer;
let app;
let db;
let redisClientModule;

const testUser = {
  fullname: 'Profile User',
  email: 'profileuser@example.com',
  password: 'Password123!',
};

const updatedData = {
  fullname: 'Updated User',
  email: 'updated@example.com',
};

// 🧠 Mock MinIO client (we don’t want to connect to real storage)
jest.mock('../../utils/minioClient', () => ({
  minioClient: {
    putObject: jest.fn(async () => Promise.resolve()),
    removeObject: jest.fn(async () => Promise.resolve()),
  },
  bucketName: 'test-bucket',
}));

describe('🧪 USER Integration Tests', () => {
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
    redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();

    const postgresHost = postgresContainer.getHost();
    const postgresPort = postgresContainer.getMappedPort(5432);
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);

    // Configure env vars
    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_HOST = postgresHost;
    process.env.POSTGRES_PORT = String(postgresPort);
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

    redisClientModule = require('../../utils/redisClient');
    redisClientModule.initializeRedisClient(process.env.REDIS_URL);
    await redisClientModule.client.connect();

    db = require('../../models');
    await db.sequelize.sync({ force: true });
    app = require('../../app');

    // Create a test user
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    testUser.token = signupRes.body.access_token;
    testUser.id = signupRes.body.user?.id;
  });

  afterAll(async () => {
    if (db?.sequelize) await db.sequelize.close();
    if (redisClientModule) await redisClientModule.disconnect();
    if (postgresContainer) await postgresContainer.stop();
    if (redisContainer) await redisContainer.stop();
    jest.restoreAllMocks();
  });

  // ✅ PATCH /api/v1/users/profile
  describe('PATCH /api/v1/users/profile', () => {
    it('should update user fullname successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ fullname: updatedData.fullname });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.fullname).toBe(updatedData.fullname);
    });

    it('should fail if email already exists', async () => {
      // Create another user
      await request(app).post('/api/v1/auth/signup').send({
        fullname: 'Other User',
        email: updatedData.email,
        password: 'Password123!',
      });

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ email: updatedData.email });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Email already in use/i);
    });

    it('should fail if no token is provided', async () => {
      const res = await request(app)
        .patch('/api/v1/users/profile')
        .send({ fullname: 'Anonymous' });

      expect(res.status).toBe(401);
    });
  });

  // ✅ POST /api/v1/users/profile-picture
  describe('POST /api/v1/users/profile-picture', () => {
    it('should upload profile picture successfully', async () => {
      const imagePath = path.join(__dirname, '../__mocks__/sample.jpg');
      fs.writeFileSync(imagePath, 'fake image content');

      const res = await request(app)
        .post('/api/v1/users/profile-picture')
        .set('Authorization', `Bearer ${testUser.token}`)
        .attach('profilePicture', imagePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('profilePicture');

      fs.unlinkSync(imagePath);
    });

    it('should fail when file is missing', async () => {
      const res = await request(app)
        .post('/api/v1/users/profile-picture')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No file uploaded/i);
    });

    it('should fail for unauthorized request', async () => {
      const imagePath = path.join(__dirname, '../__mocks__/sample.jpg');
      fs.writeFileSync(imagePath, 'fake image content');

      const res = await request(app)
        .post('/api/v1/users/profile-picture')
        .attach('profilePicture', imagePath);

      expect(res.status).toBe(401);

      fs.unlinkSync(imagePath);
    });
  });
});
