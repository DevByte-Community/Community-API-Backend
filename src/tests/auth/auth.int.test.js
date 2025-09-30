const request = require('supertest');
const { GenericContainer } = require('testcontainers');

// Increase Jest timeout for container startup
jest.setTimeout(60000);

let container;
let app;
let db;

describe('POST /api/v1/auth/signup (Testcontainers)', () => {
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

    db = require('../../models');
    await db.sequelize.sync({ force: true });
    app = require('../../app');
  });

  afterAll(async () => {
    if (db && db.sequelize) await db.sequelize.close();
    if (container) await container.stop();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Test User',
      email: 'test@example.com',
      password: 'mypassword123',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('should reject duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Test User',
      email: 'duplicate@example.com',
      password: 'mypassword123',
    });

    const res = await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Another User',
      email: 'duplicate@example.com',
      password: 'mypassword123',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('message', 'Email already registered.');
  });

  it('should reject invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Invalid Email User',
      email: 'not-an-email',
      password: 'mypassword123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should reject short password', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Short Password User',
      email: 'short@example.com',
      password: '123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
