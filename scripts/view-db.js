const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "database", "temperature.db");

console.log("🔍 Database Viewer");
console.log("================");
console.log("Database path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
    return;
  }
  console.log("✅ Database opened successfully");

  // Check if table exists
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

      // Get all records
      db.all("SELECT * FROM temperature_records ORDER BY id", (err, rows) => {
        if (err) {
          console.error("❌ Error reading records:", err.message);
          return;
        }

        console.log(`\n📊 Database contains ${rows.length} records:`);
        console.log("=".repeat(80));

        if (rows.length === 0) {
          console.log("📭 Database is empty");
          return;
        }

        rows.forEach((record, index) => {
          const temps = JSON.parse(record.temperatureSeries);
          console.log(`\n�� Record ${index + 1}:`);
          console.log(`   ID: ${record.id}`);
          console.log(`   Person: ${record.personName}`);
          console.log(`   Temperatures: [${temps.join(", ")}]`);
          console.log(`   Closest to Zero: ${record.closestToZero}°C`);
          console.log(`   Recorded At: ${record.recordedAt}`);
          console.log(`   Created At: ${record.createdAt}`);
          console.log(`   Updated At: ${record.updatedAt}`);
          console.log("   " + "-".repeat(60));
        });

        // Summary statistics
        const totalTemps = rows.reduce(
          (sum, record) => sum + JSON.parse(record.temperatureSeries).length,
          0
        );
        const avgTempsPerRecord = totalTemps / rows.length;

        console.log("\n📈 Summary:");
        console.log(`   Total Records: ${rows.length}`);
        console.log(`   Total Temperatures: ${totalTemps}`);
        console.log(
          `   Average Temperatures per Record: ${avgTempsPerRecord.toFixed(1)}`
        );

        process.exit(0);
      });
    }
  );
});
