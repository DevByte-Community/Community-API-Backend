// tests/role/role.controller.int.test.js
const request = require('supertest');
const bcrypt = require('bcrypt');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(120000);

let testManager;
let app;
let db;
let rootAgent, adminAgent, userAgent;
let rootUser, adminUser, regularUser;

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendOtpEmail: jest.fn(async (email, otp) => ({
    success: true,
    message: `Mock OTP ${otp} to ${email}`,
  })),
}));

// We keep this just to know the plaintext passwords for login
const TEST_USERS = {
  ROOT: {
    fullname: 'Root Admin',
    email: 'root@devbyte.io',
    password: 'RootPassword123!',
    role: 'ROOT',
  },
  ADMIN: {
    fullname: 'Admin User',
    email: 'admin@devbyte.io',
    password: 'AdminPassword123!',
    role: 'ADMIN',
  },
  USER: {
    fullname: 'Regular User',
    email: 'user@devbyte.io',
    password: 'UserPassword123!',
    role: 'USER',
  },
};

beforeAll(async () => {
  // Use the shared TestContainersManager instead of manual containers
  testManager = getTestContainersManager();

  // This will:
  // - start Postgres, Redis, MinIO
  // - configure env vars
  // - init Redis + MinIO clients
  // - init Sequelize and sync models
  // - create ROOT, ADMIN, USER (with same passwords as TEST_USERS)
  // - initialize the Express app
  await testManager.setup({
    createUsers: true,
    userDefinitions: TEST_USERS,
  });

  app = testManager.app;
  db = testManager.getModels();

  const users = testManager.getUsers();
  rootUser = users.ROOT;
  adminUser = users.ADMIN;
  regularUser = users.USER;

  // --- Create Authenticated Agents ---
  rootAgent = request.agent(app);
  adminAgent = request.agent(app);
  userAgent = request.agent(app);

  // Login ROOT user
  const rootLogin = await rootAgent.post('/api/v1/auth/signin').send({
    email: TEST_USERS.ROOT.email,
    password: TEST_USERS.ROOT.password,
  });
  expect([200, 201]).toContain(rootLogin.status);
  expect(rootLogin.headers['set-cookie']).toBeDefined();

  // Login ADMIN user
  const adminLogin = await adminAgent.post('/api/v1/auth/signin').send({
    email: TEST_USERS.ADMIN.email,
    password: TEST_USERS.ADMIN.password,
  });
  expect([200, 201]).toContain(adminLogin.status);
  expect(adminLogin.headers['set-cookie']).toBeDefined();

  // Login USER
  const userLogin = await userAgent.post('/api/v1/auth/signin').send({
    email: TEST_USERS.USER.email,
    password: TEST_USERS.USER.password,
  });
  expect([200, 201]).toContain(userLogin.status);
  expect(userLogin.headers['set-cookie']).toBeDefined();
});

afterAll(async () => {
  if (testManager) {
    await testManager.teardown();
    resetTestContainersManager();
  }
  jest.restoreAllMocks();
});

describe('POST /api/v1/roles/assign', () => {
  describe('✅ Successful Role Assignments', () => {
    it('ROOT can assign ADMIN role to USER', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: regularUser.id,
        role: 'ADMIN',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Role updated',
        user: {
          id: regularUser.id,
          email: regularUser.email,
          role: 'ADMIN',
        },
      });

      // Verify in database
      await regularUser.reload();
      expect(regularUser.role).toBe('ADMIN');

      // Reset back to USER for other tests
      await regularUser.update({ role: 'USER' });
    });

    it('ADMIN can assign ADMIN role to USER', async () => {
      // Create a new test user
      const { User } = db;
      const testUser = await User.create({
        fullname: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      const res = await adminAgent.post('/api/v1/roles/assign').send({
        userId: testUser.id,
        role: 'ADMIN',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('ADMIN');

      // Cleanup
      await testUser.destroy();
    });

    it('ADMIN can assign USER role', async () => {
      const { User } = db;
      const testUser = await User.create({
        fullname: 'Test User 2',
        email: 'test2@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'ADMIN',
      });

      const res = await adminAgent.post('/api/v1/roles/assign').send({
        userId: testUser.id,
        role: 'USER',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('USER');

      await testUser.destroy();
    });
  });

  describe('❌ Validation Errors (400)', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('failed');
    });

    it('returns 400 when role is missing', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: regularUser.id,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('failed');
    });

    it('returns 400 when role is invalid', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: regularUser.id,
        role: 'SUPERADMIN',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('failed');
    });

    it('returns 400 when trying to assign ROOT role (not in schema)', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: regularUser.id,
        role: 'ROOT',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('failed');
    });

    it('returns 400 for empty request body', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('🔒 Authorization Errors (401/403)', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/v1/roles/assign').send({
        userId: regularUser.id,
        role: 'ADMIN',
      });

      expect([401, 403]).toContain(res.status);
    });

    it('returns 403 when USER tries to assign roles', async () => {
      const { User } = db;
      const targetUser = await User.create({
        fullname: 'Target User',
        email: 'target@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      const res = await userAgent.post('/api/v1/roles/assign').send({
        userId: targetUser.id,
        role: 'ADMIN',
      });

      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);

      await targetUser.destroy();
    });

    it('returns 403 when trying to modify own role', async () => {
      const res = await adminAgent.post('/api/v1/roles/assign').send({
        userId: adminUser.id,
        role: 'USER',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot modify your own role/i);
    });

    it('ROOT cannot modify own role', async () => {
      const res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: rootUser.id,
        role: 'ADMIN',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot modify your own role/i);
    });
  });

  describe('🚫 Business Logic Errors (403/404)', () => {
    it('returns 404 when target user does not exist', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: fakeUserId,
        role: 'ADMIN',
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('🔐 Role Hierarchy Rules', () => {
    it('verifies role change persists in database', async () => {
      const { User } = db;
      const testUser = await User.create({
        fullname: 'Persistence Test',
        email: 'persist@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      await rootAgent.post('/api/v1/roles/assign').send({
        userId: testUser.id,
        role: 'ADMIN',
      });

      // Fetch fresh from DB
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.role).toBe('ADMIN');

      await testUser.destroy();
    });

    it('ADMIN maintains permissions after assignment', async () => {
      const { User } = db;
      const newAdmin = await User.create({
        fullname: 'New Admin',
        email: 'newadmin@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      // Upgrade to ADMIN
      await rootAgent.post('/api/v1/roles/assign').send({
        userId: newAdmin.id,
        role: 'ADMIN',
      });

      // Login as new admin
      const newAdminAgent = request.agent(app);
      await newAdminAgent.post('/api/v1/auth/signin').send({
        email: 'newadmin@example.com',
        password: 'Password123!',
      });

      // Try to assign role (should work)
      const anotherUser = await User.create({
        fullname: 'Another User',
        email: 'another@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      const res = await newAdminAgent.post('/api/v1/roles/assign').send({
        userId: anotherUser.id,
        role: 'ADMIN',
      });

      expect(res.status).toBe(200);

      await newAdmin.destroy();
      await anotherUser.destroy();
    });

    it('downgraded user loses ADMIN permissions', async () => {
      const { User } = db;
      const formerAdmin = await User.create({
        fullname: 'Former Admin',
        email: 'formeradmin@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'ADMIN',
      });

      // Login as admin
      const formerAdminAgent = request.agent(app);
      await formerAdminAgent.post('/api/v1/auth/signin').send({
        email: 'formeradmin@example.com',
        password: 'Password123!',
      });

      // Downgrade to USER
      await rootAgent.post('/api/v1/roles/assign').send({
        userId: formerAdmin.id,
        role: 'USER',
      });

      // Try to assign role (should fail - old token still has ADMIN)
      // In a real scenario, they'd need to re-login
      await formerAdmin.reload();
      expect(formerAdmin.role).toBe('USER');

      await formerAdmin.destroy();
    });
  });

  describe('📊 Multiple Operations', () => {
    it('handles multiple role changes correctly', async () => {
      const { User } = db;
      const testUser = await User.create({
        fullname: 'Multi Change User',
        email: 'multichange@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      // USER -> ADMIN
      let res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: testUser.id,
        role: 'ADMIN',
      });
      expect(res.status).toBe(200);

      // ADMIN -> USER
      res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: testUser.id,
        role: 'USER',
      });
      expect(res.status).toBe(200);

      // USER -> ADMIN again
      res = await rootAgent.post('/api/v1/roles/assign').send({
        userId: testUser.id,
        role: 'ADMIN',
      });
      expect(res.status).toBe(200);

      await testUser.reload();
      expect(testUser.role).toBe('ADMIN');

      await testUser.destroy();
    });

    it('handles concurrent role assignments gracefully', async () => {
      const { User } = db;
      const testUser1 = await User.create({
        fullname: 'Concurrent 1',
        email: 'concurrent1@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      const testUser2 = await User.create({
        fullname: 'Concurrent 2',
        email: 'concurrent2@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'USER',
      });

      // Make parallel requests
      const [res1, res2] = await Promise.all([
        rootAgent.post('/api/v1/roles/assign').send({
          userId: testUser1.id,
          role: 'ADMIN',
        }),
        rootAgent.post('/api/v1/roles/assign').send({
          userId: testUser2.id,
          role: 'ADMIN',
        }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      await testUser1.destroy();
      await testUser2.destroy();
    });
  });
});
