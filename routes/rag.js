import express from 'express';
import multer from 'multer';
import { processAndEmbedPDF } from '../utils/docProcessor.js';
import { embedText, answerFromContext } from '../utils/openAIClient.js';
import { index } from '../utils/pineconeClient.js';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/upload-docs', upload.array('files'), async (req, res) => {
  for (const file of req.files) {
    await processAndEmbedPDF(file.path, file.originalname);
  }
  res.json({ status: 'files uploaded and embedded' });
});

router.get('/ask', async (req, res) => {
  const query = req.query.q;
  const emb = await embedText(query);

  const results = await index.query({
    vector: emb,
    topK: 5,
    includeMetadata: true
  });

  const context = results.matches.map(m => m.metadata.text).join('\n\n');
  const answer = await answerFromContext(context, query);
  res.json({ answer });
});

export default router;
