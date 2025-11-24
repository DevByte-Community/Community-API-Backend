const request = require('supertest');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(120000);

describe('Skill Controller (integration)', () => {
  let testManager, app, adminAgent, skillId, user;
  beforeAll(async () => {
    testManager = getTestContainersManager();
    await testManager.setup({ createUsers: false });

    app = testManager.app;
    testManager.getModels();

    adminAgent = request.agent(app);

    // Create a user
    const res = await adminAgent.post('/api/v1/auth/signup').send({
      fullname: 'Admin User',
      email: 'admin@example.com',
      password: 'Password123!',
    });

    admin = res.body.user;

    // promote to admin using model
    const { User } = testManager.getModels();
    await User.update({ role: 'admin' }, { where: { id: admin.id } });

    // create initial skill
    const createRes = await adminAgent
      .post('/api/v1/admin/skills')
      .send({ name: 'Javascript', description: 'original' });

    skillId = createRes.body.skill.id;

  });

  afterAll(async () => {
    await testManager.teardown();
    resetTestContainersManager();
    jest.restoreAllMocks();
  });

  //   ------------- CREATE --------------
  describe('POST /api/v1/admin/skills', () => {
    it('should create a skill sucessfully', async () => {
      const res = await adminAgent
        .post('/api/v1/admin/skills')
        .send({ name: 'Javascript', description: '' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          skill: expect.objectContaining({
            name: 'Javascript',
          }),
        })
      );
    });

    it('should fail if name already exist', async () => {
      const res = await adminAgent
        .post('/api/v1/admin/skills')
        .send({ name: 'Javascript', description: '' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('skill name already exist');
    });

    it('should return 400 on invalid payload', async () => {
      const res = await adminAgent.post('/api/v1/admin/skills').send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Name cannot be empty.');
    });
  });

  //   --------------- UPDATE ------------
  describe('PATCH /api/v1/admin/skills/:id', () => {
    it('should return 200 on successful update', async () => {
      const payload = {
        name: 'Javascript',
        description: 'updated description',
      };
      const res = await adminAgent.patch(`/api/v1/admin/skills/${skillId}`).send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({ message: 'Skill updated successfully', success: true })
      );
    });

    it('should return 400 on invalid payload', async () => {
      const payload = {
        name: '',
        description: '',
      };
      const res = await adminAgent.patch(`/api/v1/admin/skills/${skillId}`).send(payload);

      expect(res.status).toBe(400);
    });
  });

  //   --------------- GET SKILLS -----------
  describe(' GET /api/v1/admin/skills', () => {
    it('should return paginated skills successfully', async () => {
      const res = await adminAgent.get('/api/v1/admin/skills').query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  //   ---------------- DELETE -------------
  describe(' DELETE /api/v1/admin/skills/:id', () => {
    it('should delete skill with valid skill id', async () => {
      const res = await adminAgent.delete(`/api/v1/admin/skills/${skillId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Skill deleted successfully',
      });
    });
  });
});
