const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "database", "temperature.db");

console.log("🔍 Checking database at:", dbPath);

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

        console.log(`📊 Found ${rows.length} records in database:`);
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
});
