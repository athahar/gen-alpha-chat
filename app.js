import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import { debugLog } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

debugLog('🔧 Initializing session middleware');
app.use(session({
  secret: 'supersecure-session-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

debugLog('📥 Mounting routes');
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

app.listen(3000, () => {
  debugLog('🚀 Server running at http://localhost:3000');
  console.log('🚀 Server running at http://localhost:3000');
});
