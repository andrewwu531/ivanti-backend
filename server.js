const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database setup
const dbPath = path.join(__dirname, "database", "temperature.db");
const backupDir = path.join(__dirname, "backups");

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Create table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS temperature_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personName TEXT NOT NULL,
      temperatureSeries TEXT NOT NULL,
      closestToZero REAL NOT NULL,
      recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runQuerySingle(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function runQueryInsert(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
}

// Backup function
async function createBackup(operation, recordId = null) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      backupDir,
      `backup_${operation}_${timestamp}.json`
    );

    const allRecords = await runQuery("SELECT * FROM temperature_records");
    const backupData = {
      timestamp: new Date().toISOString(),
      operation,
      recordId,
      data: allRecords,
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Backup created: ${backupPath}`);
  } catch (error) {
    console.error("Backup failed:", error);
  }
}

function findClosestToZero(temperatures) {
  if (temperatures.length === 0) {
    throw new Error("No temperatures provided");
  }

  let closest = temperatures[0];
  let minDistance = Math.abs(closest);

  for (const temp of temperatures) {
    const distance = Math.abs(temp);
    if (distance < minDistance) {
      closest = temp;
      minDistance = distance;
    } else if (distance === minDistance && temp > closest) {
      closest = temp;
    }
  }

  return closest;
}

function validateTemperatureSeries(temperatureSeries) {
  if (!Array.isArray(temperatureSeries) || temperatureSeries.length === 0) {
    throw new Error("Temperature series must be a non-empty array");
  }

  for (let i = 0; i < temperatureSeries.length; i++) {
    const temp = temperatureSeries[i];
    if (typeof temp !== "number" || isNaN(temp)) {
      throw new Error(
        `Invalid temperature at index ${i}: must be a valid number`
      );
    }
  }

  return temperatureSeries;
}

// Add this function after your existing helper functions
async function autoExport() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportPath = path.join(__dirname, "scripts", "current_data.json");
    const backupPath = path.join(
      __dirname,
      "backups",
      `auto_export_${timestamp}.json`
    );

    const allRecords = await runQuery(
      "SELECT * FROM temperature_records ORDER BY id"
    );
    const exportData = {
      timestamp: new Date().toISOString(),
      recordCount: allRecords.length,
      data: allRecords.map((record) => ({
        personName: record.personName,
        temperatureSeries: JSON.parse(record.temperatureSeries),
        closestToZero: record.closestToZero,
        recordedAt: record.recordedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
    console.log(`📊 Auto-export completed: ${allRecords.length} records`);
  } catch (error) {
    console.error("Auto-export failed:", error);
  }
}

// Add this function after your existing helper functions
async function autoUpdatePopulate() {
  try {
    const { exec } = require("child_process");
    const path = require("path");

    const populateScript = path.join(__dirname, "scripts", "populate.js");

    exec(`node "${populateScript}" update`, (error, stdout, stderr) => {
      if (error) {
        console.error("Auto-update populate.js failed:", error);
      } else {
        console.log("✅ populate.js auto-updated");
      }
    });
  } catch (error) {
    console.error("Auto-update populate.js failed:", error);
  }
}

// Routes
app.get("/api/temperature-records", async (req, res) => {
  try {
    const { personName, startDate, endDate, limit = 100 } = req.query;

    let sql = "SELECT * FROM temperature_records WHERE 1=1";
    let params = [];

    if (personName) {
      sql += " AND personName LIKE ?";
      params.push(`%${personName}%`);
    }

    if (startDate) {
      sql += " AND recordedAt >= ?";
      params.push(startDate);
    }

    if (endDate) {
      sql += " AND recordedAt <= ?";
      params.push(endDate);
    }

    sql += " ORDER BY updatedAt DESC LIMIT ?";
    params.push(parseInt(limit));

    const records = await runQuery(sql, params);

    const recordsWithParsedData = records.map((record) => ({
      ...record,
      temperatureSeries: JSON.parse(record.temperatureSeries),
    }));

    res.json({
      success: true,
      data: recordsWithParsedData,
      count: recordsWithParsedData.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching temperature records",
      error: error.message,
    });
  }
});

app.get("/api/temperature-records/:id", async (req, res) => {
  try {
    const record = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [req.params.id]
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    const recordWithParsedData = {
      ...record,
      temperatureSeries: JSON.parse(record.temperatureSeries),
    };

    res.json({
      success: true,
      data: recordWithParsedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching temperature record",
      error: error.message,
    });
  }
});

app.post("/api/temperature-records", async (req, res) => {
  try {
    const { personName, temperatureSeries } = req.body;

    if (!personName || !temperatureSeries) {
      return res.status(400).json({
        success: false,
        message: "Person name and temperature series are required",
      });
    }

    const validatedSeries = validateTemperatureSeries(temperatureSeries);
    const closestToZero = findClosestToZero(validatedSeries);

    const result = await runQueryInsert(
      "INSERT INTO temperature_records (personName, temperatureSeries, closestToZero) VALUES (?, ?, ?)",
      [personName, JSON.stringify(validatedSeries), closestToZero]
    );

    const newRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [result.id]
    );

    const recordWithParsedData = {
      ...newRecord,
      temperatureSeries: JSON.parse(newRecord.temperatureSeries),
    };

    // Create backup
    await createBackup("CREATE", result.id);
    await autoUpdatePopulate(); // Add this line
    await autoExport(); // Add this line

    res.status(201).json({
      success: true,
      message: "Temperature record created successfully",
      data: recordWithParsedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating temperature record",
      error: error.message,
    });
  }
});

app.put("/api/temperature-records/:id", async (req, res) => {
  try {
    const { personName, temperatureSeries } = req.body;

    let sql = "UPDATE temperature_records SET updatedAt = CURRENT_TIMESTAMP";
    let params = [];

    if (personName !== undefined) {
      sql += ", personName = ?";
      params.push(personName);
    }

    if (temperatureSeries !== undefined) {
      const validatedSeries = validateTemperatureSeries(temperatureSeries);
      const closestToZero = findClosestToZero(validatedSeries);

      sql += ", temperatureSeries = ?, closestToZero = ?";
      params.push(JSON.stringify(validatedSeries), closestToZero);
    }

    sql += " WHERE id = ?";
    params.push(req.params.id);

    await runQueryInsert(sql, params);

    const updatedRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [req.params.id]
    );

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    const recordWithParsedData = {
      ...updatedRecord,
      temperatureSeries: JSON.parse(updatedRecord.temperatureSeries),
    };

    // Create backup
    await createBackup("UPDATE", req.params.id);
    await autoUpdatePopulate(); // Add this line
    await autoExport(); // Add this line

    res.json({
      success: true,
      message: "Temperature record updated successfully",
      data: recordWithParsedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating temperature record",
      error: error.message,
    });
  }
});

app.delete("/api/temperature-records/:id", async (req, res) => {
  try {
    const deletedRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [req.params.id]
    );

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    await runQueryInsert("DELETE FROM temperature_records WHERE id = ?", [
      req.params.id,
    ]);

    const recordWithParsedData = {
      ...deletedRecord,
      temperatureSeries: JSON.parse(deletedRecord.temperatureSeries),
    };

    // Create backup
    await createBackup("DELETE", req.params.id);
    await autoUpdatePopulate(); // Add this line
    await autoExport(); // Add this line

    res.json({
      success: true,
      message: "Temperature record deleted successfully",
      data: recordWithParsedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting temperature record",
      error: error.message,
    });
  }
});

app.get("/api/temperature-records/stats/summary", async (req, res) => {
  try {
    const stats = await runQuerySingle(`
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT personName) as uniquePeopleCount
      FROM temperature_records
    `);

    res.json({
      success: true,
      data: {
        totalRecords: stats.totalRecords || 0,
        uniquePeopleCount: stats.uniquePeopleCount || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching temperature statistics",
      error: error.message,
    });
  }
});

// Add this route to view database contents
app.get("/api/debug/view", async (req, res) => {
  try {
    const records = await runQuery(
      "SELECT * FROM temperature_records ORDER BY id"
    );

    const formattedRecords = records.map((record) => ({
      id: record.id,
      personName: record.personName,
      temperatureSeries: JSON.parse(record.temperatureSeries),
      closestToZero: record.closestToZero,
      recordedAt: record.recordedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    res.json({
      success: true,
      totalRecords: records.length,
      data: formattedRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error viewing database",
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SQLite database: ${dbPath}`);
  console.log(`Backup directory: ${backupDir}`);
});
