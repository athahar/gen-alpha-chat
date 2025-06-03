// utils/pinecone.js

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { debugLog } from './logger.js';

dotenv.config();

debugLog(`🔢 PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME}`);

const pinecone = new Pinecone(); // No apiKey needed if using .env
export const index = pinecone.Index(process.env.PINECONE_INDEX_NAME); // Capital "I"
