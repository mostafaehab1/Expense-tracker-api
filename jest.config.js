/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Spinning up an in-memory mongod in beforeAll can exceed Jest's default 5s
  // hook timeout under load, so give hooks/tests more headroom.
  testTimeout: 30000,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // One shared in-memory MongoDB for the whole run (started once), so tests need
  // no live DB and don't pay mongod startup per file.
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
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
