import serverless from 'serverless-http';
import { createApp } from '../../server/src/app.js';
import { getDatabase } from '../../server/src/config/database.js';

await getDatabase();
export const handler = serverless(createApp());
