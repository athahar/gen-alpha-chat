import express from 'express';
import fs from 'fs';

const router = express.Router();
const lines = fs.readFileSync('responses.jsonl', 'utf-8').trim().split('\n');
let index = 0;

router.get('/', (req, res) => {
  const record = JSON.parse(lines[index]);
  index = (index + 1) % lines.length;
  res.json(record);
});

export default router;