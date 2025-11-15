// jest.setup.js
// Ce fichier s'exécute AVANT tous les tests

// Définir les variables d'environnement minimales pour les tests
process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

// Variables Redis par défaut (seront écrasées par testcontainers si nécessaire)
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Variables PostgreSQL par défaut
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'test_user';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'test_password';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'test_db';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';

console.log('✅ Jest setup completed - Environment variables initialized');

// Mock logger globally to prevent initialization errors
jest.mock('./src/utils/logger', () => {
  return jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }));
});
