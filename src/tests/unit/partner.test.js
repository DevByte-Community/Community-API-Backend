const request = require('supertest');
const app = require('../../src/app');

describe('Partner Unit Tests', () => {
  it('should block non-admin access', async () => {
    const res = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${userToken}`); // mock user token
    expect(res.statusCode).toBe(403);
  });

  it('should reject duplicate name/email', async () => {
    await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Emma Telecom')
      .field('email', 'info@emma.com')
      .field('description', 'Trusted telecom');

    const res = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Emma Telecom')
      .field('email', 'info@emma.com')
      .field('description', 'Duplicate test');

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/must be unique/i);
  });

  it('should validate logo file type', async () => {
    const res = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('logo', 'tests/files/invalid.txt') // simulate bad file
      .field('name', 'TestCorp')
      .field('email', 'test@corp.com')
      .field('description', 'Bad logo test');

    expect(res.statusCode).toBe(400);
  });
});
