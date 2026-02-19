const request = require('supertest');
const app = require('../src/server'); // adjust if your app entry is different
const { sequelize } = require('../src/models'); // Sequelize instance

let adminToken;
let createdPartnerId;

beforeAll(async () => {
  // Ensure DB is migrated and seeded
  await sequelize.sync();

  // Login Maya (seeded admin)
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'maya.admin@example.com',
      password: 'StrongPassword123!',
    });

  adminToken = res.body.token; // adjust if your login response uses a different field
});

afterAll(async () => {
  await sequelize.close();
});

describe('Partner CRUD', () => {
  test('POST /api/v1/partners (admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Test Partner')
      .field('description', 'A partner for testing')
      .field('email', 'testpartner@example.com')
      .attach('logo', Buffer.from('fake image'), 'logo.png');

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    createdPartnerId = res.body.partner.id;
  });

  test('GET /api/v1/partners (public)', async () => {
    const res = await request(app).get('/api/v1/partners');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/v1/partners/:id (public)', async () => {
    const res = await request(app).get(`/api/v1/partners/${createdPartnerId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.partner.id).toBe(createdPartnerId);
  });

  test('PATCH /api/v1/partners/:id (admin only)', async () => {
    const res = await request(app)
      .patch(`/api/v1/partners/${createdPartnerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('description', 'Updated description');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.partner.description).toBe('Updated description');
  });

  test('DELETE /api/v1/partners/:id (admin only)', async () => {
    const res = await request(app)
      .delete(`/api/v1/partners/${createdPartnerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
