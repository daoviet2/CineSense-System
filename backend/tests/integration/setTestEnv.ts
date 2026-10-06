import dotenv from 'dotenv';
import { applyTestDatabaseUrl } from './testEnv';

// Load backend/.env without clobbering Compose-injected variables.
dotenv.config({ quiet: true });
applyTestDatabaseUrl();
