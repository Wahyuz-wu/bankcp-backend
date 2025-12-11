const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "ballast.proxy.rlwy.net",
  user: "root",
  password: "eVKlYXTnWmyLxwxuKxMvHDxAVFUzTyuh",
  database: "railway",
  port: 55142,
});

db.connect(err => {
  if (err) {
    console.error("❌ Gagal koneksi ke MySQL:", err);
  } else {
    console.log("✅ Koneksi ke MySQL berhasil");
  }
});

module.exports = db;