const express = require("express");
const axios = require("axios");

const runQuery = (db, sql, values) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const createLeadsRouter = (db) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const data = req.body;

    if (!data.name || !data.phone_number) {
      return res.status(400).json({ success: false, message: "Nama dan nomor wajib diisi" });
    }

    let leadScore = 0;
    try {
      const flaskResponse = await axios.post('https://web-production-059b.up.railway.app/predict',data);
      leadScore = Math.round((flaskResponse.data.probability ?? 0) * 100);
    } catch (err) {
      console.error("❌ Error prediksi model:", err.message);
      return res.status(502).json({ success: false, message: "Model service unavailable" });
    }

    const sql = `
      INSERT INTO leads (
        name, phone_number, age, job, marital, education, default_status, housing, loan,
        contact, month, day, duration, campaign, pdays, previous, poutcome,
        emp_var_rate, cons_price_idx, cons_conf_idx, euribor3m, nr_employed,
        lead_score, status_kampanye, aktivitas, alasan_status, subscription_status, gender
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        name=VALUES(name), age=VALUES(age), job=VALUES(job), lead_score=VALUES(lead_score)
    `;

    const values = [
      data.name, data.phone_number, Number(data.age) || 0, data.job, data.marital, data.education,
      data.default_status || "no", data.housing || "no", data.loan || "no", data.contact,
      data.month, data.day, Number(data.duration) || 0, Number(data.campaign) || 0,
      Number(data.pdays) || 0, Number(data.previous) || 0, data.poutcome || "unknown",
      Number(data.emp_var_rate) || 0, Number(data.cons_price_idx) || 0, Number(data.cons_conf_idx) || 0,
      Number(data.euribor3m) || 0, Number(data.nr_employed) || 0, leadScore,
      data.status_kampanye || "no call", JSON.stringify(data.aktivitas || []),
      data.alasan_status || "", data.subscription_status || "not subscribed", data.gender || ""
    ];

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.status(201).json({ success: true, id: result.insertId, lead_score: leadScore });
    });
  });

  router.get("/", (req, res) => {
    db.query("SELECT * FROM leads ORDER BY lead_score DESC", (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });

    try {
      const results = await runQuery(db, "SELECT * FROM leads WHERE id = ?", [id]);
      if (!results.length) return res.status(404).json({ message: "Lead not found" });
      res.json(results[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch("/:id", async (req, res) => {
    const leadId = req.params.id;
    const data = req.body;

    const sql = `
      UPDATE leads SET 
        name = ?, phone_number = ?, age = ?, job = ?, marital = ?, education = ?, 
        default_status = ?, housing = ?, loan = ?, contact = ?, duration = ?, 
        campaign = ?, pdays = ?, previous = ?, poutcome = ?, 
        emp_var_rate = ?, cons_price_idx = ?, cons_conf_idx = ?, euribor3m = ?, 
        nr_employed = ?, lead_score = ?, status_kampanye = ?,
        gender = ?, month = ?, day = ?
      WHERE id = ?
    `;

    const values = [
      data.name, data.phone_number, data.age, data.job, data.marital, data.education,
      data.default_status, data.housing, data.loan, data.contact, data.duration,
      data.campaign, data.pdays, data.previous, data.poutcome,
      data.emp_var_rate, data.cons_price_idx, data.cons_conf_idx, data.euribor3m,
      data.nr_employed, data.lead_score, data.status_kampanye,
      data.gender, data.month, data.day, leadId
    ];

    try {
      const result = await runQuery(db, sql, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Nasabah tidak ditemukan atau tidak ada perubahan data." });
      }
      res.json({ success: true, message: "Data nasabah berhasil diperbarui." });
    } catch (err) {
      console.error("❌ SQL ERROR UPDATE data utama:", err);
      res.status(500).json({ success: false, message: `Gagal menyimpan data: ${err.message}` });
    }
  });

  router.patch("/:id/status", (req, res) => {
    const { id } = req.params;
    const { status_kampanye, alasan_status, subscription_status } = req.body;

    if (!status_kampanye || !alasan_status) {
      return res.status(400).json({ error: "status_kampanye dan alasan_status wajib diisi" });
    }

    db.query(
      "SELECT aktivitas, month, day, duration, campaign, poutcome FROM leads WHERE id = ?",
      [id],
      (err, results) => {
        if (err) return res.status(500).json({ error: "Database error saat ambil aktivitas" });
        if (results.length === 0) return res.status(404).json({ error: "Lead tidak ditemukan" });

        let aktivitasLama = [];
        try {
          aktivitasLama = JSON.parse(results[0].aktivitas || "[]");
        } catch {
          aktivitasLama = [];
        }

        const aktivitasBaru = {
          tanggal: new Date().toISOString().split("T")[0],
          status: status_kampanye,
          alasan: alasan_status,
          month: results[0].month ?? null,
          day: Number(results[0].day) || null,
          duration: Number(results[0].duration) || 0,
          campaign: Number(results[0].campaign) || 0,
          poutcome: results[0].poutcome ?? null,
        };

        const aktivitasGabungan = [...aktivitasLama, aktivitasBaru];

        const sql = `
          UPDATE leads 
          SET status_kampanye = ?, alasan_status = ?, subscription_status = ?, aktivitas = ?
          WHERE id = ?
        `;
        db.query(
          sql,
          [status_kampanye, alasan_status, subscription_status, JSON.stringify(aktivitasGabungan), id],
          (err, result) => {
            if (err) {
              console.error("❌ Error update status:", err);
              return res.status(500).json({ error: "Database error saat update" });
            }
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Lead tidak ditemukan" });
            }
            res.json({
              success: true,
              id,
              status_kampanye,
              alasan_status,
              subscription_status,
              aktivitas: aktivitasGabungan,
            });
          }
        );
      }
    );
  });

  router.delete("/:id", async (req, res) => {
    const leadId = req.params.id;
    try {
      const result = await runQuery(db, "DELETE FROM leads WHERE id = ?", [leadId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: `Nasabah dengan ID ${leadId} tidak ditemukan.` });
      }
      res.status(200).json({ success: true, message: `Nasabah dengan ID ${leadId} berhasil dihapus.` });
    } catch (err) {
      console.error("❌ Error saat menghapus data:", err);
      res.status(500).json({ success: false, message: "Gagal menghapus data karena kesalahan server database." });
    }
  });

  return router;
};

module.exports = { createLeadsRouter };