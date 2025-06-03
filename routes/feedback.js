import express from 'express';
import fs from 'fs';
import { runJudge } from '../utils/judge.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log("👩‍⚖️ FEEDBACK — starting...");
  const data = req.body;
  const log = { ...data, timestamp: new Date().toISOString() };
  fs.appendFileSync('feedback_log.jsonl', JSON.stringify(log) + '\n');

  if (!data.helpful) {
    const judged = await runJudge(data);
    fs.appendFileSync('re-eval-results.jsonl', JSON.stringify(judged) + '\n');
  }

  console.log("👩‍⚖️ FEEDBACK — done.");
  res.sendStatus(200);
});

export default router;