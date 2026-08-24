// jest.setup.ts
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Increase timeout for API tests
jest.setTimeout(30000);