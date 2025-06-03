import fs from 'fs';
import pdfParse from 'pdf-parse';
import { embedText } from './openAIClient.js';
import { index } from './pineconeClient.js';

export async function processAndEmbedPDF(filePath, source) {
  const raw = fs.readFileSync(filePath);
  const parsed = await pdfParse(raw);
  const chunks = splitText(parsed.text, 500);

  for (let i = 0; i < chunks.length; i++) {
    const emb = await embedText(chunks[i]);
    await index.upsert([
      {
        id: `${source}-${i}`,
        values: emb,
        metadata: { text: chunks[i], source }
      }
    ]);
  }
}

function splitText(text, size) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}
