// tests/setup/testContainers.js
const { GenericContainer } = require('testcontainers');
const bcrypt = require('bcrypt');

class TestContainersManager {
  constructor() {
    this.containers = {
      postgres: null,
      redis: null,
      minio: null,
    };
    this.clients = {
      redis: null,
      minio: null,
    };
    this.app = null;
    this.db = null;
    this.testUsers = {};
  }

  /**
   * Start all containers (Postgres, Redis, MinIO)
   */
  async startContainers() {
    console.log('🚀 Starting test containers...');

    // Start Postgres
    this.containers.postgres = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis
    this.containers.redis = await new GenericContainer('redis:7').withExposedPorts(6379).start();

    // Start MinIO
    this.containers.minio = await new GenericContainer('minio/minio')
      .withEnvironment({
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin',
      })
      .withExposedPorts(9000, 9001)
      .withCommand(['server', '/data', '--console-address', ':9001'])
      .start();

    console.log('✅ All containers started');
  }

  /**
   * Configure environment variables from running containers
   */
  configureEnvironment() {
    const pgHost = this.containers.postgres.getHost();
    const pgPort = this.containers.postgres.getMappedPort(5432);
    const redisHost = this.containers.redis.getHost();
    const redisPort = this.containers.redis.getMappedPort(6379);
    const minioHost = this.containers.minio.getHost();
    const minioApiPort = this.containers.minio.getMappedPort(9000);

    process.env.NODE_ENV = 'test';

    // Database
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_HOST = pgHost;
    process.env.POSTGRES_PORT = String(pgPort);

    // JWT & Cookies
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.ACCESS_TTL = '15m';
    process.env.REFRESH_TTL = '30d';
    process.env.AUTH_ACCESS_COOKIE = 'access_token';
    process.env.AUTH_REFRESH_COOKIE = 'refresh_token';
    process.env.AUTH_COOKIE_SECURE = 'false';
    process.env.AUTH_COOKIE_HTTPONLY = 'true';
    process.env.AUTH_COOKIE_SAMESITE = 'Lax';
    delete process.env.AUTH_COOKIE_DOMAIN;

    // Redis
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = String(redisPort);
    process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

    // MinIO
    process.env.MINIO_ENDPOINT = minioHost;
    process.env.MINIO_PORT = String(minioApiPort);
    process.env.MINIO_USE_SSL = 'false';
    process.env.MINIO_ROOT_USER = 'minioadmin';
    process.env.MINIO_ROOT_PASSWORD = 'minioadmin';
    process.env.MINIO_BUCKET_NAME = 'devbyte-profile-pictures';

    console.log('✅ Environment configured');
  }

  /**
   * Initialize Redis client
   */
  async initializeRedis() {
    this.clients.redis = require('../utils/redisClient');

    if (typeof this.clients.redis.initializeRedisClient === 'function') {
      this.clients.redis.initializeRedisClient(process.env.REDIS_URL);
    }

    if (this.clients.redis.client && typeof this.clients.redis.client.connect === 'function') {
      await this.clients.redis.client.connect();
    }

    console.log('✅ Redis client initialized');
  }

  /**
   * Initialize MinIO client and bucket
   */
  async initializeMinio() {
    this.clients.minio = require('../utils/minioClient');
    this.clients.minio.initializeMinioClient();
    await this.clients.minio.initializeBucket();

    console.log('✅ MinIO client initialized');
  }

  /**
   * Initialize database and sync models
   */
  async initializeDatabase() {
    this.db = require('../models');
    await this.db.sequelize.sync({ force: true });

    console.log('✅ Database initialized and synced');
  }

  /**
   * Create test users with different roles
   * @param {Object} users - Object with user definitions
   * @returns {Object} Created user instances
   */
  async createTestUsers(users = {}) {
    const { User } = this.db;
    const createdUsers = {};

    const defaultUsers = {
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
      ...users,
    };

    for (const [key, userData] of Object.entries(defaultUsers)) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      createdUsers[key] = await User.create({
        fullname: userData.fullname,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
      });
      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
    }

    this.testUsers = createdUsers;
    return createdUsers;
  }

  /**
   * Initialize the Express app
   */
  initializeApp() {
    this.app = require('../app');
    console.log('✅ Express app initialized');
    return this.app;
  }

  /**
   * Full setup - runs all initialization steps
   */
  async setup(options = {}) {
    const {
      createUsers = true,
      userDefinitions = {},
      skipRedis = false,
      skipMinio = false,
    } = options;

    await this.startContainers();
    this.configureEnvironment();

    if (!skipRedis) {
      await this.initializeRedis();
    }

    if (!skipMinio) {
      await this.initializeMinio();
    }

    await this.initializeDatabase();

    if (createUsers) {
      await this.createTestUsers(userDefinitions);
    }

    this.initializeApp();

    console.log('🎉 Test environment setup complete!\n');
  }

  /**
   * Teardown - stop all containers and close connections
   */
  async teardown() {
    console.log('\n🧹 Cleaning up test environment...');

    try {
      if (this.db?.sequelize) {
        await this.db.sequelize.close();
        console.log('✅ Database connection closed');
      }
    } catch (err) {
      console.error('❌ Error closing database:', err.message);
    }

    try {
      if (this.clients.redis?.disconnect) {
        await this.clients.redis.disconnect();
      } else if (this.clients.redis?.client?.quit) {
        await this.clients.redis.client.quit();
      }
      console.log('✅ Redis connection closed');
    } catch (err) {
      console.error('❌ Error closing Redis:', err.message);
    }

    try {
      if (this.containers.postgres) {
        await this.containers.postgres.stop();
        console.log('✅ Postgres container stopped');
      }
    } catch (err) {
      console.error('❌ Error stopping Postgres:', err.message);
    }

    try {
      if (this.containers.redis) {
        await this.containers.redis.stop();
        console.log('✅ Redis container stopped');
      }
    } catch (err) {
      console.error('❌ Error stopping Redis:', err.message);
    }

    try {
      if (this.containers.minio) {
        await this.containers.minio.stop();
        console.log('✅ MinIO container stopped');
      }
    } catch (err) {
      console.error('❌ Error stopping MinIO:', err.message);
    }

    console.log('🎉 Cleanup complete!\n');
  }

  /**
   * Reset database (useful between tests)
   */
  async resetDatabase() {
    if (this.db?.sequelize) {
      await this.db.sequelize.sync({ force: true });
      console.log('🔄 Database reset');
    }
  }

  /**
   * Get database models
   */
  getModels() {
    return this.db;
  }

  /**
   * Get test user by key
   */
  getUser(key) {
    return this.testUsers[key];
  }

  /**
   * Get all test users
   */
  getUsers() {
    return this.testUsers;
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create TestContainersManager instance
 */
function getTestContainersManager() {
  if (!instance) {
    instance = new TestContainersManager();
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
function resetTestContainersManager() {
  instance = null;
}

module.exports = {
  TestContainersManager,
  getTestContainersManager,
  resetTestContainersManager,
};
