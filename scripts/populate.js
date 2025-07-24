const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "database", "temperature.db");
const exportPath = path.join(__dirname, "..", "scripts", "current_data.json");

const db = new sqlite3.Database(dbPath);

// This data will be automatically updated by the system
let currentData = [
  [
    {
      "personName": "Jane Smith",
      "temperatureSeries": [
        10,
        -5,
        2,
        3,
        8,
        -8,
        -2,
        -2.5,
        9,
        4.2,
        -1,
        1.8,
        4,
        6.5,
        -11,
        1.1
      ]
    },
    {
      "personName": "Mike Johnson",
      "temperatureSeries": [
        3,
        -5,
        -8,
        12,
        5,
        9,
        -2,
        -7.5,
        4.2,
        -11.2,
        6.5,
        5.4,
        -7,
        -8.9,
        1.2,
        5.5,
        2,
        -2.5
      ]
    },
    {
      "personName": "Sarah Wilson",
      "temperatureSeries": [
        2,
        -12,
        -5,
        -1,
        8,
        3,
        -2,
        -0.5,
        9,
        -2.8,
        2,
        1.2,
        -3,
        -4.1,
        6,
        10
      ]
    },
    {
      "personName": "David Brown",
      "temperatureSeries": [
        -1,
        -2,
        -6,
        8,
        3,
        6,
        -4,
        -7.5,
        2,
        7.2,
        -5,
        -3.4,
        7,
        5.9
      ]
    },
    {
      "personName": "Stewart Brown",
      "temperatureSeries": [
        7,
        4,
        -5,
        -3.5,
        2.2,
        3,
        7,
        -7,
        -4.3,
        -3.5,
        5,
        9,
        10
      ]
    },
    {
      "personName": "Robert Bonner",
      "temperatureSeries": [
        3,
        2,
        9,
        12,
        -2,
        -9,
        -3.3,
        2,
        3,
        -9,
        12,
        10
      ]
    }
  ]
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

// Get current data from database
function getCurrentData() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM temperature_records ORDER BY id", [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const data = rows.map((row) => ({
        personName: row.personName,
        temperatureSeries: JSON.parse(row.temperatureSeries),
      }));

      resolve(data);
    });
  });
}

// Auto-update populate.js with current database state
async function updatePopulateFile() {
  console.log("🔄 Auto-updating populate.js with current database state...");

  try {
    const dbData = await getCurrentData();

    if (dbData.length === 0) {
      console.log(" Database is empty, keeping initial data");
      return;
    }

    // Read the current populate.js file
    const populateFilePath = __filename;
    let populateContent = fs.readFileSync(populateFilePath, "utf8");

    // Create the new data array string
    const newDataString = JSON.stringify(dbData, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n");

    // Replace the currentData array in the file
    const dataStart = populateContent.indexOf("let currentData = [");
    const dataEnd = populateContent.indexOf("];", dataStart) + 2;

    if (dataStart !== -1 && dataEnd !== -1) {
      const beforeData = populateContent.substring(0, dataStart);
      const afterData = populateContent.substring(dataEnd);

      const newContent =
        beforeData +
        "let currentData = [\n" +
        newDataString +
        "\n];\n" +
        afterData;

      // Write the updated file
      fs.writeFileSync(populateFilePath, newContent);

      console.log(`✅ populate.js updated with current database state`);
      console.log(`📊 Total records: ${dbData.length}`);

      console.log("\n Current records in populate.js:");
      dbData.forEach((record, index) => {
        console.log(
          `  ${index + 1}. ${record.personName} - ${record.temperatureSeries.length} temperatures: [${record.temperatureSeries.join(", ")}]`
        );
      });

      // Also update the currentData variable in memory
      currentData = dbData;
    } else {
      console.log("❌ Could not find currentData array in populate.js");
    }
  } catch (error) {
    console.error("❌ Error updating populate.js:", error.message);
  }
}

// Export current database state
function exportCurrentData() {
  console.log("Exporting current database state...");

  db.all("SELECT * FROM temperature_records ORDER BY id", [], (err, rows) => {
    if (err) {
      console.error("Error exporting data:", err.message);
      return;
    }

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

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Current data exported to: ${exportPath}`);
    console.log(`📊 Total records: ${rows.length}`);

    // Also create a backup
    const backupPath = path.join(
      __dirname,
      "..",
      "backups",
      `export_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
    console.log(` Backup created: ${backupPath}`);
    process.exit(0);
  });
}

// Import data from export file
function importFromExport() {
  console.log("Importing data from export file...");

  if (!fs.existsSync(exportPath)) {
    console.log("❌ No export file found. Creating current data...");
    populateWithCurrentData();
    return;
  }

  try {
    const exportData = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    console.log(`📁 Found export file with ${exportData.recordCount} records`);

    db.serialize(() => {
      // Clear existing data
      db.run("DELETE FROM temperature_records", (err) => {
        if (err) {
          console.error("Error clearing existing data:", err.message);
          return;
        }
        console.log("🧹 Cleared existing data");

        // Insert exported data
        const stmt = db.prepare(
          "INSERT INTO temperature_records (personName, temperatureSeries, closestToZero, recordedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
        );

        let insertedCount = 0;
        exportData.data.forEach((record, index) => {
          stmt.run(
            record.personName,
            JSON.stringify(record.temperatureSeries),
            record.closestToZero,
            record.recordedAt,
            record.createdAt,
            record.updatedAt,
            (err) => {
              if (err) {
                console.error(
                  `Error inserting record ${index + 1}:`,
                  err.message
                );
              } else {
                insertedCount++;
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
            console.log(
              `🎉 Import completed! Inserted ${insertedCount} records`
            );
            process.exit(0);
          }
        });
      });
    });
  } catch (error) {
    console.error("❌ Error reading export file:", error.message);
    console.log("📝 Creating current data instead...");
    populateWithCurrentData();
  }
}

// Populate with current data (from the updated currentData array)
function populateWithCurrentData() {
  console.log("Creating data from current populate.js state...");

  db.serialize(() => {
    // Clear existing data
    db.run("DELETE FROM temperature_records", (err) => {
      if (err) {
        console.error("Error clearing existing data:", err.message);
        return;
      }
      console.log("🧹 Cleared existing data");

      // Insert current data
      const stmt = db.prepare(
        "INSERT INTO temperature_records (personName, temperatureSeries, closestToZero) VALUES (?, ?, ?)"
      );

      currentData.forEach((record, index) => {
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
          console.log("🎉 Current data created successfully!");
          console.log(`📊 Total records: ${currentData.length}`);
          process.exit(0);
        }
      });
    });
  });
}

// Show current data
function showCurrentData() {
  console.log("📋 Current data in populate.js:");
  currentData.forEach((record, index) => {
    console.log(
      `  ${index + 1}. ${record.personName} - ${record.temperatureSeries.length} temperatures: [${record.temperatureSeries.join(", ")}]`
    );
  });
  process.exit(0);
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "export":
    exportCurrentData();
    break;
  case "import":
    importFromExport();
    break;
  case "reset":
    populateWithCurrentData();
    break;
  case "show":
    showCurrentData();
    break;
  case "update":
    updatePopulateFile();
    break;
  default:
    console.log("Usage:");
    console.log("  npm run populate:export  - Export current database state");
    console.log("  npm run populate:import  - Import from export file");
    console.log(
      "  npm run populate:reset   - Reset to current populate.js data"
    );
    console.log(
      "  npm run populate:show    - Show current data in populate.js"
    );
    console.log(
      "  npm run populate:update  - Update populate.js with database state"
    );
    console.log("");
    console.log(
      "Note: Use 'update' to sync populate.js with current database state"
    );
    break;
}
