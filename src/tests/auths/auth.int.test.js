// tests/auth.int.test.js
const request = require('supertest');
const { GenericContainer } = require('testcontainers');

jest.setTimeout(60000);

let container;
let app;
let db;
let testUserEmail = 'john@example.com';

const otpStore = {}; // mock OTP memory store

// Mock emailService to skip SMTP and store OTP in memory
jest.mock('../../services/emailService', () => ({
  sendOTPEmail: jest.fn(async (email, otp) => {
    otpStore[email] = otp;
    return { success: true, message: `Mock OTP sent to ${email}` };
  }),
}));

describe('POST /api/v1/auth/signin (Testcontainers)', () => {
  beforeAll(async () => {
    container = await new GenericContainer('postgres:14')
      .withEnvironment({
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(5432);

    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_HOST = host;
    process.env.POSTGRES_PORT = String(port);
    process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

    db = require('../../models');
    await db.sequelize.sync({ force: true });
    app = require('../../app');

    // Seed a user for signin tests
    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Signin User',
      email: 'signin@example.com',
      password: 'validPassword123',
    });
  });

  

  afterAll(async () => {
    if (db && db.sequelize) await db.sequelize.close();
    if (container) await container.stop();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register a user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'John Doe', email: 'john@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
    });

    it('should fail if email already exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'John Doe', email: 'john@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered.');
    });
  });

  describe('POST /api/v1/auth/signin', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'john@example.com', password: 'password123' });

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
        .send({ email: 'john@example.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });

  // Forgot Password + OTP Verification
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send OTP and return 200 for existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/OTP sent successfully/i);
      expect(otpStore[testUserEmail]).toBeDefined();
      expect(otpStore[testUserEmail]).toHaveLength(6);
    });

    it('should return 200 even if user email does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        'message',
        'If that email exists, an OTP has been sent.'
      );
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify OTP successfully', async () => {
      const otp = otpStore[testUserEmail];
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testUserEmail, otp });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/OTP verified successfully/i);
    });

    it('should return 400 for invalid OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testUserEmail, otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid or expired OTP/i);
    });

    it('should return 400 if email or OTP is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: testUserEmail });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

});

