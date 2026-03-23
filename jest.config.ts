import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
        '^.+\\.js$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
      transformIgnorePatterns: ['node_modules/(?!jose/.*)'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.integration.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
        '^.+\\.js$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
      transformIgnorePatterns: ['node_modules/(?!jose/.*)'],
    },
  ],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
  ],
  coverageThreshold: {
    global: { branches: 15, functions: 30, lines: 30, statements: 30 },
  },
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'docs/tests/test-reports/coverage',
};

export default config;
