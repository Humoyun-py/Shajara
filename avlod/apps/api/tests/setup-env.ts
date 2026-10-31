import os from 'node:os';
import path from 'node:path';
import { inject } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = inject('databaseUrl');
process.env.JWT_ACCESS_SECRET = 'test-only-secret-value-that-is-long-enough-1234567890';
process.env.MEDIA_URL_SECRET = 'test-only-media-secret-value-123456';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.STORAGE_DRIVER = 'local';
process.env.LOCAL_STORAGE_DIR = path.join(os.tmpdir(), 'avlod-test-storage');
process.env.PUBLIC_DEMO_ENABLED = 'true';
