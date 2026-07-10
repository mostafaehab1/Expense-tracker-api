/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Global setup/teardown spin up an in-memory MongoDB so tests need no live DB.
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/docs/**',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  // ts-jest reads tsconfig; keep tests type-checked but fast.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
