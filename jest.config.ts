import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.spec.json' }],
  },
  setupFiles: ['dotenv/config'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/main.ts',
    '!src/**/schema.ts',
    '!src/**/prisma/**',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      // Global thresholds are intentionally modest because this repository
      // includes many endpoints and integrations; we enforce higher thresholds
      // on the core business modules below.
      branches: 10,
      functions: 10,
      lines: 15,
      statements: 15,
    },
    // Stronger guarantees on the core use-cases we unit-test.
    './src/modules/auth/**': {
      branches: 60,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    './src/modules/payments/**': {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    },
    './src/modules/orders/**': {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    },
    './src/modules/products/application/mappers/**': {
      branches: 80,
      functions: 80,
      lines: 90,
      statements: 90,
    },
  },
  verbose: false,
};

export default config;
