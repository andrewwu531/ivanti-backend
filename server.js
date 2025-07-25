// server.js - Start the server
const { app } = require("./app");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const dbPath = path.join(__dirname, "database", "temperature.db");
const backupDir = path.join(__dirname, "backups");

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SQLite database: ${dbPath}`);
  console.log(`Backup directory: ${backupDir}`);
});
