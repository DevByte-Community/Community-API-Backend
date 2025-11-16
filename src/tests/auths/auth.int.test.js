// tests/auth.int.test.js
const request = require('supertest');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(120000);

// Mock OTP email service
const otpStore = {};
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, otp) => {
    otpStore[email] = otp;
    return { success: true, message: `Mock OTP sent to ${email}` };
  }),
}));

const TEST_USER = {
  fullname: 'Refresh User',
  email: 'refresh@example.com',
  password: 'validPassword123',
};
const testUserEmail = 'john@example.com';
const testUserPassword = 'validPassword123';

let testManager;
let app;
let db;
let agent;

describe('POST /api/v1/auth/** (Testcontainers)', () => {
  beforeAll(async () => {
    testManager = getTestContainersManager();

    // Spin up infra and seed users
    await testManager.setup({
      createUsers: false, // we will sign up manually here
    });

    app = testManager.app;
    db = testManager.getModels();

    agent = request.agent(app); // required for cookies persistence

    // Seed users for signin/forgot tests
    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Signin User',
      email: 'signin@example.com',
      password: testUserPassword,
    });

    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'John Doe',
      email: testUserEmail,
      password: 'validPassword123',
    });

    // Seed the refresh test user WITH persistent cookies
    await agent.post('/api/v1/auth/signup').send(TEST_USER);
  });

  afterAll(async () => {
    await testManager.teardown();
    resetTestContainersManager();
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register a user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ fullname: 'John Doe', email: 'john@yahoo.com', password: 'password123' });

      expect(res.status).toBe(201);
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
      expect(res.body).toHaveProperty('message');
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

  // REFRESH TOKEN FLOW
  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh cookie', async () => {
      const res = await agent.post('/api/v1/auth/refresh');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Tokens refreshed successfully');

      const newCookies = res.headers['set-cookie'];
      const newAccess = extractCookie(newCookies, 'access_token');
      const newRefresh = extractCookie(newCookies, 'refresh_token');

      expect(newAccess).toBeDefined();
      expect(newRefresh).toBeDefined();
    });

    it('should return 401 if refresh token cookie is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh'); // no agent → no cookies

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Refresh token missing');
    });

    it('should return 401 if refresh token is invalid', async () => {
      // Create a fresh agent with ONLY the invalid token
      const invalidAgent = request.agent(app);

      // Manually set an invalid refresh token
      invalidAgent.jar.setCookie('refresh_token=invalid.jwt.token; Path=/; HttpOnly; Secure');
      const res = await invalidAgent.post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Refresh token missing');
    });

    it('should return 401 if user is deleted (token valid but user gone)', async () => {
      // Delete user
      await db.User.destroy({ where: { email: TEST_USER.email } });

      const res = await agent.post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 401 if refresh token is expired', async () => {
      // 1. Sign up to get valid cookies
      const signupRes = await agent.post('/api/v1/auth/signup').send({
        ...TEST_USER,
        email: 'refresh-expired@example.com',
      });

      const validRefreshToken = extractCookie(signupRes.headers['set-cookie'], 'refresh_token');
      expect(validRefreshToken).toBeDefined();

      // 2. Create an EXPIRED JWT manually
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'fake-user-id', email: 'fake@example.com' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '-1s' } // expired 1 second ago
      );

      // 3. Use a fresh agent with ONLY the expired token
      const expiredAgent = request.agent(app);
      expiredAgent.jar.setCookie(`refresh_token=${expiredToken}; Path=/; HttpOnly`);

      // 4. Call refresh
      const res = await expiredAgent.post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired refresh token');
    });
  });
});

function extractCookie(cookies, name) {
  if (!cookies) return null;
  const cookie = cookies.find((c) => c.includes(name));
  if (!cookie) return null;
  return cookie.split(';')[0].split('=')[1];
}
