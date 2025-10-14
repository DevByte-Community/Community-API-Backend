// tests/user.int.test.js
const request = require('supertest');
const { GenericContainer } = require('testcontainers');
const jwt = require('jsonwebtoken');
const redisClient = require('../../utils/redisClient');

jest.setTimeout(60000);

let postgresContainer;
let redisContainer;
let app;
let db;
let token;
let testUser;

describe('User Profile Integration Tests (Testcontainers)', () => {
  beforeAll(async () => {
    // Start PostgreSQL
    postgresContainer = await new GenericContainer('postgres:14')
      .withEnvironment({
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis
    redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();

    const postgresHost = postgresContainer.getHost();
    const postgresPort = postgresContainer.getMappedPort(5432);
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);

    // Env vars
    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_HOST = postgresHost;
    process.env.POSTGRES_PORT = String(postgresPort);
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = String(redisPort);

    // Initialize DB + app
    db = require('../../models');
    await db.sequelize.sync({ force: true });
    app = require('../../app');

    // Create a test user
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullname: 'Profile User',
        email: 'profile@example.com',
        password: 'password123',
      });

    token = res.body.access_token;

    // Fetch created user
    testUser = await db.User.findOne({ where: { email: 'profile@example.com' } });
  });

  afterAll(async () => {
    if (db && db.sequelize) await db.sequelize.close();
    if (postgresContainer) await postgresContainer.stop();
    if (redisContainer) await redisContainer.stop();
    await redisClient.disconnect();
    jest.restoreAllMocks();
  });

  describe('PATCH /api/v1/user/profile', () => {
    it('should update fullname successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullname: 'Updated User' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.user.fullname).toBe('Updated User');
    });

    it('should fail if email already exists', async () => {
      // Create another user to cause a conflict
      await request(app).post('/api/v1/auth/signup').send({
        fullname: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
      });

      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'existing@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already in use');
    });

    it('should return 400 if no fields are provided', async () => {
      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Validation failed/i);
    });

    it('should return 404 if user not found', async () => {
      // Delete user manually from DB
      await db.User.destroy({ where: { id: testUser.id } });

      const res = await request(app)
        .patch('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullname: 'Ghost User' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });
});
