/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // Use testRegex instead of testMatch — glob patterns break when the workspace
  // path contains special characters like parentheses.
  testRegex: 'tests/integration/.*\\.test\\.ts$',
  globalSetup: './tests/integration/globalSetup.ts',
  setupFiles: ['./tests/integration/setTestEnv.ts'],
  setupFilesAfterEnv: ['./tests/integration/setup.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
};
