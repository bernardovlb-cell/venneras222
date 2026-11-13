// Testes usam um banco separado; nunca o de desenvolvimento.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://toyville:toyville@localhost:5432/toyville_test";
process.env.APP_URL = "http://localhost:3000";
process.env.MP_WEBHOOK_SECRET = "test-webhook-secret";
process.env.MP_ACCESS_TOKEN = "TEST-access-token";
process.env.STORAGE_DRIVER = "local";
process.env.EMAIL_PROVIDER = "outbox";
