module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/tests/**', '!src/docs/**'],
  testMatch: ['**/*.test.js'],
  globalTeardown: './jest.global-teardown.js',
  testTimeout: 10000,
};
