/**
 * Test Setup and Configuration
 */

import { beforeAll, afterAll } from '@jest/globals';
import db from '../src/config/database';

beforeAll(async () => {
  // Initialize test database
  await db.initializeTables();
});

afterAll(async () => {
  // Clean up and close database connection
  await db.close();
});
