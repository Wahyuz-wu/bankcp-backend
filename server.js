const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { createLeadsRouter } = require('./routes/leads');
const createReportsRouter = require('./routes/reports');

const app = express();
const port = 5000;

const dbPool = mysql.createPool({
  host: "ballast.proxy.rlwy.net",
  user: "root",
  password: "eVKlYXTnWmyLxwxuKxMvHDxAVFUzTyuh",
  database: "railway",
  port: 55142,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors({ origin: 'https://bankcp-production.up.railway.app' }));
app.use(express.json());
app.use(express.static("public"));

app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const [results] = await dbPool.query(
      'SELECT id, username, password, role FROM users WHERE username = ?',
      [username]
    );

    const user = results[0];
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username, role: user.role } 
    });

  } catch (err) {
    next(err);
  }
});

app.use('/leads', createLeadsRouter(dbPool));
app.use('/reports', createReportsRouter(dbPool));

app.get("/", (req, res) => {
  res.json({ message: "Bankcp Back-end" });
});

app.use((req, res) => {
  console.log(`⚠️ Route tidak ditemukan: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🚀 Backend berjalan di http://localhost:${port}`);
});
