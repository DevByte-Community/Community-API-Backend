// tests/preferences.int.test.js
const request = require('supertest');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(120000);

// Mock OTP email service (used in signup)
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, otp) => ({
    success: true,
    message: `Mock OTP ${otp} to ${email}`,
  })),
}));

const TEST_USER = {
  fullname: 'Prefs User',
  email: 'prefs@example.com',
  password: 'Password123!',
};

let testManager;
let app;
let agent;

describe('User preferences (integration)', () => {
  beforeAll(async () => {
    testManager = getTestContainersManager();

    // spin up infra; we don't auto-create users here
    await testManager.setup({ createUsers: false });

    app = testManager.app;
    testManager.getModels();
    agent = request.agent(app);

    // Signup user (sets cookies via auth flow)
    const signupRes = await agent.post('/api/v1/auth/signup').send(TEST_USER);
    expect([200, 201]).toContain(signupRes.status);
  });

  afterAll(async () => {
    await testManager.teardown();
    resetTestContainersManager();
    jest.restoreAllMocks();
  });

  it('PATCH /api/v1/users/me/preferences upserts preferences for the authenticated user', async () => {
    const patchRes = await agent.patch('/api/v1/users/me/preferences').send({
      appearance: 'dark',
      newsletter: false,
      timezone: 'Africa/Douala',
    });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Preferences updated',
        preferences: expect.objectContaining({
          appearance: 'dark',
          newsletter: false,
          timezone: 'Africa/Douala',
          visibility: expect.any(Boolean),
          notification: expect.any(Boolean),
          language: expect.any(String),
        }),
      })
    );
  });

  it('GET /api/v1/users/me/preferences returns current preferences', async () => {
    const res = await agent.get('/api/v1/users/me/preferences');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        visibility: expect.any(Boolean),
        notification: expect.any(Boolean),
        newsletter: expect.any(Boolean),
        appearance: expect.any(String),
        language: expect.any(String),
        timezone: expect.any(String),
      })
    );
  });

  it('Invalid appearance value -> 400', async () => {
    const res = await agent.patch('/api/v1/users/me/preferences').send({ appearance: 'blue' }); // not in [light, dark, system]

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('Unauthenticated user cannot access preferences -> 401/403', async () => {
    const res = await request(app).get('/api/v1/users/me/preferences');
    expect([401, 403]).toContain(res.status);
  });
});
