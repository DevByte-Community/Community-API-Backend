require('dotenv').config({ path: '.env.test' }); // Load test environment variables

const request = require('supertest');
const app = require('../../app'); // Express app
const { sequelize } = require('../../models');

describe('POST /api/v1/auth/signup', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // reset DB for tests
  });

  afterAll(async () => {
    await sequelize.close();
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
    expect(res.body.user).not.toHaveProperty('password_hash'); // security
  });

  it('should reject duplicate email registration', async () => {
    // first signup
    await request(app).post('/api/v1/auth/signup').send({
      fullname: 'Test User',
      email: 'duplicate@example.com',
      password: 'mypassword123',
    });

    // second signup with same email
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
      password: '123', // too short
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});
