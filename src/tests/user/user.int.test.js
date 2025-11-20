// tests/user/user.controller.int.test.js
const request = require('supertest');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(120000);

// Mock email to avoid SMTP noise in signup or other flows
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, otp) => ({
    success: true,
    message: `Mock OTP ${otp} to ${email}`,
  })),
}));

const TEST_USER = {
  fullname: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Password123!',
};

let testManager;
let app;
let agent;

describe('Users Controller (integration)', () => {
  beforeAll(async () => {
    testManager = getTestContainersManager();

    // Start containers + env + Redis + MinIO + DB
    // We don't need seeded users here because we’ll sign up through the API
    await testManager.setup({
      createUsers: false,
    });

    app = testManager.app;
    testManager.getModels();

    // Persist cookies across requests
    agent = request.agent(app);

    // Signup via API to get valid auth cookies for profile endpoint
    const signupRes = await agent.post('/api/v1/auth/signup').send(TEST_USER);
    expect([200, 201]).toContain(signupRes.status);
  });

  afterAll(async () => {
    await testManager.teardown();
    resetTestContainersManager();
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/users/profile', () => {
    it('returns profile with skills[]', async () => {
      const res = await agent.get('/api/v1/users/profile');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            email: TEST_USER.email,
            fullname: TEST_USER.fullname,
            skills: expect.any(Array),
          }),
        })
      );
    });

    it('401 without cookies', async () => {
      const res = await request(app).get('/api/v1/users/profile');
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/users/profile', () => {
    it('200 when payload satisfies schema', async () => {
      // Ensure keys match your Joi updateProfileSchema
      const payload = {
        fullname: 'Jane Updated',
      };
      const res = await agent.patch('/api/v1/users/profile').send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            fullname: 'Jane Updated',
          }),
        })
      );
    });

    it('400 on invalid payload', async () => {
      const res = await agent.patch('/api/v1/users/profile').send({ fullname: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/users/profile/picture', () => {
    it('200 on successful multipart upload (MinIO)', async () => {
      const img = Buffer.from('89504E470D0A1A0A', 'hex'); // tiny png-like bytes

      const res = await agent
        .patch('/api/v1/users/profile/picture')
        .attach('profile_picture', img, { filename: 'avatar.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            profilePicture: expect.any(String),
          }),
        })
      );
    });

    it('400 when no file attached', async () => {
      const res = await agent.patch('/api/v1/users/profile/picture');
      expect([400, 422]).toContain(res.status);
    });
  });
});
