const express = require("express");
const router = express.Router();

module.exports = (db) => {
  router.get("/summary", (req, res) => {
    const sqlTotal = "SELECT COUNT(*) AS total FROM leads";
    const sqlSuccess = "SELECT COUNT(*) AS total FROM leads WHERE poutcome = 'success'";
    const sqlFailure = "SELECT COUNT(*) AS total FROM leads WHERE poutcome = 'failure'";
    const sqlOther = "SELECT COUNT(*) AS total FROM leads WHERE poutcome NOT IN ('success','failure')";
    const sqlAvgDuration = "SELECT AVG(duration) AS avg FROM leads";

    db.query(sqlTotal, (err, totalResult) => {
      if (err) return res.status(500).json({ error: "DB error total" });

      const total = totalResult[0]?.total || 0;

      db.query(sqlSuccess, (err, successResult) => {
        if (err) return res.status(500).json({ error: "DB error success" });

        db.query(sqlFailure, (err, failureResult) => {
          if (err) return res.status(500).json({ error: "DB error failure" });

          db.query(sqlOther, (err, otherResult) => {
            if (err) return res.status(500).json({ error: "DB error other" });

            db.query(sqlAvgDuration, (err, avgResult) => {
              if (err) return res.status(500).json({ error: "DB error avg" });

              res.json({
                totalKampanye: total,
                outcome: {
                  success: total ? Math.round((successResult[0]?.total / total) * 100) : 0,
                  failure: total ? Math.round((failureResult[0]?.total / total) * 100) : 0,
                  other: total ? Math.round((otherResult[0]?.total / total) * 100) : 0,
                },
                durasiRataRata: Math.round(avgResult[0]?.avg || 0),
              });
            });
          });
        });
      });
    });
  });

  router.get("/segmentasi", (req, res) => {
    const sqlAge = "SELECT age, COUNT(*) AS total FROM leads WHERE age IS NOT NULL AND age > 0 GROUP BY age";
    const sqlEducation = "SELECT education, COUNT(*) AS total FROM leads WHERE education IS NOT NULL AND education != '' GROUP BY education";
    const sqlMarital = "SELECT marital, COUNT(*) AS total FROM leads WHERE marital IS NOT NULL AND marital != '' GROUP BY marital";

    db.query(sqlAge, (err, ageResult) => {
      if (err) return res.status(500).json({ error: "DB error age" });

      db.query(sqlEducation, (err, eduResult) => {
        if (err) return res.status(500).json({ error: "DB error education" });

        db.query(sqlMarital, (err, maritalResult) => {
          if (err) return res.status(500).json({ error: "DB error marital" });

          res.json({
            usia: ageResult || [],
            pendidikan: eduResult || [],
            statusPernikahan: maritalResult || [],
          });
        });
      });
    });
  });

  return router;
};
