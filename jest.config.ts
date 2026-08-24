// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  // Use Node.js environment (for backend testing)
  testEnvironment: 'node',
  
  // Tell Jest to look for test files
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/src/**/*.test.ts'
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  
  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup file to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
  ],
};

export default config;