export default {
  transform: {},
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(openai|@pinecone-database/pinecone)/)'
  ]
}; 