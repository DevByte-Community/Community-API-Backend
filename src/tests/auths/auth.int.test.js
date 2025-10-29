// tests/auth.int.test.js
const request = require('supertest');
const { GenericContainer } = require('testcontainers');

jest.setTimeout(60000);

let postgresContainer;
let redisContainer;
let app;
let db;
let redisClientModule;
const testUserEmail = 'john@example.com';
const testUserPassword = 'validPassword123';

const otpStore = {}; // mock OTP memory store

// Mock emailService to skip SMTP and store OTP in memory
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, otp) => {
    otpStore[email] = otp;
    return { success: true, message: `Mock OTP sent to ${email}` };
  }),
}));

describe('POST /api/v1/auth/signin (Testcontainers)', () => {
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

    const postgresHost = postgresContainer.getHost();
    const postgresPort = postgresContainer.getMappedPort(5432);
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);

    // Set environment variables for PostgreSQL
    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_HOST = postgresHost;
    process.env.POSTGRES_PORT = String(postgresPort);
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

    // Set environment variables for Redis
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = String(redisPort);
    process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

    // Maintenant qu'on a les bonnes variables d'env, on peut initialiser Redis
    redisClientModule = require('../../utils/redisClient');
    redisClientModule.initializeRedisClient(process.env.REDIS_URL);

    // Attendre que Redis soit prêt
    await redisClientModule.client.connect();

    db = require('../../models');
    await db.sequelize.sync({ force: true });
    app = require('../../app');

    // Seed a user for signin tests
    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Signin User',
      email: 'signin@example.com',
      password: testUserPassword,
    });

    // Seed a user for forgot password tests
    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'John Doe',
      email: testUserEmail, // 'john@example.com'
      password: 'validPassword123',
    });
  });

  afterAll(async () => {
    if (db && db.sequelize) await db.sequelize.close();
    if (redisClientModule) await redisClientModule.disconnect();
    if (postgresContainer) await postgresContainer.stop();
    if (redisContainer) await redisContainer.stop();
    jest.restoreAllMocks(); // Restore any global mocks
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register a user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'John Doe', email: 'john@yahoo.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
    });

    it('should fail if email already exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'John Doe', email: 'john@yahoo.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered.');
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'Jane Doe', email: 'invalid-email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should fail with password less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'Jane Doe', email: 'jane@example.com', password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/signin', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'john@yahoo.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
    });

    it('should fail with wrong email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'johnCena@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'john@yahoo.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });

  // Forgot Password
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send OTP and return 200 for existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch('An OTP has been sent to your email successfully');
      expect(otpStore[testUserEmail]).toBeDefined();
      expect(otpStore[testUserEmail]).toHaveLength(6);
    });

    it('should return 200 even if user email does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  //  Verify OTP
  describe('POST /api/v1/auth/verify-otp', () => {
    beforeEach(async () => {
      // Ensure an OTP is generated for the test user
      await request(app).post('/api/v1/auth/forgot-password').send({ email: testUserEmail });
    });

    it('should verify OTP and reset password, returning 200 for valid OTP', async () => {
      const otp = otpStore[testUserEmail];
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testUserEmail, otp });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/Verified otp successfully/i);
    });

    it('should return 400 for invalid OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testUserEmail, otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/Invalid or expired OTP/i);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/api/v1/auth/verify-otp').send({ email: testUserEmail });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 400 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'nonexistent@example.com', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/Invalid or expired OTP/i);
    });
  });

  // Reset Password
  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password and return 200 for correct current password', async () => {
      const newPassword = 'newPassword456';
      const res = await request(app).post('/api/v1/auth/reset-password').send({
        email: testUserEmail,
        new_password: newPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/Password reset successful/i);

      // Verify the password was updated by attempting to sign in
      const signinRes = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: testUserEmail, password: newPassword });
      expect(signinRes.status).toBe(200);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ email: testUserEmail });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 404 for non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/reset-password').send({
        email: 'nonexistent@example.com',
        new_password: 'newPassword456',
      });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/User not found/i);
    });
  });
});
