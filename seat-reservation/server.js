const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'reservations.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// helper: read & write data file
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// API: get reserved seats for a given date & outlet
// GET /api/reserved?date=2025-10-06&outlet=Main
app.get('/api/reserved', (req, res) => {
  const { date, outlet } = req.query;
  if (!date || !outlet) return res.status(400).json({ error: 'date and outlet required' });

  const all = readData();
  const reservations = all.filter(r => r.date === date && r.outlet === outlet);
  // Flatten seats
  const reservedSeats = reservations.flatMap(r => r.seats || []);
  res.json({ reserved: reservedSeats });
});

// API: create reservation
// POST /api/reserve  body: { name, hp, date, time, outlet, seats: ["A1","A2"] }
app.post('/api/reserve', (req, res) => {
  const { name, hp, date, time, outlet, seats } = req.body;
  if (!name || !hp || !date || !time || !outlet || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'Missing fields or empty seats' });
  }

  const data = readData();

  // Check conflicts: if any seat in seats already reserved for same date & outlet
  const reservedForSame = data
    .filter(r => r.date === date && r.outlet === outlet)
    .flatMap(r => r.seats);

  const conflict = seats.find(s => reservedForSame.includes(s));
  if (conflict) {
    return res.status(409).json({ error: `Seat ${conflict} already reserved` });
  }

  // Create reservation id (timestamp)
  const id = 'resv-' + Date.now();
  const newResv = { id, name, hp, date, time, outlet, seats, createdAt: new Date().toISOString() };
  data.push(newResv);
  writeData(data);

  res.json({ ok: true, reservation: newResv });
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});
// fallback to index.html for SPA-ish behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
