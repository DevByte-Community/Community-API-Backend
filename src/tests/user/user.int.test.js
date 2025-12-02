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

  describe('DELETE /api/v1/users/account', () => {
    it('deletes the account with correct password and prevents further access', async () => {
      const res = await agent.delete('/api/v1/users/account').send({ reason: 'privacy' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Your account have been permanently deleted',
      });

      // Cookies should be cleared (Set-Cookie headers for access/refresh)
      const setCookieHeaders = res.headers['set-cookie'] || [];
      const cookieHeaderStr = setCookieHeaders.join(';');
      expect(cookieHeaderStr).toContain('access_token=');
      expect(cookieHeaderStr).toContain('refresh_token=');

      // Further authenticated calls should fail (cookies were cleared)
      const profileRes = await agent.get('/api/v1/users/profile');
      expect([401, 404]).toContain(profileRes.status);
    });

    it('returns 404/401 on second delete attempt for same user', async () => {
      // Create a new user and login with a fresh agent
      const localAgent = request.agent(app);
      const email = 'delete-twice@example.com';
      const password = 'Password123!';

      const signupRes = await localAgent.post('/api/v1/auth/signup').send({
        fullname: 'Delete Twice',
        email,
        password,
      });
      expect([200, 201]).toContain(signupRes.status);

      // First delete → should succeed
      const firstDelete = await localAgent
        .delete('/api/v1/users/account')
        .send({ password, reason: 'privacy' });
      expect(firstDelete.status).toBe(200);

      // Second delete → should be 404 or 401
      const secondDelete = await localAgent
        .delete('/api/v1/users/account')
        .send({ password, reason: 'privacy' });
      expect([404, 401]).toContain(secondDelete.status);
    });

    it('requires authentication (no cookies → 401/403)', async () => {
      const res = await request(app)
        .delete('/api/v1/users/account')
        .send({ password: 'anything', reason: 'privacy' });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('PUT /api/v1/users/password', () => {
    it('✅ Happy path: correct current → new password → 200', async () => {
      const signupRes = await agent.post('/api/v1/auth/signup').send(TEST_USER);
      expect([200, 201]).toContain(signupRes.status);

      const res = await agent.put('/api/v1/users/password').send({
        currentPassword: TEST_USER.password,
        newPassword: 'NewPassword456!',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Password updated successfully',
      });
    });

    it('❌ Wrong current password → 400', async () => {
      const res = await agent.put('/api/v1/users/password').send({
        currentPassword: 'CompletelyWrong123!',
        newPassword: 'WhateverNew123!',
      });

      expect(res.status).toBe(400);
    });

    it('❌ New password same as old → 400', async () => {
      const localAgent = request.agent(app);
      const email = 'same-as-old@example.com';
      const password = 'SamePassword123!';

      // Signup new user
      const signupRes = await localAgent.post('/api/v1/auth/signup').send({
        fullname: 'Same As Old',
        email,
        password,
      });
      expect([200, 201]).toContain(signupRes.status);

      const res = await localAgent.put('/api/v1/users/password').send({
        currentPassword: password,
        newPassword: password,
        confirmPassword: password,
      });

      expect(res.status).toBe(400);
    });

    it('❌ Too short password → 400', async () => {
      const localAgent = request.agent(app);
      const email = 'short-pass@example.com';
      const password = 'ValidPass123!';

      const signupRes = await localAgent.post('/api/v1/auth/signup').send({
        fullname: 'Short Pass',
        email,
        password,
      });
      expect([200, 201]).toContain(signupRes.status);

      const res = await localAgent.put('/api/v1/users/password').send({
        currentPassword: password,
        newPassword: 'short', // < 8 chars
      });

      expect(res.status).toBe(400);
    });

    it('❌ Unauthenticated → 401/403', async () => {
      const res = await request(app).put('/api/v1/users/password').send({
        currentPassword: 'anything',
        newPassword: 'NewPassword123!',
      });

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('GET /api/v1/users', () => {
    beforeEach(async () => {
      // Create multiple test users for pagination testing via API
      const users = [];
      for (let i = 1; i <= 15; i++) {
        users.push({
          fullname: `User ${i}`,
          email: `user${i}@example.com`,
          password: 'Password123!',
        });
      }

      // Create users via signup to ensure proper setup
      for (const userData of users) {
        await request(app).post('/api/v1/auth/signup').send(userData);
      }
    });

    it('should return paginated users with default pagination', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Users retrieved successfully',
          data: expect.any(Array),
          pagination: expect.objectContaining({
            currentPage: 1,
            pageSize: 10,
            totalCount: expect.any(Number),
            totalPages: expect.any(Number),
            hasNextPage: expect.any(Boolean),
            hasPrevPage: expect.any(Boolean),
          }),
        })
      );

      // Should not include password in response
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).not.toHaveProperty('password');
      }
    });

    it('should return users with custom page and pageSize', async () => {
      const res = await request(app).get('/api/v1/users?page=2&pageSize=5');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual(
        expect.objectContaining({
          currentPage: 2,
          pageSize: 5,
        })
      );
    });

    it('should return 400 for invalid page number', async () => {
      const res = await request(app).get('/api/v1/users?page=0');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid pageSize (too high)', async () => {
      const res = await request(app).get('/api/v1/users?pageSize=101');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid pageSize (negative)', async () => {
      const res = await request(app).get('/api/v1/users?pageSize=-1');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return correct pagination metadata', async () => {
      const res = await request(app).get('/api/v1/users?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body.pagination.totalCount).toBeGreaterThanOrEqual(0);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.pagination.hasNextPage).toBe('boolean');
      expect(typeof res.body.pagination.hasPrevPage).toBe('boolean');
    });

    it('should return empty array when no users exist', async () => {
      // Clean up all users
      const db = testManager.getModels();
      await db.User.destroy({ where: {}, force: true });

      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.totalCount).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
    });
  });

  describe('GET /api/v1/users/me/skills', () => {
    it('returns 200 with user skills array', async () => {
      // Ensure agent is authenticated
      const profileRes = await agent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        // Re-signup if needed
        await agent.post('/api/v1/auth/signup').send(TEST_USER);
      }

      const res = await agent.get('/api/v1/users/me/skills');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'User skills retrieved successfully',
          skills: expect.any(Array),
          count: expect.any(Number),
        })
      );
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me/skills');
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/v1/users/me/skills', () => {
    let skillId;

    beforeAll(async () => {
      // Ensure agent is authenticated
      const profileRes = await agent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        await agent.post('/api/v1/auth/signup').send(TEST_USER);
      }

      // Create a skill first (need admin for this)
      // For testing, we'll create a skill directly in the database
      const { Skill } = testManager.getModels();
      const skill = await Skill.create({
        name: 'Test Skill for User',
        description: 'Test description',
      });
      skillId = skill.id;
    });

    it('returns 200 when skill is added successfully', async () => {
      if (!skillId) return;

      // Ensure agent is authenticated
      const profileRes = await agent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        await agent.post('/api/v1/auth/signup').send(TEST_USER);
      }

      const res = await agent.post('/api/v1/users/me/skills').send({
        skillId: skillId,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skill added to your profile successfully',
          skill: expect.objectContaining({
            id: skillId,
            name: 'Test Skill for User',
          }),
        })
      );
    });

    it('returns 400 when skillId is invalid', async () => {
      const res = await agent.post('/api/v1/users/me/skills').send({
        skillId: 'invalid-uuid',
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 when skill does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await agent.post('/api/v1/users/me/skills').send({
        skillId: fakeId,
      });

      expect(res.status).toBe(404);
    });

    it('returns 409 when user already has the skill', async () => {
      if (!skillId) return;

      // Try to add the same skill again
      const res = await agent.post('/api/v1/users/me/skills').send({
        skillId: skillId,
      });

      expect(res.status).toBe(409);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/v1/users/me/skills').send({
        skillId: 'some-skill-id',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/users/me/skills/:skillId', () => {
    let skillId;

    beforeAll(async () => {
      // Create a skill and add it to user
      const { Skill, UserSkills } = testManager.getModels();
      const { User } = testManager.getModels();

      const user = await User.findOne({ where: { email: TEST_USER.email } });
      const skill = await Skill.create({
        name: 'Skill To Remove',
        description: 'Will be removed',
      });

      await UserSkills.create({
        userId: user.id,
        skillId: skill.id,
      });

      skillId = skill.id;
    });

    it('returns 200 when skill is removed successfully', async () => {
      if (!skillId) return;

      // Ensure agent is authenticated
      const profileRes = await agent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        await agent.post('/api/v1/auth/signup').send(TEST_USER);
      }

      const res = await agent.delete(`/api/v1/users/me/skills/${skillId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skill removed from your profile successfully',
        })
      );

      // Verify skill is removed
      const getRes = await agent.get('/api/v1/users/me/skills');
      if (getRes.status === 200) {
        const skillIds = getRes.body.skills.map((s) => s.id);
        expect(skillIds).not.toContain(skillId);
      }
    });

    it('returns 404 when user does not have the skill', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await agent.delete(`/api/v1/users/me/skills/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).delete('/api/v1/users/me/skills/some-skill-id');

      expect(res.status).toBe(401);
    });
  });
});
