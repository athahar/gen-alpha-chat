import express from 'express';
import feedbackRouter from './routes/feedback.js';
import responseRouter from './routes/response.js';
import ragRouter from './routes/rag.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use('/feedback', feedbackRouter);
app.use('/response', responseRouter);
app.use('/rag', ragRouter);
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`🚀 Feedback system running at http://localhost:${port}`);
});