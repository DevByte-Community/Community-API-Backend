// tests/user/user.controller.int.test.js
const request = require('supertest');
const { GenericContainer } = require('testcontainers');

jest.setTimeout(120000);

let pgC, redisC, minioC, app, db, redisClientModule, agent, minioModule;

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

beforeAll(async () => {
  // --- Postgres ---
  pgC = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test_user',
      POSTGRES_PASSWORD: 'test_password',
      POSTGRES_DB: 'test_db',
    })
    .withExposedPorts(5432)
    .start();

  // --- Redis ---
  redisC = await new GenericContainer('redis:7').withExposedPorts(6379).start();

  // --- MinIO (API:9000, Console:9001) ---
  minioC = await new GenericContainer('minio/minio')
    .withEnvironment({
      MINIO_ROOT_USER: 'minioadmin',
      MINIO_ROOT_PASSWORD: 'minioadmin',
    })
    .withExposedPorts(9000, 9001)
    .withCommand(['server', '/data', '--console-address', ':9001'])
    .start();

  const pgHost = pgC.getHost();
  const pgPort = pgC.getMappedPort(5432);
  const redisHost = redisC.getHost();
  const redisPort = redisC.getMappedPort(6379);
  const minioHost = minioC.getHost();
  const minioApiPort = minioC.getMappedPort(9000);

  // --- App env ---
  process.env.NODE_ENV = 'test';

  // DB
  process.env.POSTGRES_USER = 'test_user';
  process.env.POSTGRES_PASSWORD = 'test_password';
  process.env.POSTGRES_DB = 'test_db';
  process.env.POSTGRES_HOST = pgHost;
  process.env.POSTGRES_PORT = String(pgPort);

  // JWT & cookies
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.ACCESS_TTL = '15m';
  process.env.REFRESH_TTL = '30d';
  process.env.AUTH_ACCESS_COOKIE = 'access_token';
  process.env.AUTH_REFRESH_COOKIE = 'refresh_token';
  process.env.AUTH_COOKIE_SECURE = 'false'; // HTTP in tests
  process.env.AUTH_COOKIE_HTTPONLY = 'true';
  process.env.AUTH_COOKIE_SAMESITE = 'Lax';
  delete process.env.AUTH_COOKIE_DOMAIN; // host-only cookie

  // Redis
  process.env.REDIS_HOST = redisHost;
  process.env.REDIS_PORT = String(redisPort);
  process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

  // MinIO envs your client reads
  process.env.MINIO_ENDPOINT = minioHost; // host name/ip
  process.env.MINIO_PORT = String(minioApiPort); // mapped 9000
  process.env.MINIO_USE_SSL = 'false';
  process.env.MINIO_ROOT_USER = 'minioadmin';
  process.env.MINIO_ROOT_PASSWORD = 'minioadmin';
  process.env.MINIO_BUCKET_NAME = 'devbyte-profile-pictures';

  // Init Redis client (your module API)
  redisClientModule = require('../../utils/redisClient');
  if (typeof redisClientModule.initializeRedisClient === 'function') {
    redisClientModule.initializeRedisClient(process.env.REDIS_URL);
  }
  if (redisClientModule.client && typeof redisClientModule.client.connect === 'function') {
    await redisClientModule.client.connect();
  }

  // Init MinIO client & bucket (your module)
  minioModule = require('../../utils/minioClient');
  minioModule.initializeMinioClient();
  await minioModule.initializeBucket(); // creates bucket + policy if not exists

  // DB & app
  db = require('../../models');
  await db.sequelize.sync({ force: true });

  app = require('../../app');

  // Persist cookies across requests
  agent = request.agent(app);

  // Signup (sets auth cookies via setAuthCookies)
  const signupRes = await agent.post('/api/v1/auth/signup').send(TEST_USER);
  expect([200, 201]).toContain(signupRes.status);
});

afterAll(async () => {
  try {
    if (db?.sequelize) await db.sequelize.close();
  } catch {
    /* empty */
  }
  try {
    if (redisClientModule?.disconnect) await redisClientModule.disconnect();
    else if (redisClientModule?.client?.quit) await redisClientModule.client.quit();
  } catch {
    /* empty */
  }
  try {
    if (pgC) await pgC.stop();
  } catch {
    /* empty */
  }
  try {
    if (redisC) await redisC.stop();
  } catch {
    /* empty */
  }
  try {
    if (minioC) await minioC.stop();
  } catch {
    /* empty */
  }
  jest.restoreAllMocks();
});

describe('Users Controller (integration)', () => {
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
});
