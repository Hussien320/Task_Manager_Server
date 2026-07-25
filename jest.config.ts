import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',                    // Specifies that we are using ts-jest for TypeScript
  testEnvironment: 'node',              // Specifies the test environment (e.g., jsdom or node)
  roots: ['<rootDir>/tests'],                 // Specifies the root directory for Jest to look for test files
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns:["/node_modules/"],
  verbose: true,                        // Enables verbose output during testing
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'], // Specifies the files to collect coverage from
  collectCoverage: true,                // Enables code coverage collection
  coverageDirectory: 'coverage',        // Specifies the directory to output coverage files
  coverageThreshold: {                  // Specifies the coverage threshold levels
    global: {
      functions: 80,
      statements: 75
    }
  },
  // Add this to handle ES modules in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'  // Transform uuid package even though it's in node_modules
  ]
  
};

export default config;