import { jest } from '@jest/globals';
// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.PINECONE_API_KEY = 'mock-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'mock-environment';
process.env.PINECONE_INDEX_NAME = 'mock-index';

// Increase timeout for tests
jest.setTimeout(30000); 