const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "database", "temperature.db");
const exportPath = path.join(__dirname, "..", "scripts", "current_data.json");

console.log("🔍 Database path:", dbPath);
console.log("📁 Export path:", exportPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
    process.exit(1);
  }
  console.log("✅ Database opened successfully");
});

// Sample data for initial population (only used if database is empty)
const initialSampleData = [
  {
    personName: "John Doe",
    temperatureSeries: [
      7, -10, 13, -7.2, 8, -12, 4, -3.7, 3.5, -9.6, 6.5, -1.7, -6.2, 7,
    ],
  },
  {
    personName: "Jane Smith",
    temperatureSeries: [
      15, -5, 22, -3, 18, -8, 12, -2.5, 9, -4.2, 11, -1.8, 14, -6.5,
    ],
  },
  {
    personName: "Mike Johnson",
    temperatureSeries: [
      3, -15, 8, -12, 5, -9, 2, -7.8, 4, -11.2, 6, -5.4, 7, -8.9,
    ],
  },
  {
    personName: "Sarah Wilson",
    temperatureSeries: [
      20, -2, 25, -1, 18, -3, 22, -0.5, 19, -2.8, 21, -1.2, 23, -4.1,
    ],
  },
  {
    personName: "David Brown",
    temperatureSeries: [
      1, -20, 6, -18, 3, -16, 4, -14.5, 2, -17.2, 5, -13.4, 7, -15.9,
    ],
  },
];

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

// Sync current database state to export file
function syncCurrentState() {
  console.log("🔄 Syncing current database state to export file...");

  // First check if table exists
  db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='temperature_records'",
    (err, row) => {
      if (err) {
        console.error("❌ Error checking table:", err.message);
        return;
      }

      if (!row) {
        console.log("❌ Table temperature_records does not exist");
        return;
      }

      console.log("✅ Table temperature_records exists");

      // Get all records from database
      db.all("SELECT * FROM temperature_records ORDER BY id", (err, rows) => {
        if (err) {
          console.error("❌ Error reading database:", err.message);
          return;
        }

        console.log(`📊 Found ${rows.length} records in database`);

        const exportData = {
          timestamp: new Date().toISOString(),
          recordCount: rows.length,
          data: rows.map((row) => ({
            personName: row.personName,
            temperatureSeries: JSON.parse(row.temperatureSeries),
            closestToZero: row.closestToZero,
            recordedAt: row.recordedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })),
        };

        // Write to export file
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        console.log(`✅ Database state synced to: ${exportPath}`);
        console.log(`📊 Total records: ${rows.length}`);

        // List all records
        console.log("\n📋 Current records:");
        rows.forEach((record, index) => {
          const temps = JSON.parse(record.temperatureSeries);
          console.log(
            `  ${index + 1}. ${record.personName} - ${temps.length} temperatures: [${temps.join(", ")}]`
          );
        });

        process.exit(0);
      });
    }
  );
}

// Reset to initial sample data
function resetToInitial() {
  console.log("🔄 Resetting to initial sample data...");

  db.serialize(() => {
    // Clear existing data
    db.run("DELETE FROM temperature_records", (err) => {
      if (err) {
        console.error("Error clearing existing data:", err.message);
        return;
      }
      console.log("️  Cleared existing data");

      // Insert sample data
      const stmt = db.prepare(
        "INSERT INTO temperature_records (personName, temperatureSeries, closestToZero) VALUES (?, ?, ?)"
      );

      initialSampleData.forEach((record, index) => {
        const closestToZero = findClosestToZero(record.temperatureSeries);
        stmt.run(
          record.personName,
          JSON.stringify(record.temperatureSeries),
          closestToZero,
          (err) => {
            if (err) {
              console.error(
                `Error inserting record ${index + 1}:`,
                err.message
              );
            } else {
              console.log(
                `✅ Inserted record ${index + 1}: ${record.personName}`
              );
            }
          }
        );
      });

      stmt.finalize((err) => {
        if (err) {
          console.error("Error finalizing statement:", err.message);
        } else {
          console.log("🎉 Reset completed!");
          console.log(`📊 Total records: ${initialSampleData.length}`);

          // Sync the new state
          setTimeout(syncCurrentState, 100);
        }
      });
    });
  });
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "sync":
    syncCurrentState();
    break;
  case "reset":
    resetToInitial();
    break;
  default:
    console.log("Usage:");
    console.log(
      "  npm run populate:sync   - Sync current database state to export file"
    );
    console.log("  npm run populate:reset  - Reset to initial sample data");
    console.log("");
    console.log(
      'Note: Use "sync" to update the export file with current database state'
    );
    console.log('      Use "reset" to restore initial sample data');
    break;
}
