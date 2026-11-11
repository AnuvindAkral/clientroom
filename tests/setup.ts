process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-for-hashing-0123456789';
process.env.DATABASE_PATH = ':memory:';
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.SEED_DEMO = '0';
