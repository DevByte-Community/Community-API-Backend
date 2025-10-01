const request = require('supertest');
const { GenericContainer } = require('testcontainers');

jest.setTimeout(60000);

let container;
let app;
let db;

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

  it('should sign in successfully with valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'signin@example.com',
      password: 'validPassword123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'User signed in successfully');
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('signin@example.com');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('should reject invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'signin@example.com',
      password: 'wrongPassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials.');
  });

  it('should reject non-existent email', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'doesnotexist@example.com',
      password: 'somepassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials.');
  });

  it('should reject invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'not-an-email',
      password: 'validPassword123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation failed');
  });

  it('should reject short password', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'signin@example.com',
      password: '123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation failed');
  });
});
