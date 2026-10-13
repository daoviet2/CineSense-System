process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/cinesense_test';
process.env.JWT_SECRET = 'unit-test-jwt-secret-with-at-least-32-characters';
process.env.TMDB_API_KEY = 'test-tmdb-api-key';
