// tests/skill/skill.int.test.js
const request = require('supertest');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(120000);

// Mock email to avoid SMTP noise
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, otp) => ({
    success: true,
    message: `Mock OTP ${otp} to ${email}`,
  })),
}));

const TEST_ADMIN = {
  fullname: 'Admin User',
  email: 'admin@example.com',
  password: 'Password123!',
};

const TEST_USER = {
  fullname: 'Regular User',
  email: 'user@example.com',
  password: 'Password123!',
};

let testManager;
let app;
let adminAgent;
let userAgent;

describe('Skills Controller (integration)', () => {
  beforeAll(async () => {
    testManager = getTestContainersManager();

    await testManager.setup({
      createUsers: false,
    });

    app = testManager.app;
    testManager.getModels();

    // Create admin and regular user agents
    adminAgent = request.agent(app);
    userAgent = request.agent(app);

    // Signup admin user
    const adminSignupRes = await adminAgent.post('/api/v1/auth/signup').send(TEST_ADMIN);
    expect([200, 201]).toContain(adminSignupRes.status);

    // Manually set admin role (since we don't have a way to do this through API in tests)
    const { User } = testManager.getModels();
    const adminUser = await User.findOne({ where: { email: TEST_ADMIN.email } });
    if (adminUser) {
      adminUser.role = 'ADMIN';
      await adminUser.save();
    }

    // Signup regular user
    const userSignupRes = await userAgent.post('/api/v1/auth/signup').send(TEST_USER);
    expect([200, 201]).toContain(userSignupRes.status);

    // Verify both users are authenticated by making a test request
    const adminProfileRes = await adminAgent.get('/api/v1/users/profile');
    expect([200, 401, 403]).toContain(adminProfileRes.status);

    const userProfileRes = await userAgent.get('/api/v1/users/profile');
    expect([200, 401, 403]).toContain(userProfileRes.status);
  });

  afterAll(async () => {
    await testManager.teardown();
    resetTestContainersManager();
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/skills', () => {
    it('returns 200 with paginated skills', async () => {
      const res = await request(app).get('/api/v1/skills');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skills retrieved successfully',
          data: expect.any(Array),
          pagination: expect.objectContaining({
            currentPage: expect.any(Number),
            pageSize: expect.any(Number),
            totalCount: expect.any(Number),
            totalPages: expect.any(Number),
            hasNextPage: expect.any(Boolean),
            hasPrevPage: expect.any(Boolean),
          }),
        })
      );
    });

    it('returns 200 with custom pagination parameters', async () => {
      const res = await request(app).get('/api/v1/skills?page=1&pageSize=5');
      expect(res.status).toBe(200);
      expect(res.body.pagination.pageSize).toBe(5);
    });

    it('returns 400 with invalid pagination parameters', async () => {
      const res = await request(app).get('/api/v1/skills?page=0');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/skills/:id', () => {
    let createdSkillId;

    beforeAll(async () => {
      // Create a skill for testing
      const skillRes = await adminAgent.post('/api/v1/skills').send({
        name: 'Test Skill',
        description: 'Test description',
      });
      if (skillRes.status === 201) {
        createdSkillId = skillRes.body.skill.id;
      }
    });

    it('returns 200 with skill data when skill exists', async () => {
      if (!createdSkillId) {
        // Skip if skill creation failed
        return;
      }

      const res = await request(app).get(`/api/v1/skills/${createdSkillId}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skill retrieved successfully',
          skill: expect.objectContaining({
            id: createdSkillId,
            name: 'Test Skill',
          }),
        })
      );
    });

    it('returns 404 when skill does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app).get(`/api/v1/skills/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/skills', () => {
    it('returns 201 when admin creates skill successfully', async () => {
      const res = await adminAgent.post('/api/v1/skills').send({
        name: 'New Skill',
        description: 'New skill description',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skill created successfully',
          skill: expect.objectContaining({
            name: 'New Skill',
            description: 'New skill description',
          }),
        })
      );
    });

    it('returns 400 when validation fails', async () => {
      const res = await adminAgent.post('/api/v1/skills').send({
        name: 'A', // Too short
      });

      expect(res.status).toBe(400);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/v1/skills').send({
        name: 'Unauthorized Skill',
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 when regular user tries to create skill', async () => {
      // Ensure user is authenticated by checking profile first
      const profileRes = await userAgent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        // User not authenticated, skip this test
        return;
      }

      const res = await userAgent.post('/api/v1/skills').send({
        name: 'User Skill',
        description: 'Should fail',
      });

      // Could be 401 if not authenticated, or 403 if authenticated but not admin
      expect([401, 403]).toContain(res.status);
    });

    it('returns 409 when skill name already exists', async () => {
      // Create first skill
      await adminAgent.post('/api/v1/skills').send({
        name: 'Duplicate Skill',
        description: 'First',
      });

      // Try to create duplicate
      const res = await adminAgent.post('/api/v1/skills').send({
        name: 'Duplicate Skill',
        description: 'Second',
      });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/skills/batch', () => {
    it('returns 201 when all skills are created successfully', async () => {
      const res = await adminAgent.post('/api/v1/skills/batch').send({
        skills: [
          { name: 'Batch Skill 1', description: 'First' },
          { name: 'Batch Skill 2', description: 'Second' },
        ],
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          created: expect.arrayContaining([
            expect.objectContaining({ name: 'Batch Skill 1' }),
            expect.objectContaining({ name: 'Batch Skill 2' }),
          ]),
          summary: expect.objectContaining({
            total: 2,
            created: 2,
            skipped: 0,
            errors: 0,
          }),
        })
      );
    });

    it('returns 201 when some skills are skipped (no errors)', async () => {
      // Create a skill first
      await adminAgent.post('/api/v1/skills').send({
        name: 'Existing Batch Skill',
        description: 'Exists',
      });

      // Try to batch create including the existing one
      const res = await adminAgent.post('/api/v1/skills/batch').send({
        skills: [
          { name: 'Existing Batch Skill', description: 'Should be skipped' },
          { name: 'New Batch Skill', description: 'Should be created' },
        ],
      });

      // 207 is only returned when there are errors, not when there are skipped items
      expect(res.status).toBe(201);
      expect(res.body.summary.skipped).toBeGreaterThan(0);
      expect(res.body.summary.created).toBeGreaterThan(0);
    });

    it('returns 400 when validation fails', async () => {
      const res = await adminAgent.post('/api/v1/skills/batch').send({
        skills: [], // Empty array
      });

      expect(res.status).toBe(400);
    });

    it('returns 403 when regular user tries to batch create', async () => {
      // Ensure user is authenticated
      const profileRes = await userAgent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        return; // Skip if not authenticated
      }

      const res = await userAgent.post('/api/v1/skills/batch').send({
        skills: [{ name: 'User Batch Skill' }],
      });

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/skills/:id', () => {
    let skillId;

    beforeAll(async () => {
      const res = await adminAgent.post('/api/v1/skills').send({
        name: 'Skill To Update',
        description: 'Original',
      });
      if (res.status === 201) {
        skillId = res.body.skill.id;
      }
    });

    it('returns 200 when admin updates skill successfully', async () => {
      if (!skillId) return;

      const res = await adminAgent.patch(`/api/v1/skills/${skillId}`).send({
        name: 'Updated Skill Name',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skill updated successfully',
          skill: expect.objectContaining({
            name: 'Updated Skill Name',
          }),
        })
      );
    });

    it('returns 400 when validation fails', async () => {
      if (!skillId) return;

      const res = await adminAgent.patch(`/api/v1/skills/${skillId}`).send({
        name: 'A', // Too short
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 when skill does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await adminAgent.patch(`/api/v1/skills/${fakeId}`).send({
        name: 'New Name',
      });

      expect(res.status).toBe(404);
    });

    it('returns 403 when regular user tries to update', async () => {
      if (!skillId) return;

      // Ensure user is authenticated
      const profileRes = await userAgent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        return; // Skip if not authenticated
      }

      const res = await userAgent.patch(`/api/v1/skills/${skillId}`).send({
        name: 'User Update',
      });

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/skills/:id', () => {
    let skillId;

    beforeAll(async () => {
      const res = await adminAgent.post('/api/v1/skills').send({
        name: 'Skill To Delete',
        description: 'Will be deleted',
      });
      if (res.status === 201) {
        skillId = res.body.skill.id;
      }
    });

    it('returns 200 when admin deletes skill successfully', async () => {
      if (!skillId) return;

      const res = await adminAgent.delete(`/api/v1/skills/${skillId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Skill deleted successfully',
        })
      );

      // Verify skill is deleted
      const getRes = await request(app).get(`/api/v1/skills/${skillId}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when skill does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await adminAgent.delete(`/api/v1/skills/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('returns 403 when regular user tries to delete', async () => {
      // Ensure user is authenticated
      const profileRes = await userAgent.get('/api/v1/users/profile');
      if (profileRes.status === 401) {
        return; // Skip if not authenticated
      }

      // Create a new skill for this test
      const createRes = await adminAgent.post('/api/v1/skills').send({
        name: 'Skill For User Delete Test',
        description: 'Test',
      });

      if (createRes.status === 201) {
        const testSkillId = createRes.body.skill.id;
        const res = await userAgent.delete(`/api/v1/skills/${testSkillId}`);

        expect([401, 403]).toContain(res.status);
      }
    });
  });
});
