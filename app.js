// app.js - Complete version with all routes
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database setup
const dbPath = path.join(__dirname, "database", "temperature.db");
const backupDir = path.join(__dirname, "backups");

// Ensure directories exist
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Initialize database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbPath);

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

// Database helper functions
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
      else resolve(this.lastID);
    });
  });
}

// Utility functions
function findClosestToZero(temperatures) {
  if (!Array.isArray(temperatures) || temperatures.length === 0) {
    throw new Error("Invalid temperature series");
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

  return true;
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/api/temperature-records", async (req, res) => {
  try {
    const records = await runQuery(
      "SELECT * FROM temperature_records ORDER BY createdAt DESC"
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
      data: formattedRecords,
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

    const formattedRecord = {
      id: record.id,
      personName: record.personName,
      temperatureSeries: JSON.parse(record.temperatureSeries),
      closestToZero: record.closestToZero,
      recordedAt: record.recordedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    res.json({
      success: true,
      data: formattedRecord,
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

    if (!personName || !personName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Person name is required",
      });
    }

    if (
      !temperatureSeries ||
      !Array.isArray(temperatureSeries) ||
      temperatureSeries.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Temperature series is required and must be a non-empty array",
      });
    }

    validateTemperatureSeries(temperatureSeries);
    const closestToZero = findClosestToZero(temperatureSeries);

    const result = await runQueryInsert(
      "INSERT INTO temperature_records (personName, temperatureSeries, closestToZero) VALUES (?, ?, ?)",
      [personName.trim(), JSON.stringify(temperatureSeries), closestToZero]
    );

    const newRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [result]
    );

    const formattedRecord = {
      id: newRecord.id,
      personName: newRecord.personName,
      temperatureSeries: JSON.parse(newRecord.temperatureSeries),
      closestToZero: newRecord.closestToZero,
      recordedAt: newRecord.recordedAt,
      createdAt: newRecord.createdAt,
      updatedAt: newRecord.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: formattedRecord,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating temperature record",
      error: error.message,
    });
  }
});

app.put("/api/temperature-records/:id", async (req, res) => {
  try {
    const { personName, temperatureSeries } = req.body;
    const recordId = req.params.id;

    const existingRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [recordId]
    );

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    let updateFields = [];
    let updateValues = [];

    if (personName !== undefined) {
      if (!personName || !personName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Person name cannot be empty",
        });
      }
      updateFields.push("personName = ?");
      updateValues.push(personName.trim());
    }

    if (temperatureSeries !== undefined) {
      if (!Array.isArray(temperatureSeries) || temperatureSeries.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Temperature series must be a non-empty array",
        });
      }
      validateTemperatureSeries(temperatureSeries);
      const closestToZero = findClosestToZero(temperatureSeries);
      updateFields.push("temperatureSeries = ?");
      updateFields.push("closestToZero = ?");
      updateValues.push(JSON.stringify(temperatureSeries));
      updateValues.push(closestToZero);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updateFields.push("updatedAt = CURRENT_TIMESTAMP");
    updateValues.push(recordId);

    await runQuery(
      `UPDATE temperature_records SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const updatedRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [recordId]
    );

    const formattedRecord = {
      id: updatedRecord.id,
      personName: updatedRecord.personName,
      temperatureSeries: JSON.parse(updatedRecord.temperatureSeries),
      closestToZero: updatedRecord.closestToZero,
      recordedAt: updatedRecord.recordedAt,
      createdAt: updatedRecord.createdAt,
      updatedAt: updatedRecord.updatedAt,
    };

    res.json({
      success: true,
      data: formattedRecord,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating temperature record",
      error: error.message,
    });
  }
});

app.delete("/api/temperature-records/:id", async (req, res) => {
  try {
    const recordId = req.params.id;

    const deletedRecord = await runQuerySingle(
      "SELECT * FROM temperature_records WHERE id = ?",
      [recordId]
    );

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    await runQuery("DELETE FROM temperature_records WHERE id = ?", [recordId]);

    const recordWithParsedData = {
      ...deletedRecord,
      temperatureSeries: JSON.parse(deletedRecord.temperatureSeries),
    };

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

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

module.exports = { app, findClosestToZero, validateTemperatureSeries };
