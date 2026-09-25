const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

const dbPath = path.join(__dirname, 'scores.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

app.use(cors());
app.options('*', cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const getScores = db.prepare(
  'SELECT id, name, score, created_at FROM scores ORDER BY score DESC LIMIT 20'
);

const insertScore = db.prepare(
  'INSERT INTO scores (name, score) VALUES (@name, @score)'
);

app.get('/api/scores', (_req, res) => {
  const rows = getScores.all();
  res.json(rows);
});

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }
  if (name.trim().length > 30) {
    return res.status(400).json({ error: 'name must be 30 characters or fewer' });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 999999) {
    return res.status(400).json({ error: 'score must be an integer between 0 and 999999' });
  }

  const trimmedName = name.trim();
  const result = insertScore.run({ name: trimmedName, score });
  res.status(201).json({ id: result.lastInsertRowid, name: trimmedName, score });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Runaway Runner server listening on http://127.0.0.1:${PORT}`);
});
