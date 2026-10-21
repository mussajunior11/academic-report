import { testDatabaseUrl } from "./test-db";

process.env.DATABASE_URL = testDatabaseUrl();
process.env.AUTH_SECRET = "test-auth-secret-do-not-use-in-production";
