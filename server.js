const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { createLeadsRouter } = require('./routes/leads');
const createReportsRouter = require('./routes/reports');

const app = express();
const port = 5000;

const db = mysql.createConnection({
  host: "ballast.proxy.rlwy.net",
  user: "root",
  password: "eVKlYXTnWmyLxwxuKxMvHDxAVFUzTyuh",
  database: "railway",
  port: 55142,
});

db.connect(err => {
  if (err) {
    console.error('❌ Gagal koneksi ke MySQL:', err);
    process.exit(1);
  }
  console.log('✅ Koneksi ke MySQL berhasil');
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT id, username, password, role FROM users WHERE username = ?';
  db.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    const user = results[0];
    if (user && user.password === password) {
      return res.json({ success: true, user });
    }
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  });
});

app.use('/leads', createLeadsRouter(db));
app.use('/reports', createReportsRouter(db));

app.get("/", (req, res) => {
  res.json({ message: "Bankcp Back-end" });
});

app.use((req, res) => {
  console.log(`⚠️ [DEBUG] Route tidak ditemukan: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

app.listen(port, () => {
  console.log(`🚀 Backend berjalan di http://localhost:${port}`);
});
