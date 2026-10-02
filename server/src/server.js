import 'dotenv/config';
import { createApp } from './app.js';
import { getDatabase } from './config/database.js';

const port = Number(process.env.PORT) || 5000;
await getDatabase();
createApp().listen(port, () => console.log(`Smart Building API running on http://localhost:${port}`));
